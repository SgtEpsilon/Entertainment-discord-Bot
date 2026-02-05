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
    // Try web scraping first
    const webResult = await this.fetchUserPostsViaWeb(username);
    if (webResult) {
      return webResult;
    }
    
    // Fallback to API method
    console.log(`[TikTok] Web scraping failed for @${username}, trying API method...`);
    return await this.fetchUserPostsViaAPI(username);
  }

  /**
   * Fetch posts via web scraping (primary method)
   */
  async fetchUserPostsViaWeb(username) {
    try {
      // TikTok profile URL
      const url = `https://www.tiktok.com/@${username}`;
      
      console.log(`[TikTok] Fetching posts for @${username} via web...`);
      
      // Make request with browser-like headers
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0'
        },
        timeout: 15000,
        maxRedirects: 5
      });

      // Try multiple extraction methods
      let jsonData = null;
      
      // Method 1: __UNIVERSAL_DATA_FOR_REHYDRATION__
      let scriptMatch = response.data.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.*?)<\/script>/s);
      if (scriptMatch) {
        console.log(`[TikTok] Found UNIVERSAL_DATA for @${username}`);
        try {
          jsonData = JSON.parse(scriptMatch[1]);
        } catch (e) {
          console.log(`[TikTok] Failed to parse UNIVERSAL_DATA: ${e.message}`);
        }
      }
      
      // Method 2: SIGI_STATE
      if (!jsonData) {
        scriptMatch = response.data.match(/<script id="SIGI_STATE" type="application\/json">(.*?)<\/script>/s);
        if (scriptMatch) {
          console.log(`[TikTok] Found SIGI_STATE for @${username}`);
          try {
            jsonData = JSON.parse(scriptMatch[1]);
          } catch (e) {
            console.log(`[TikTok] Failed to parse SIGI_STATE: ${e.message}`);
          }
        }
      }
      
      // Method 3: __NEXT_DATA__
      if (!jsonData) {
        scriptMatch = response.data.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
        if (scriptMatch) {
          console.log(`[TikTok] Found NEXT_DATA for @${username}`);
          try {
            jsonData = JSON.parse(scriptMatch[1]);
          } catch (e) {
            console.log(`[TikTok] Failed to parse NEXT_DATA: ${e.message}`);
          }
        }
      }
      
      if (!jsonData) {
        console.log(`[TikTok] ⚠️ No JSON data found for @${username}`);
        return null;
      }

      // Try to extract user and post data from various possible structures
      let userData = null;
      let posts = [];
      
      // Try different data paths
      const possiblePaths = [
        () => jsonData?.__DEFAULT_SCOPE__?.["webapp.user-detail"],
        () => jsonData?.UserModule?.users?.[username],
        () => jsonData?.props?.pageProps?.userInfo,
        () => jsonData?.ItemModule,
      ];
      
      for (const pathFn of possiblePaths) {
        try {
          const data = pathFn();
          if (data) {
            userData = data;
            console.log(`[TikTok] Found user data for @${username}`);
            break;
          }
        } catch (e) {
          // Continue to next path
        }
      }
      
      if (!userData) {
        console.log(`[TikTok] ⚠️ User data structure not found for @${username}`);
        return null;
      }

      // Extract posts from various possible structures
      const postsPaths = [
        () => userData.itemList,
        () => userData.items,
        () => Object.values(jsonData?.ItemModule || {}),
        () => jsonData?.props?.pageProps?.items,
      ];
      
      for (const pathFn of postsPaths) {
        try {
          const p = pathFn();
          if (p && Array.isArray(p) && p.length > 0) {
            posts = p;
            console.log(`[TikTok] Found ${posts.length} posts for @${username}`);
            break;
          }
        } catch (e) {
          // Continue to next path
        }
      }

      if (posts.length === 0) {
        console.log(`[TikTok] No posts found in data for @${username}`);
        return null;
      }

      // Get the most recent post
      const latestPost = posts[0];
      
      // Extract user info
      const userInfo = userData.userInfo || userData.user || userData;
      
      return {
        id: latestPost.id || latestPost.itemId || latestPost.video?.id,
        desc: latestPost.desc || latestPost.description || latestPost.title || 'No description',
        createTime: latestPost.createTime || latestPost.createTimeISO || Date.now(),
        stats: latestPost.stats || {},
        video: latestPost.video || {},
        author: {
          uniqueId: userInfo.uniqueId || userInfo.user?.uniqueId || username,
          nickname: userInfo.nickname || userInfo.user?.nickname || username,
          avatarThumb: userInfo.avatarThumb || userInfo.user?.avatarThumb || ''
        }
      };
      
    } catch (error) {
      if (error.response?.status === 404) {
        console.error(`[TikTok] ❌ User not found: @${username}`);
      } else if (error.code === 'ECONNABORTED') {
        console.error(`[TikTok] ⏱️ Timeout fetching @${username}`);
      } else {
        console.error(`[TikTok] ❌ Error in web scraping for @${username}:`, error.message);
      }
      return null;
    }
  }

  /**
   * Fetch posts via unofficial API (fallback method)
   */
  async fetchUserPostsViaAPI(username) {
    try {
      console.log(`[TikTok] Trying API method for @${username}...`);
      
      // Try TikTok's mobile API endpoint
      const apiUrl = `https://www.tiktok.com/api/user/detail/?uniqueId=${username}`;
      
      const response = await axios.get(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
          'Accept': 'application/json',
          'Referer': `https://www.tiktok.com/@${username}`
        },
        timeout: 10000
      });

      if (!response.data || !response.data.userInfo) {
        console.log(`[TikTok] No user info from API for @${username}`);
        return null;
      }

      const userInfo = response.data.userInfo.user;
      
      // Fetch user's videos
      const videosUrl = `https://www.tiktok.com/api/post/item_list/?secUid=${response.data.userInfo.user.secUid}&count=10`;
      const videosResponse = await axios.get(videosUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
          'Accept': 'application/json',
          'Referer': `https://www.tiktok.com/@${username}`
        },
        timeout: 10000
      });

      if (!videosResponse.data?.itemList || videosResponse.data.itemList.length === 0) {
        console.log(`[TikTok] No posts from API for @${username}`);
        return null;
      }

      const latestPost = videosResponse.data.itemList[0];
      
      console.log(`[TikTok] ✅ Got post from API for @${username}`);
      
      return {
        id: latestPost.id,
        desc: latestPost.desc || 'No description',
        createTime: latestPost.createTime,
        stats: latestPost.stats || {},
        video: latestPost.video || {},
        author: {
          uniqueId: userInfo.uniqueId,
          nickname: userInfo.nickname,
          avatarThumb: userInfo.avatarThumb
        }
      };
      
    } catch (error) {
      console.error(`[TikTok] ❌ API method also failed for @${username}:`, error.message);
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
