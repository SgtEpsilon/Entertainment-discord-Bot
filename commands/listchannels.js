// commands/listchannels.js
const { getGuildConfig } = require('../utils/config');
const axios = require('axios');
const { parseString } = require('xml2js');
const util = require('util');

const parseXML = util.promisify(parseString);

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
    
    // Fetch channel details from RSS feeds
    const channelDetails = [];
    
    for (const channelId of guildConfig.youtube.channelIds) {
      try {
        // Use RSS feed to get channel info
        const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
        const response = await axios.get(rssUrl, { timeout: 5000 });
        const result = await parseXML(response.data);
        
        if (result.feed && result.feed.author && result.feed.author[0]) {
          const channelTitle = result.feed.author[0].name[0];
          const channelUri = result.feed.author[0].uri[0];
          
          channelDetails.push({
            title: channelTitle,
            url: channelUri,
            channelId: channelId
          });
        } else {
          channelDetails.push({
            title: 'Unknown Channel',
            url: `https://youtube.com/channel/${channelId}`,
            channelId: channelId
          });
        }
      } catch (error) {
        console.error(`Error fetching channel info for ${channelId}:`, error.message);
        channelDetails.push({
          title: 'Error fetching channel',
          url: `https://youtube.com/channel/${channelId}`,
          channelId: channelId
        });
      }
    }
    
    // Build the response
    let response = '📋 **Currently monitoring YouTube channels:**\n\n';
    channelDetails.forEach((channel, index) => {
      response += `${index + 1}. **${channel.title}**\n`;
      response += `   ${channel.url}\n`;
      response += `   Channel ID: \`${channel.channelId}\`\n\n`;
    });
    
    response += `_Total: ${channelDetails.length} channel(s)_`;
    
    await interaction.editReply(response);
  }
};