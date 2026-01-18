// modules/youtube.js - RSS Feed Version (No API Quota!)
const axios = require('axios');
const { parseString } = require('xml2js');
const util = require('util');

const parseXML = util.promisify(parseString);

class YouTubeMonitor {
  constructor(client, config) {
    this.client = client;
    this.config = config;
    this.lastVideoIds = new Map(); // Map of guildId -> Map of channelId -> videoId
    
    console.log('YouTube Monitor initialized (using RSS feeds - no quota limits!)');
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
          console.log(`Checking YouTube channel: ${channelId} for guild: ${guildId}`);
          
          // Use YouTube RSS feed instead of API
          const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
          const response = await axios.get(rssUrl);

          // Parse XML response
          const result = await parseXML(response.data);
          
          if (result.feed && result.feed.entry && result.feed.entry.length > 0) {
            const latestVideo = result.feed.entry[0];
            
            // Extract video information from RSS feed
            const videoId = latestVideo['yt:videoId'][0];
            const title = latestVideo.title[0];
            const channelTitle = latestVideo.author[0].name[0];
            const publishedAt = latestVideo.published[0];
            
            const lastKnownId = guildLastVideoIds.get(channelId);

            console.log(`Latest video found: ${title} (ID: ${videoId})`);

            if (!lastKnownId) {
              // First time checking, just store the ID
              guildLastVideoIds.set(channelId, videoId);
              console.log(`Initialized tracking for channel ${channelId}`);
            } else if (videoId !== lastKnownId) {
              // New video detected
              guildLastVideoIds.set(channelId, videoId);
              console.log(`New video detected! Sending notification...`);
              
              const videoData = {
                id: { videoId },
                snippet: {
                  title,
                  channelTitle,
                  publishedAt
                }
              };
              
              await this.sendNotification(videoData, guildId, guildConfig);
            } else {
              console.log(`No new video for channel ${channelId}`);
            }
          } else {
            console.log(`No videos found for channel ${channelId}`);
          }
        } catch (error) {
          console.error(`Error checking YouTube videos for channel ${channelId}:`);
          console.error(`Message: ${error.message}`);
          
          if (error.response) {
            console.error(`Status: ${error.response.status}`);
          }
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
      console.log(`✅ Sent YouTube notification for "${video.snippet.title}" to guild ${guildId}`);
    } catch (error) {
      console.error(`Error sending notification to guild ${guildId}:`, error.message);
    }
  }

  async checkSpecificChannels(channelIds) {
    const latestVideos = [];

    for (const channelId of channelIds) {
      try {
        console.log(`Manual check for YouTube channel: ${channelId}`);
        
        // Use RSS feed
        const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
        const response = await axios.get(rssUrl);
        const result = await parseXML(response.data);

        if (result.feed && result.feed.entry && result.feed.entry.length > 0) {
          const latestVideo = result.feed.entry[0];
          
          const videoData = {
            id: { videoId: latestVideo['yt:videoId'][0] },
            snippet: {
              title: latestVideo.title[0],
              channelTitle: latestVideo.author[0].name[0],
              publishedAt: latestVideo.published[0]
            }
          };
          
          latestVideos.push(videoData);
          console.log(`Found video: ${videoData.snippet.title}`);
        } else {
          console.log(`No videos found for channel ${channelId}`);
        }
      } catch (error) {
        console.error(`Error checking YouTube videos for channel ${channelId}:`, error.message);
      }
    }

    return latestVideos;
  }

  start() {
    console.log('Starting YouTube monitor...');
    console.log('✅ Using RSS feeds (no API quota limits!)');
    
    this.checkVideos(); // Check immediately
    this.interval = setInterval(() => this.checkVideos(), 300000); // Check every 5 minutes
    console.log('✅ YouTube monitor started (checking every 5 minutes)');
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      console.log('YouTube monitor stopped');
    }
  }
}

module.exports = YouTubeMonitor;