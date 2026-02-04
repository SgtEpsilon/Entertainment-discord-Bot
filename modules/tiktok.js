// modules/tiktok.js - TikTok monitoring via web scraping
const axios = require('axios');

class TikTokMonitor {
  constructor(client, config) {
    this.client = client;
    this.config = config;
    this.lastPostIds = new Map(); // Map of guildId -> Map of username -> postId
    
    console.log('TikTok Monitor initialized (using web scraping)');
  }

  /**
   * Fetch user's latest posts from TikTok
   * Uses TikTok's web interface to get post data
   */
  async fetchUserPosts(username) {
    try {
      // TikTok profile URL
      const url = `https://www.tiktok.com/@${username}`;
      
      // Make request with browser-like headers
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 10000
      });

      // Extract JSON data from the page
      // TikTok embeds data in <script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"> tag
      const scriptMatch = response.data.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.*?)<\/script>/s);
      
      if (!scriptMatch) {
        console.log(`No data found for TikTok user: @${username}`);
        return null;
      }

      const jsonData = JSON.parse(scriptMatch[1]);
      
      // Navigate to user data
      const userData = jsonData?.__DEFAULT_SCOPE__?.["webapp.user-detail"];
      
      if (!userData || !userData.userInfo) {
        console.log(`User data not found for: @${username}`);
        return null;
      }

      const userInfo = userData.userInfo;
      const posts = userData.itemList || [];

      if (posts.length === 0) {
        console.log(`No posts found for: @${username}`);
        return null;
      }

      // Get the most recent post
      const latestPost = posts[0];
      
      return {
        id: latestPost.id,
        desc: latestPost.desc || 'No description',
        createTime: latestPost.createTime,
        stats: latestPost.stats,
        video: latestPost.video,
        author: {
          uniqueId: userInfo.user.uniqueId,
          nickname: userInfo.user.nickname,
          avatarThumb: userInfo.user.avatarThumb
        }
      };
      
    } catch (error) {
      if (error.response?.status === 404) {
        console.error(`TikTok user not found: @${username}`);
      } else {
        console.error(`Error fetching TikTok posts for @${username}:`, error.message);
      }
      return null;
    }
  }

  /**
   * Check for new posts from monitored TikTok accounts
   */
  async checkPosts() {
    for (const [guildId, guildConfig] of Object.entries(this.config.guilds)) {
      if (!guildConfig.channelId || !guildConfig.tiktok?.usernames?.length) {
        continue;
      }

      // Initialize last post IDs map for this guild if it doesn't exist
      if (!this.lastPostIds.has(guildId)) {
        this.lastPostIds.set(guildId, new Map());
      }

      const guildLastPostIds = this.lastPostIds.get(guildId);

      for (const username of guildConfig.tiktok.usernames) {
        try {
          console.log(`Checking TikTok user: @${username} for guild: ${guildId}`);
          
          const latestPost = await this.fetchUserPosts(username);

          if (!latestPost) {
            continue;
          }

          const lastKnownId = guildLastPostIds.get(username);

          console.log(`Latest post found: ${latestPost.desc.substring(0, 50)}... (ID: ${latestPost.id})`);

          if (!lastKnownId) {
            // First time checking, just store the ID
            guildLastPostIds.set(username, latestPost.id);
            console.log(`Initialized tracking for TikTok user @${username}`);
          } else if (latestPost.id !== lastKnownId) {
            // New post detected
            guildLastPostIds.set(username, latestPost.id);
            console.log(`New TikTok post detected! Sending notification...`);
            
            await this.sendNotification(latestPost, guildId, guildConfig);
          } else {
            console.log(`No new post for @${username}`);
          }
        } catch (error) {
          console.error(`Error checking TikTok posts for @${username}:`, error.message);
        }

        // Add delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  /**
   * Send notification about new TikTok post
   */
  async sendNotification(post, guildId, guildConfig) {
    try {
      const channel = await this.client.channels.fetch(guildConfig.channelId);
      if (!channel) {
        console.error(`Discord channel not found for guild ${guildId}`);
        return;
      }

      const username = post.author.uniqueId;
      let messageText = guildConfig.tiktok.message || "🎵 {username} just posted on TikTok!\n**{description}**";
      
      // Check for custom message
      if (guildConfig.tiktok.customMessages && guildConfig.tiktok.customMessages[username]) {
        messageText = guildConfig.tiktok.customMessages[username];
      }

      messageText = messageText
        .replace(/{username}/g, post.author.nickname || username)
        .replace(/{description}/g, post.desc || 'No description')
        .replace(/{url}/g, `https://www.tiktok.com/@${username}/video/${post.id}`);

      const postUrl = `https://www.tiktok.com/@${username}/video/${post.id}`;
      
      await channel.send(`${messageText}\n${postUrl}`);
      console.log(`✅ Sent TikTok notification for @${username} to guild ${guildId}`);
    } catch (error) {
      console.error(`Error sending TikTok notification to guild ${guildId}:`, error.message);
    }
  }

  /**
   * Check specific TikTok accounts (for manual nudge command)
   */
  async checkSpecificAccounts(usernames) {
    const latestPosts = [];

    for (const username of usernames) {
      try {
        console.log(`Manual check for TikTok user: @${username}`);
        
        const latestPost = await this.fetchUserPosts(username);

        if (latestPost) {
          latestPosts.push(latestPost);
          console.log(`Found post: ${latestPost.desc.substring(0, 50)}...`);
        } else {
          console.log(`No posts found for @${username}`);
        }

        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error checking TikTok posts for @${username}:`, error.message);
      }
    }

    return latestPosts;
  }

  /**
   * Validate TikTok username exists
   */
  async validateUsername(username) {
    try {
      const url = `https://www.tiktok.com/@${username}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 10000
      });

      // Check if page contains user data
      const scriptMatch = response.data.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"/);
      return !!scriptMatch;
    } catch (error) {
      return false;
    }
  }

  start() {
    console.log('Starting TikTok monitor...');
    console.log('✅ Using web scraping for TikTok posts');
    
    this.checkPosts(); // Check immediately
    this.interval = setInterval(() => this.checkPosts(), 300000); // Check every 5 minutes
    console.log('✅ TikTok monitor started (checking every 5 minutes)');
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      console.log('TikTok monitor stopped');
    }
  }
}

module.exports = TikTokMonitor;
