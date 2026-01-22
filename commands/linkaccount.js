// commands/linkaccount.js
const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { getGuildConfig, saveConfig } = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('linkaccount')
    .setDescription('Link your Discord account to your Twitch username'),

  async execute(interaction, client, config) {
    const guildConfig = getGuildConfig(interaction.guild.id);

    // Initialize linkedAccounts if it doesn't exist
    if (!guildConfig.twitch) {
      guildConfig.twitch = {};
    }
    if (!guildConfig.twitch.linkedAccounts) {
      guildConfig.twitch.linkedAccounts = {};
    }

    const existingLink = guildConfig.twitch.linkedAccounts[interaction.user.id];

    // Create modal for Twitch username input
    const modal = new ModalBuilder()
      .setCustomId('twitch_link_modal')
      .setTitle('Link Your Twitch Account');

    const twitchInput = new TextInputBuilder()
      .setCustomId('twitch_username')
      .setLabel('Your Twitch Username')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Enter your Twitch username')
      .setRequired(true)
      .setMaxLength(25);

    // Pre-fill with existing link if available
    if (existingLink) {
      twitchInput.setValue(existingLink);
    }

    const actionRow = new ActionRowBuilder().addComponents(twitchInput);
    modal.addComponents(actionRow);

    await interaction.showModal(modal);

    // Wait for modal submission
    try {
      const modalSubmit = await interaction.awaitModalSubmit({
        filter: (submitInteraction) => 
          submitInteraction.customId === 'twitch_link_modal' && 
          submitInteraction.user.id === interaction.user.id,
        time: 120000 // 2 minutes
      });

      const twitchUsername = modalSubmit.fields.getTextInputValue('twitch_username').trim();

      // Save the link
      guildConfig.twitch.linkedAccounts[interaction.user.id] = twitchUsername;
      saveConfig();

      if (existingLink) {
        await modalSubmit.reply({
          content: `✅ Updated your linked Twitch account from **${existingLink}** to **${twitchUsername}**\n\n💡 The live role will now be automatically assigned when you stream on Twitch!`,
          ephemeral: true
        });
        console.log(`🔗 ${interaction.user.tag} (${interaction.user.id}) updated their Twitch link from ${existingLink} to ${twitchUsername}`);
      } else {
        await modalSubmit.reply({
          content: `✅ Successfully linked your account to Twitch username **${twitchUsername}**\n\n💡 You'll now receive the live role automatically when you stream on Twitch!`,
          ephemeral: true
        });
        console.log(`🔗 ${interaction.user.tag} (${interaction.user.id}) linked to Twitch account: ${twitchUsername}`);
      }
    } catch (error) {
      // Modal timeout - no response needed as the modal just closes
      if (error.code !== 'InteractionCollectorError') {
        console.error('Modal submission error:', error);
      }
    }
  }
};