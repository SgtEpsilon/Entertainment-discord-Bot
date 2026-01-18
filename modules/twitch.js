// modules/twitch.js
const axios = require('axios');

class TwitchMonitor {
  constructor(client, config) {
    this.client = client;
    this.config = config;
    this.accessToken = null;
    this.liveStreamers = new Map(); // Map of guildId -> Set of live streamers
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
      return this.accessToken;
    } catch (error) {
      console.error('Error getting Twitch access token:', error.message);
      return null;
    }
  }

  async checkStreams() {
    if (!this.accessToken) {
      await this.getAccessToken();
      if (!this.accessToken) return;
    }

    // Check streams for each guild
    for (const [guildId, guildConfig] of Object.entries(this.config.guilds)) {
      if (!guildConfig.channelId || !guildConfig.twitch.usernames.length) {
        continue;
      }

      // Initialize live streamers set for this guild if it doesn't exist
      if (!this.liveStreamers.has(guildId)) {
        this.liveStreamers.set(guildId, new Set());
      }

      const liveSet = this.liveStreamers.get(guildId);

      for (const username of guildConfig.twitch.usernames) {
        try {
          const response = await axios.get('https://api.twitch.tv/helix/streams', {
            params: { user_login: username },
            headers: {
              'Client-ID': process.env.TWITCH_CLIENT_ID,
              'Authorization': `Bearer ${this.accessToken}`
            }
          });

          const stream = response.data.data[0];

          if (stream && stream.type === 'live') {
            // Streamer is live
            if (!liveSet.has(username)) {
              // New stream detected
              liveSet.add(username);
              await this.sendNotification(stream, guildId, guildConfig);
            }
          } else {
            // Streamer is offline
            liveSet.delete(username);
          }
        } catch (error) {
          if (error.response?.status === 401) {
            // Token expired, get a new one
            console.log('Twitch token expired, refreshing...');
            await this.getAccessToken();
          } else {
            console.error(`Error checking Twitch stream for ${username}:`, error.message);
          }
        }
      }
    }
  }

  async sendNotification(stream, guildId, guildConfig) {
    try {
      const channel = await this.client.channels.fetch(guildConfig.channelId);
      if (!channel) {
        console.error(`Discord channel not found for guild ${guildId}`);
        return;
      }

      const username = stream.user_login;
      
      // Check if there's a custom message for this streamer
      let messageTemplate = guildConfig.twitch.message; // Default message
      
      if (guildConfig.twitch.customMessages && guildConfig.twitch.customMessages[username]) {
        messageTemplate = guildConfig.twitch.customMessages[username];
      }

      // Replace placeholders
      const message = messageTemplate
        .replace(/{username}/g, stream.user_name)
        .replace(/{title}/g, stream.title)
        .replace(/{game}/g, stream.game_name || 'Unknown')
        .replace(/{url}/g, `https://twitch.tv/${stream.user_login}`);

      await channel.send(message);
      console.log(`Sent Twitch notification for ${stream.user_name} to guild ${guildId}${guildConfig.twitch.customMessages?.[username] ? ' (custom message)' : ''}`);
    } catch (error) {
      console.error(`Error sending notification to guild ${guildId}:`, error.message);
    }
  }

  async checkSpecificStreamers(usernames) {
    if (!this.accessToken) {
      await this.getAccessToken();
      if (!this.accessToken) return [];
    }

    const liveStreams = [];

    for (const username of usernames) {
      try {
        const response = await axios.get('https://api.twitch.tv/helix/streams', {
          params: { user_login: username },
          headers: {
            'Client-ID': process.env.TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${this.accessToken}`
          }
        });

        const stream = response.data.data[0];
        if (stream && stream.type === 'live') {
          liveStreams.push(stream);
        }
      } catch (error) {
        console.error(`Error checking Twitch stream for ${username}:`, error.message);
      }
    }

    return liveStreams;
  }

  start() {
    console.log('Starting Twitch monitor...');
    this.getAccessToken();
    this.checkStreams(); // Check immediately
    this.interval = setInterval(() => this.checkStreams(), 60000); // Check every minute
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}

module.exports = TwitchMonitor;