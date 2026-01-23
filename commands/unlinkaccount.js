const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig, saveConfig } = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlinkaccount')
    .setDescription('Unlink a user\'s Twitch account (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client, config) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return await interaction.reply({
        content: '❌ This command is only available to administrators.',
        ephemeral: true
      });
    }

    const guildConfig = getGuildConfig(interaction.guild.id);

    if (!guildConfig.twitch) {
      guildConfig.twitch = {};
    }

    if (!guildConfig.twitch.linkedAccounts) {
      guildConfig.twitch.linkedAccounts = {};
    }

    const options = [];

    for (const [discordId, twitchUsername] of Object.entries(guildConfig.twitch.linkedAccounts)) {
      try {
        const user = await client.users.fetch(discordId);
        options.push({
          label: `${user.tag}`,
          description: `Twitch: ${twitchUsername}`,
          value: discordId,
          emoji: '🔗'
        });
      } catch (error) {
        options.push({
          label: `Unknown User`,
          description: `Twitch: ${twitchUsername}`,
          value: discordId,
          emoji: '❓'
        });
      }
    }

    if (options.length === 0) {
      return await interaction.reply({
        content: '❌ No linked accounts to unlink.',
        ephemeral: true
      });
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('unlink_select')
      .setPlaceholder('Select an account to unlink')
      .addOptions(options.slice(0, 25));

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const response = await interaction.reply({
      content: '🔓 Select which account to unlink:',
      components: [row],
      ephemeral: true,
      fetchReply: true
    });

    const collector = response.createMessageComponentCollector({
      componentType: 3, // StringSelect
      time: 60000
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        return await i.reply({
          content: '❌ This menu is not for you!',
          ephemeral: true
        });
      }

      const selectedId = i.values[0];
      const linkedUsername = guildConfig.twitch.linkedAccounts[selectedId];

      if (!linkedUsername) {
        return await i.update({
          content: '❌ This account is no longer linked.',
          components: []
        });
      }

      let userTag = 'Unknown User';
      try {
        const user = await client.users.fetch(selectedId);
        userTag = user.tag;
      } catch (error) {}

      delete guildConfig.twitch.linkedAccounts[selectedId];
      saveConfig();

      await i.update({
        content: `✅ Successfully unlinked **${userTag}**'s Twitch account (**${linkedUsername}**)`,
        components: []
      });

      console.log(`🔓 Admin ${interaction.user.tag} unlinked ${userTag} (${selectedId}) from Twitch account: ${linkedUsername}`);

      collector.stop();
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