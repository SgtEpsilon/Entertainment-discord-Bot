// commands/listchannels.js
const { getGuildConfig } = require('../utils/config');
const axios = require('axios');

module.exports = {
  data: {
    name: 'listchannels',
    description: 'Show all monitored YouTube channels'
  },
  
  async execute(interaction, client, config) {
    const guildConfig = getGuildConfig(interaction.guildId);
    
    if (guildConfig.youtube.channelIds.length === 0) {
      return interaction.reply('📋 No YouTube channels are currently being monitored.');
    }
    
    await interaction.deferReply();
    
    // Fetch channel details from YouTube API
    const channelDetails = [];
    
    for (const channelId of guildConfig.youtube.channelIds) {
      try {
        const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
          params: {
            part: 'snippet',
            id: channelId,
            key: process.env.YOUTUBE_API_KEY
          }
        });
        
        if (response.data.items && response.data.items.length > 0) {
          const channel = response.data.items[0];
          const customUrl = channel.snippet.customUrl;
          channelDetails.push({
            title: channel.snippet.title,
            customUrl: customUrl,
            channelId: channelId
          });
        } else {
          channelDetails.push({
            title: 'Unknown Channel',
            customUrl: null,
            channelId: channelId
          });
        }
      } catch (error) {
        console.error(`Error fetching channel info for ${channelId}:`, error.message);
        channelDetails.push({
          title: 'Error fetching channel',
          customUrl: null,
          channelId: channelId
        });
      }
    }
    
    // Build the response
    let response = '📋 **Currently monitoring YouTube channels:**\n\n';
    channelDetails.forEach((channel, index) => {
      response += `${index + 1}. **${channel.title}**\n`;
      if (channel.customUrl) {
        response += `   ${channel.customUrl}\n`;
        response += `   https://youtube.com/${channel.customUrl}\n`;
      } else {
        response += `   https://youtube.com/channel/${channel.channelId}\n`;
      }
      response += '\n';
    });
    
    await interaction.editReply(response);
  }
};