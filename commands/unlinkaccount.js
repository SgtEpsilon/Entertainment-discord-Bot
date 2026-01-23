// commands/unlinkaccount.js
const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, ComponentType } = require('@discordjs/builders');
const { Permissions } = require('discord.js');
const { getGuildConfig, saveConfig } = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlinkaccount')
    .setDescription('Unlink a user\'s Twitch account (Admin only)')
    .setDefaultMemberPermissions(Permissions.FLAGS.ADMINISTRATOR),

  async execute(interaction, client, config) {
    // Check if user is admin
    if (!interaction.memberPermissions?.has(Permissions.FLAGS.ADMINISTRATOR)) {
      return await interaction.reply({
        content: '❌ This command is only available to administrators.',
        ephemeral: true
      });
    }

    const guildConfig = getGuildConfig(interaction.guild.id);

    // Initialize guildConfig.twitch if it doesn't exist
    if (!guildConfig.twitch) {
      guildConfig.twitch = {};
    }

    // Initialize linkedAccounts if it doesn't exist
    if (!guildConfig.twitch.linkedAccounts) {
      guildConfig.twitch.linkedAccounts = {};
    }

    // Build options for dropdown
    const options = [];

    // Add all linked accounts
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
        // User not found
        options.push({
          label: `Unknown User`,
          description: `Twitch: ${twitchUsername}`,
          value: discordId,
          emoji: '❓'
        });
      }
    }

    // Check if there are any options
    if (options.length === 0) {
      return await interaction.reply({
        content: '❌ No linked accounts to unlink.',
        ephemeral: true
      });
    }

    // Create dropdown menu
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('unlink_select')
      .setPlaceholder('Select an account to unlink')
      .addOptions(options.slice(0, 25)); // Discord limit of 25 options

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const response = await interaction.reply({
      content: '🔓 Select which account to unlink:',
      components: [row],
      ephemeral: true
    });

    // Collector for dropdown selection
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60000 // 60 seconds
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

      // Get user info
      let userTag = 'Unknown User';
      try {
        const user = await client.users.fetch(selectedId);
        userTag = user.tag;
      } catch (error) {
        // User not found
      }

      // Remove the link
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