// modules/youtube.js
const axios = require('axios');

class YouTubeMonitor {
  constructor(client, config) {
    this.client = client;
    this.config = config;
    this.lastVideoIds = new Map();
    this.checkInterval = config.youtube.checkInterval || 300000; // Default 5 minutes
  }

  async getChannelId(username) {
    try {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: {
          part: 'id',
          forUsername: username,
          key: process.env.YOUTUBE_API_KEY
        }
      });

      if (response.data.items && response.data.items.length > 0) {
        return response.data.items[0].id;
      }
      return null;
    } catch (error) {
      console.error(`Error getting YouTube channel ID for ${username}:`, error.message);
      return null;
    }
  }

  async checkVideos() {
    for (const channelId of this.config.youtube.channelIds) {
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
          const lastKnownId = this.lastVideoIds.get(channelId);

          if (!lastKnownId) {
            // First time checking, just store the ID
            this.lastVideoIds.set(channelId, videoId);
          } else if (videoId !== lastKnownId) {
            // New video detected
            this.lastVideoIds.set(channelId, videoId);
            await this.sendNotification(latestVideo);
          }
        }
      } catch (error) {
        console.error(`Error checking YouTube videos for channel ${channelId}:`, error.message);
      }
    }
  }

  async sendNotification(video) {
    const channel = await this.client.channels.fetch(this.config.discord.channelId);
    if (!channel) {
      console.error('Discord channel not found');
      return;
    }

    const message = this.config.youtube.message
      .replace('{channel}', video.snippet.channelTitle)
      .replace('{title}', video.snippet.title);

    const videoUrl = `https://www.youtube.com/watch?v=${video.id.videoId}`;
    
    await channel.send(`${message}\n${videoUrl}`);
    console.log(`Sent YouTube notification for ${video.snippet.title}`);
  }

  start() {
    console.log('Starting YouTube monitor...');
    this.checkVideos(); // Check immediately
    this.interval = setInterval(() => this.checkVideos(), this.checkInterval);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}

module.exports = YouTubeMonitor;