// modules/twitch.js
const axios = require('axios');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

class TwitchMonitor {
  constructor(client, config) {
    this.client = client;
    this.config = config;
    this.accessToken = null;
    this.liveStreamers = new Map();
    this.connectedAccountsCache = new Map();
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

  findMemberByTwitchUsername(members, twitchUsername) {
    let member = members.find(m => 
      m.nickname?.toLowerCase() === twitchUsername.toLowerCase()
    );
    
    if (!member) {
      member = members.find(m => 
        m.user.username.toLowerCase() === twitchUsername.toLowerCase()
      );
    }
    
    if (!member) {
      member = members.find(m => 
        m.nickname?.toLowerCase().includes(twitchUsername.toLowerCase())
      );
    }
    
    if (!member) {
      member = members.find(m => 
        m.user.username.toLowerCase().includes(twitchUsername.toLowerCase())
      );
    }
    
    return member;
  }

  async assignLiveRole(guild, guildConfig, username, memberId = null) {
    if (!guildConfig.liveRoleId) return;

    try {
      const role = await guild.roles.fetch(guildConfig.liveRoleId);
      if (!role) {
        console.log(`Live role ${guildConfig.liveRoleId} not found in guild ${guild.id}`);
        return;
      }

      let member;
      if (memberId) {
        member = await guild.members.fetch(memberId);
      } else {
        member = this.findMemberByTwitchUsername(guild.members.cache, username);
        
        if (!member) {
          const fetchedMembers = await guild.members.fetch();
          member = this.findMemberByTwitchUsername(fetchedMembers, username);
        }
      }

      if (!member) {
        console.log(`Could not find Discord member for Twitch user ${username} in guild ${guild.id}`);
        return;
      }

      if (member.roles.cache.has(role.id)) {
        console.log(`Member ${member.user.tag} already has live role`);
        return;
      }

      await member.roles.add(role);
      console.log(`✅ Assigned live role to ${member.user.tag} (${username}) in guild ${guild.id}`);
      
      const liveMap = this.liveStreamers.get(guild.id);
      if (liveMap && liveMap.has(username)) {
        liveMap.get(username).memberId = member.id;
      }
    } catch (error) {
      console.error(`Error assigning live role to ${username}:`, error.message);
    }
  }

  async removeLiveRole(guild, guildConfig, username, memberId = null) {
    if (!guildConfig.liveRoleId) return;

    try {
      const role = await guild.roles.fetch(guildConfig.liveRoleId);
      if (!role) {
        console.log(`Live role ${guildConfig.liveRoleId} not found in guild ${guild.id}`);
        return;
      }

      let member;
      if (memberId) {
        member = await guild.members.fetch(memberId);
      } else {
        member = this.findMemberByTwitchUsername(guild.members.cache, username);
        
        if (!member) {
          const fetchedMembers = await guild.members.fetch();
          member = this.findMemberByTwitchUsername(fetchedMembers, username);
        }
      }

      if (!member) {
        console.log(`Could not find Discord member for Twitch user ${username} in guild ${guild.id}`);
        return;
      }

      if (!member.roles.cache.has(role.id)) {
        console.log(`Member ${member.user.tag} doesn't have live role`);
        return;
      }

      await member.roles.remove(role);
      console.log(`❌ Removed live role from ${member.user.tag} (${username}) in guild ${guild.id}`);
    } catch (error) {
      console.error(`Error removing live role from ${username}:`, error.message);
    }
  }

  async checkStreams() {
    if (!this.accessToken) {
      await this.getAccessToken();
      if (!this.accessToken) return;
    }

    for (const [guildId, guildConfig] of Object.entries(this.config.guilds)) {
      if (!guildConfig.channelId || !guildConfig.twitch.usernames.length) {
        continue;
      }

      if (!this.liveStreamers.has(guildId)) {
        this.liveStreamers.set(guildId, new Map());
      }

      const liveMap = this.liveStreamers.get(guildId);
      const guild = await this.client.guilds.fetch(guildId);

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
            const currentGameId = stream.game_id;
            const lastNotification = liveMap.get(username);

            if (!lastNotification) {
              const messageId = await this.sendNotification(stream, guildId, guildConfig);
              liveMap.set(username, { 
                game_id: currentGameId, 
                memberId: null,
                messageId: messageId,
                channelId: guildConfig.channelId
              });
              await this.assignLiveRole(guild, guildConfig, username);
            } else if (lastNotification.game_id !== currentGameId) {
              await this.updateNotification(stream, guildId, guildConfig, lastNotification);
              liveMap.get(username).game_id = currentGameId;
              console.log(`🎮 Updated notification for ${stream.user_name} - game changed to ${stream.game_name}`);
            }
          } else {
            if (liveMap.has(username)) {
              const cachedData = liveMap.get(username);
              await this.removeLiveRole(guild, guildConfig, username, cachedData?.memberId);
              liveMap.delete(username);
            }
          }
        } catch (error) {
          if (error.response?.status === 401) {
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
        return null;
      }

      const username = stream.user_login;
      let messageText = guildConfig.twitch.message;
      
      if (guildConfig.twitch.customMessages && guildConfig.twitch.customMessages[username]) {
        messageText = guildConfig.twitch.customMessages[username];
      }

      messageText = messageText
        .replace(/{username}/g, stream.user_name)
        .replace(/{title}/g, stream.title)
        .replace(/{game}/g, stream.game_name || 'Unknown')
        .replace(/{url}/g, `https://twitch.tv/${stream.user_login}`);

      const embed = new EmbedBuilder()
        .setColor('#9146FF')
        .setTitle(stream.title || 'Untitled Stream')
        .setURL(`https://twitch.tv/${stream.user_login}`)
        .setAuthor({
          name: `${stream.user_name} is now live on Twitch!`,
          iconURL: 'https://cdn.discordapp.com/attachments/your-attachment-id/twitch-icon.png',
          url: `https://twitch.tv/${stream.user_login}`
        })
        .setDescription(`**Playing ${stream.game_name || 'Unknown'}**`)
        .setImage(stream.thumbnail_url.replace('{width}', '1920').replace('{height}', '1080') + `?t=${Date.now()}`)
        .addFields(
          { name: '👁️ Viewers', value: stream.viewer_count.toLocaleString(), inline: true },
          { name: '🎮 Category', value: stream.game_name || 'Unknown', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Twitch' });

      const button = new ButtonBuilder()
        .setLabel('Watch Now')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://twitch.tv/${stream.user_login}`)
        .setEmoji('🔴');

      const row = new ActionRowBuilder().addComponents(button);

      const message = await channel.send({
        content: messageText,
        embeds: [embed],
        components: [row]
      });

      console.log(`Sent Twitch notification for ${stream.user_name} to guild ${guildId}${guildConfig.twitch.customMessages?.[username] ? ' (custom message)' : ''}`);
      
      return message.id;
    } catch (error) {
      console.error(`Error sending notification to guild ${guildId}:`, error.message);
      return null;
    }
  }

  async updateNotification(stream, guildId, guildConfig, cachedData) {
    try {
      if (!cachedData.messageId || !cachedData.channelId) {
        console.log(`No cached message ID for ${stream.user_name}, cannot update`);
        return;
      }

      const channel = await this.client.channels.fetch(cachedData.channelId);
      if (!channel) {
        console.error(`Discord channel not found for guild ${guildId}`);
        return;
      }

      const message = await channel.messages.fetch(cachedData.messageId);
      if (!message) {
        console.error(`Message ${cachedData.messageId} not found, cannot update`);
        return;
      }

      const username = stream.user_login;
      let messageText = guildConfig.twitch.message;
      
      if (guildConfig.twitch.customMessages && guildConfig.twitch.customMessages[username]) {
        messageText = guildConfig.twitch.customMessages[username];
      }

      messageText = messageText
        .replace(/{username}/g, stream.user_name)
        .replace(/{title}/g, stream.title)
        .replace(/{game}/g, stream.game_name || 'Unknown')
        .replace(/{url}/g, `https://twitch.tv/${stream.user_login}`);

      const embed = new EmbedBuilder()
        .setColor('#9146FF')
        .setTitle(stream.title || 'Untitled Stream')
        .setURL(`https://twitch.tv/${stream.user_login}`)
        .setAuthor({
          name: `${stream.user_name} is now live on Twitch!`,
          iconURL: 'https://cdn.discordapp.com/attachments/your-attachment-id/twitch-icon.png',
          url: `https://twitch.tv/${stream.user_login}`
        })
        .setDescription(`**Playing ${stream.game_name || 'Unknown'}**`)
        .setImage(stream.thumbnail_url.replace('{width}', '1920').replace('{height}', '1080') + `?t=${Date.now()}`)
        .addFields(
          { name: '👁️ Viewers', value: stream.viewer_count.toLocaleString(), inline: true },
          { name: '🎮 Category', value: stream.game_name || 'Unknown', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Twitch • Updated' });

      const button = new ButtonBuilder()
        .setLabel('Watch Now')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://twitch.tv/${stream.user_login}`)
        .setEmoji('🔴');

      const row = new ActionRowBuilder().addComponents(button);

      await message.edit({
        content: messageText,
        embeds: [embed],
        components: [row]
      });

    } catch (error) {
      console.error(`Error updating notification for guild ${guildId}:`, error.message);
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
    this.checkStreams();
    this.interval = setInterval(() => this.checkStreams(), 60000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}

module.exports = TwitchMonitor;