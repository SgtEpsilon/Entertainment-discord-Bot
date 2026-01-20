// commands/unlinkaccount.js
const { SlashCommandBuilder, PermissionFlagsBits, StringSelectMenuBuilder, ActionRowBuilder, ComponentType } = require('discord.js');
const { getGuildConfig, saveConfig } = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlinkaccount')
    .setDescription('Unlink your Twitch account or remove another user\'s link (Admin)'),

  async execute(interaction, client, config) {
    const guildConfig = getGuildConfig(interaction.guild.id);
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    // Initialize guildConfig.twitch if it doesn't exist
    if (!guildConfig.twitch) {
      guildConfig.twitch = {};
    }

    // Initialize linkedAccounts if it doesn't exist
    if (!guildConfig.twitch.linkedAccounts) {
      guildConfig.twitch.linkedAccounts = {};
    }

    // Check if user has their own link
    const userLinked = guildConfig.twitch.linkedAccounts[interaction.user.id];

    // Build options for dropdown
    const options = [];

    // Add self-unlink option if user has a link
    if (userLinked) {
      options.push({
        label: `Unlink Yourself (${userLinked})`,
        description: 'Remove your own Twitch account link',
        value: `self_${interaction.user.id}`,
        emoji: '👤'
      });
    }

    // Add other users if admin
    if (isAdmin) {
      for (const [discordId, twitchUsername] of Object.entries(guildConfig.twitch.linkedAccounts)) {
        if (discordId !== interaction.user.id) {
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
      }
    }

    // Check if there are any options
    if (options.length === 0) {
      return await interaction.reply({
        content: '❌ No linked accounts to unlink.' + (!isAdmin ? '\n\n*You don\'t have a linked account.*' : ''),
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

      const selectedId = i.values[0].replace('self_', '');
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

      const isSelf = selectedId === interaction.user.id;

      await i.update({
        content: `✅ Successfully unlinked ${isSelf ? 'your' : `**${userTag}**'s`} Twitch account (**${linkedUsername}**)`,
        components: []
      });

      console.log(`🔓 ${isSelf ? 'User' : `Admin ${interaction.user.tag} unlinked`} ${userTag} (${selectedId}) from Twitch account: ${linkedUsername}`);

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