// modules/twitch.js
const axios = require('axios');

class TwitchMonitor {
  constructor(client, config) {
    this.client = client;
    this.config = config;
    this.accessToken = null;
    this.liveStreams = new Set();
    this.checkInterval = config.twitch.checkInterval || 60000; // Default 1 minute
  }

  async getAccessToken() {
    try {
      const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
        params: {
          client_id: process.env.TWITCH_CLIENT_ID,
          client_secret: process.env.TWITCH_CLIENT_SECRET,
          grant_type: 'client_credentials'
        }
      });
      this.accessToken = response.data.access_token;
      console.log('Twitch access token obtained');
    } catch (error) {
      console.error('Error getting Twitch access token:', error.message);
    }
  }

  async checkStreams() {
    if (!this.accessToken) {
      await this.getAccessToken();
    }

    for (const username of this.config.twitch.usernames) {
      try {
        const response = await axios.get('https://api.twitch.tv/helix/streams', {
          headers: {
            'Client-ID': process.env.TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${this.accessToken}`
          },
          params: {
            user_login: username
          }
        });

        const stream = response.data.data[0];
        const streamKey = username;

        if (stream && !this.liveStreams.has(streamKey)) {
          // Stream just went live
          this.liveStreams.add(streamKey);
          await this.sendNotification(stream);
        } else if (!stream && this.liveStreams.has(streamKey)) {
          // Stream went offline
          this.liveStreams.delete(streamKey);
        }
      } catch (error) {
        if (error.response?.status === 401) {
          // Token expired, get new one
          await this.getAccessToken();
        } else {
          console.error(`Error checking Twitch stream for ${username}:`, error.message);
        }
      }
    }
  }

  async sendNotification(stream) {
    const channel = await this.client.channels.fetch(this.config.discord.channelId);
    if (!channel) {
      console.error('Discord channel not found');
      return;
    }

    const message = this.config.twitch.message
      .replace('{username}', stream.user_name)
      .replace('{title}', stream.title)
      .replace('{game}', stream.game_name);

    const streamUrl = `https://twitch.tv/${stream.user_login}`;
    
    await channel.send(`${message}\n${streamUrl}`);
    console.log(`Sent Twitch notification for ${stream.user_name}`);
  }

  start() {
    console.log('Starting Twitch monitor...');
    this.checkStreams(); // Check immediately
    this.interval = setInterval(() => this.checkStreams(), this.checkInterval);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}

module.exports = TwitchMonitor;