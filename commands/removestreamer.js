// commands/removestreamer.js
const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig, saveConfig } = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removestreamer')
    .setDescription('Remove a Twitch streamer from the monitoring list')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client, config) {
    const guildConfig = getGuildConfig(interaction.guildId);

    if (guildConfig.twitch.usernames.length === 0) {
      return interaction.reply('📋 No streamers are currently being monitored.');
    }

    const options = guildConfig.twitch.usernames.slice(0, 25).map(username => {
      const hasCustomMessage = guildConfig.twitch.customMessages?.[username];
      const hasChannel = guildConfig.twitch.streamerChannels?.[username];
      const parts = [];
      if (hasCustomMessage) parts.push('Custom notification');
      if (hasChannel) parts.push(`→ <#${hasChannel}>`);
      return {
        label: username,
        description: parts.length ? parts.join(' • ') : 'Using default notification & fallback channel',
        value: username,
        emoji: '🎮'
      };
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('remove-streamer-select')
      .setPlaceholder('Select a streamer to remove')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const response = await interaction.reply({
      content: '🗑️ **Select a Twitch streamer to remove:**',
      components: [row],
      fetchReply: true
    });

    try {
      const collector = response.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 60000
      });

      collector.on('collect', async i => {
        const username = i.values[0];
        const index = guildConfig.twitch.usernames.indexOf(username);

        if (index !== -1) {
          guildConfig.twitch.usernames.splice(index, 1);
          if (guildConfig.twitch.customMessages?.[username]) delete guildConfig.twitch.customMessages[username];
          if (guildConfig.twitch.streamerChannels?.[username]) delete guildConfig.twitch.streamerChannels[username];

          if (saveConfig()) {
            await i.update({
              content: `✅ Removed **${username}** from the monitoring list!\nRemaining streamers: ${guildConfig.twitch.usernames.length}`,
              components: []
            });
            console.log(`Guild ${interaction.guildId} removed ${username} from Twitch monitoring`);
          } else {
            await i.update({ content: '❌ Error saving configuration. Please try again.', components: [] });
          }
        }
        collector.stop();
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time') {
          interaction.editReply({ content: '⏱️ Selection timed out.', components: [] }).catch(console.error);
        }
      });
    } catch (error) {
      console.error('Error handling streamer removal:', error);
    }
  }
};
