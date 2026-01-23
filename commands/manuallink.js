const { SlashCommandBuilder, UserSelectMenuBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig, saveConfig } = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('manuallink')
    .setDescription('Manually link a user\'s Discord account to their Twitch username (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client, config) {
    const selectMenu = new UserSelectMenuBuilder()
      .setCustomId('user_select')
      .setPlaceholder('Select a user to link')
      .setMinValues(1)
      .setMaxValues(1);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const response = await interaction.reply({
      content: '👥 Select the user you want to link to a Twitch account:',
      components: [row],
      ephemeral: true,
      fetchReply: true
    });

    const collector = response.createMessageComponentCollector({
      componentType: 5, // UserSelect
      time: 60000
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        return await i.reply({
          content: '❌ This menu is not for you!',
          ephemeral: true
        });
      }

      const selectedUser = i.users.first();
      const guildConfig = getGuildConfig(interaction.guild.id);

      if (!guildConfig.twitch) {
        guildConfig.twitch = {};
      }

      if (!guildConfig.twitch.linkedAccounts) {
        guildConfig.twitch.linkedAccounts = {};
      }

      const existingLink = guildConfig.twitch.linkedAccounts[selectedUser.id];

      const modal = new ModalBuilder()
        .setCustomId(`twitch_modal_${selectedUser.id}`)
        .setTitle(`Link ${selectedUser.tag} to Twitch`);

      const twitchInput = new TextInputBuilder()
        .setCustomId('twitch_username')
        .setLabel('Twitch Username')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter Twitch username')
        .setRequired(true)
        .setMaxLength(25);

      if (existingLink) {
        twitchInput.setValue(existingLink);
      }

      const actionRow = new ActionRowBuilder().addComponents(twitchInput);
      modal.addComponents(actionRow);

      await i.showModal(modal);

      try {
        const modalSubmit = await i.awaitModalSubmit({
          filter: (submitInteraction) => 
            submitInteraction.customId === `twitch_modal_${selectedUser.id}` && 
            submitInteraction.user.id === interaction.user.id,
          time: 120000
        });

        const twitchUsername = modalSubmit.fields.getTextInputValue('twitch_username').trim();

        guildConfig.twitch.linkedAccounts[selectedUser.id] = twitchUsername;
        saveConfig();

        if (existingLink) {
          await modalSubmit.reply({
            content: `✅ Updated **${selectedUser.tag}**'s linked Twitch account from **${existingLink}** to **${twitchUsername}**`,
            ephemeral: true
          });
        } else {
          await modalSubmit.reply({
            content: `✅ Successfully linked **${selectedUser.tag}** to Twitch username **${twitchUsername}**`,
            ephemeral: true
          });
        }

        console.log(`🔗 Admin ${interaction.user.tag} linked ${selectedUser.tag} (${selectedUser.id}) to Twitch account: ${twitchUsername}`);

        await interaction.editReply({
          content: `✅ Link created for **${selectedUser.tag}**`,
          components: []
        });

        collector.stop();
      } catch (error) {
        console.error('Modal submission error:', error);
      }
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        interaction.editReply({
          content: '⏱️ Selection timed out.',
          components: []
        }).catch(() => {});
      }
    });
  }
};