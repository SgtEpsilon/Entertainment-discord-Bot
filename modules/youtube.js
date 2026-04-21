// modules/youtube.js - RSS Feed Version (No API Quota!)
const axios = require('axios');
const { parseString } = require('xml2js');
const util = require('util');
const { resolveYouTubeChannel } = require('../utils/config');

const parseXML = util.promisify(parseString);

class YouTubeMonitor {
  constructor(client, config) {
    this.client = client;
    this.config = config;
    this.lastVideoIds = new Map(); // guildId -> Map<ytChannelId, videoId>
    console.log('YouTube Monitor initialized (using RSS feeds - no quota limits!)');
  }

  async checkVideos() {
    for (const [guildId, guildConfig] of Object.entries(this.config.guilds)) {
      if (!guildConfig.youtube.channelIds.length) continue;

      if (!this.lastVideoIds.has(guildId)) this.lastVideoIds.set(guildId, new Map());
      const guildLastVideoIds = this.lastVideoIds.get(guildId);

      for (const channelId of guildConfig.youtube.channelIds) {
        // Resolve per-channel notification destination
        const notifChannelId = resolveYouTubeChannel(guildConfig, channelId);
        if (!notifChannelId) {
          console.warn(`No notification channel for YouTube channel ${channelId} in guild ${guildId}, skipping`);
          continue;
        }

        try {
          const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
          const response = await axios.get(rssUrl);
          const result = await parseXML(response.data);

          if (result.feed?.entry?.length > 0) {
            const latestVideo = result.feed.entry[0];
            const videoId      = latestVideo['yt:videoId'][0];
            const title        = latestVideo.title[0];
            const channelTitle = latestVideo.author[0].name[0];
            const publishedAt  = latestVideo.published[0];
            const lastKnownId  = guildLastVideoIds.get(channelId);

            if (!lastKnownId) {
              guildLastVideoIds.set(channelId, videoId);
              console.log(`Initialized tracking for YT channel ${channelId}`);
            } else if (videoId !== lastKnownId) {
              guildLastVideoIds.set(channelId, videoId);
              await this.sendNotification(
                { id: { videoId }, snippet: { title, channelTitle, publishedAt } },
                guildId, guildConfig, notifChannelId
              );
            }
          }
        } catch (error) {
          console.error(`Error checking YouTube channel ${channelId}:`, error.message);
          if (error.response) console.error(`Status: ${error.response.status}`);
        }
      }
    }
  }

  async sendNotification(video, guildId, guildConfig, notifChannelId) {
    try {
      const channel = await this.client.channels.fetch(notifChannelId);
      if (!channel) { console.error(`Discord channel ${notifChannelId} not found`); return; }

      const message = guildConfig.youtube.message
        .replace('{channel}', video.snippet.channelTitle)
        .replace('{title}', video.snippet.title);

      const videoUrl = `https://www.youtube.com/watch?v=${video.id.videoId}`;
      await channel.send(`${message}\n${videoUrl}`);
      console.log(`✅ Sent YouTube notification for "${video.snippet.title}" to channel ${notifChannelId} in guild ${guildId}`);
    } catch (error) {
      console.error(`Error sending YouTube notification:`, error.message);
    }
  }

  async checkSpecificChannels(channelIds) {
    const latestVideos = [];
    for (const channelId of channelIds) {
      try {
        const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
        const response = await axios.get(rssUrl);
        const result = await parseXML(response.data);
        if (result.feed?.entry?.length > 0) {
          const v = result.feed.entry[0];
          latestVideos.push({
            id: { videoId: v['yt:videoId'][0] },
            snippet: { title: v.title[0], channelTitle: v.author[0].name[0], publishedAt: v.published[0] }
          });
        }
      } catch (error) {
        console.error(`Error checking YouTube channel ${channelId}:`, error.message);
      }
    }
    return latestVideos;
  }

  start() {
    console.log('Starting YouTube monitor (RSS feeds - no quota limits!)');
    this.checkVideos();
    this.interval = setInterval(() => this.checkVideos(), 300000);
    console.log('✅ YouTube monitor started (checking every 5 minutes)');
  }

  stop() {
    if (this.interval) { clearInterval(this.interval); console.log('YouTube monitor stopped'); }
  }
}

module.exports = YouTubeMonitor;
