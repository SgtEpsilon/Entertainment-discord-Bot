// modules/youtube.js
const axios = require('axios');

class YouTubeMonitor {
  constructor(client, config) {
    this.client = client;
    this.config = config;
    this.lastVideoIds = new Map(); // Map of guildId -> Map of channelId -> videoId
  }

  async checkVideos() {
    // Check videos for each guild
    for (const [guildId, guildConfig] of Object.entries(this.config.guilds)) {
      if (!guildConfig.channelId || !guildConfig.youtube.channelIds.length) {
        continue;
      }

      // Initialize last video IDs map for this guild if it doesn't exist
      if (!this.lastVideoIds.has(guildId)) {
        this.lastVideoIds.set(guildId, new Map());
      }

      const guildLastVideoIds = this.lastVideoIds.get(guildId);

      for (const channelId of guildConfig.youtube.channelIds) {
        try {
          const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
            params: {
              part: 'snippet',
              channelId: channelId,
              order: 'date',
              maxResults: 1,
              type: 'video',
              key: process.env.YOUTUBE_API_KEY
            }
          });

          if (response.data.items && response.data.items.length > 0) {
            const latestVideo = response.data.items[0];
            const videoId = latestVideo.id.videoId;
            const lastKnownId = guildLastVideoIds.get(channelId);

            if (!lastKnownId) {
              // First time checking, just store the ID
              guildLastVideoIds.set(channelId, videoId);
            } else if (videoId !== lastKnownId) {
              // New video detected
              guildLastVideoIds.set(channelId, videoId);
              await this.sendNotification(latestVideo, guildId, guildConfig);
            }
          }
        } catch (error) {
          console.error(`Error checking YouTube videos for channel ${channelId}:`, error.message);
        }
      }
    }
  }

  async sendNotification(video, guildId, guildConfig) {
    try {
      const channel = await this.client.channels.fetch(guildConfig.channelId);
      if (!channel) {
        console.error(`Discord channel not found for guild ${guildId}`);
        return;
      }

      const message = guildConfig.youtube.message
        .replace('{channel}', video.snippet.channelTitle)
        .replace('{title}', video.snippet.title);

      const videoUrl = `https://www.youtube.com/watch?v=${video.id.videoId}`;
      
      await channel.send(`${message}\n${videoUrl}`);
      console.log(`Sent YouTube notification for ${video.snippet.title} to guild ${guildId}`);
    } catch (error) {
      console.error(`Error sending notification to guild ${guildId}:`, error.message);
    }
  }

  async checkSpecificChannels(channelIds) {
    const latestVideos = [];

    for (const channelId of channelIds) {
      try {
        const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
          params: {
            part: 'snippet',
            channelId: channelId,
            order: 'date',
            maxResults: 1,
            type: 'video',
            key: process.env.YOUTUBE_API_KEY
          }
        });

        if (response.data.items && response.data.items.length > 0) {
          latestVideos.push(response.data.items[0]);
        }
      } catch (error) {
        console.error(`Error checking YouTube videos for channel ${channelId}:`, error.message);
      }
    }

    return latestVideos;
  }

  start() {
    console.log('Starting YouTube monitor...');
    this.checkVideos(); // Check immediately
    this.interval = setInterval(() => this.checkVideos(), 300000); // Check every 5 minutes
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}

module.exports = YouTubeMonitor;