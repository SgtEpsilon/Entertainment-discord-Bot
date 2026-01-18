// commands/nudgeyt.js
const { getGuildConfig } = require('../utils/config');

module.exports = {
  data: {
    name: 'nudgeyt',
    description: 'Check and post latest YouTube videos'
  },
  
  async execute(interaction, client, config, monitors) {
    const guildConfig = getGuildConfig(interaction.guildId);
    
    await interaction.deferReply();
    
    if (!guildConfig.channelId) {
      return interaction.editReply('❌ Please set up a notification channel first using `/setup`!');
    }
    
    if (guildConfig.youtube.channelIds.length === 0) {
      return interaction.editReply('❌ No YouTube channels configured to check!');
    }

    const latestVideos = await monitors.youtubeMonitor.checkSpecificChannels(guildConfig.youtube.channelIds);
    
    if (latestVideos.length === 0) {
      return interaction.editReply('📴 No recent videos found for monitored channels.');
    }

    // Post to the designated channel
    try {
      const notificationChannel = await client.channels.fetch(guildConfig.channelId);
      
      for (const video of latestVideos) {
        const message = guildConfig.youtube.message
          .replace('{channel}', video.snippet.channelTitle)
          .replace('{title}', video.snippet.title);

        const videoUrl = `https://www.youtube.com/watch?v=${video.id.videoId}`;
        await notificationChannel.send(`${message}\n${videoUrl}`);
      }

      await interaction.editReply(`✅ Posted ${latestVideos.length} video(s) to ${notificationChannel}!`);
    } catch (error) {
      console.error('Error posting to channel:', error);
      await interaction.editReply('❌ Error posting to the notification channel!');
    }
  }
};