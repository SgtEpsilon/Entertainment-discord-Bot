// modules/twitch.js
const axios = require('axios');

class TwitchMonitor {
  constructor(client, config) {
    this.client = client;
    this.config = config;
    this.accessToken = null;
    this.liveStreams = new Map(); // Map of guildId -> Set of live streamers
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

    // Check streams for each guild
    for (const [guildId, guildConfig] of Object.entries(this.config.guilds)) {
      if (!guildConfig.channelId || !guildConfig.twitch.usernames.length) {
        continue;
      }

      // Initialize live streams set for this guild if it doesn't exist
      if (!this.liveStreams.has(guildId)) {
        this.liveStreams.set(guildId, new Set());
      }

      const guildLiveStreams = this.liveStreams.get(guildId);

      for (const username of guildConfig.twitch.usernames) {
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

          if (stream && !guildLiveStreams.has(streamKey)) {
            // Stream just went live
            guildLiveStreams.add(streamKey);
            await this.sendNotification(stream, guildId, guildConfig);
          } else if (!stream && guildLiveStreams.has(streamKey)) {
            // Stream went offline
            guildLiveStreams.delete(streamKey);
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
  }

  async sendNotification(stream, guildId, guildConfig) {
    try {
      const channel = await this.client.channels.fetch(guildConfig.channelId);
      if (!channel) {
        console.error(`Discord channel not found for guild ${guildId}`);
        return;
      }

      const message = guildConfig.twitch.message
        .replace('{username}', stream.user_name)
        .replace('{title}', stream.title)
        .replace('{game}', stream.game_name);

      const streamUrl = `https://twitch.tv/${stream.user_login}`;
      
      await channel.send(`${message}\n${streamUrl}`);
      console.log(`Sent Twitch notification for ${stream.user_name} to guild ${guildId}`);
    } catch (error) {
      console.error(`Error sending notification to guild ${guildId}:`, error.message);
    }
  }

  async checkSpecificStreams(usernames) {
    if (!this.accessToken) {
      await this.getAccessToken();
    }

    const liveStreams = [];

    for (const username of usernames) {
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
        if (stream) {
          liveStreams.push(stream);
        }
      } catch (error) {
        if (error.response?.status === 401) {
          await this.getAccessToken();
        } else {
          console.error(`Error checking stream for ${username}:`, error.message);
        }
      }
    }

    return liveStreams;
  }

  start() {
    console.log('Starting Twitch monitor...');
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