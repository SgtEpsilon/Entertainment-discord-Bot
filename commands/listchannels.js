const { SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, EmbedBuilder } = require('@discordjs/builders');
const { getGuildConfig } = require('../utils/config');
const axios = require('axios');
const { parseString } = require('xml2js');
const util = require('util');

const parseXML = util.promisify(parseString);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('listchannels')
    .setDescription('Show all monitored YouTube channels'),
  
  async execute(interaction, client, config) {
    const guildConfig = getGuildConfig(interaction.guildId);
    
    if (guildConfig.youtube.channelIds.length === 0) {
      return interaction.reply('📋 No YouTube channels are currently being monitored.');
    }
    
    await interaction.deferReply();
    
    const channelDetails = [];
    
    for (const channelId of guildConfig.youtube.channelIds) {
      try {
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
    
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('📋 Monitored YouTube Channels')
      .setDescription(`Total: ${channelDetails.length} channel(s)`)
      .setTimestamp();
    
    channelDetails.forEach((channel, index) => {
      embed.addFields({
        name: `${index + 1}. ${channel.title}`,
        value: `[Visit Channel](${channel.url})\nID: \`${channel.channelId}\``,
        inline: false
      });
    });
    
    const options = channelDetails.slice(0, 25).map((channel, index) => 
      new StringSelectMenuOptionBuilder()
        .setLabel(channel.title.substring(0, 100))
        .setDescription(`View details`)
        .setValue(channel.channelId)
        .setEmoji('📺')
    );
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('view-channel-details')
      .setPlaceholder('Select a channel for more details')
      .addOptions(options);
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    const response = await interaction.editReply({
      embeds: [embed],
      components: [row]
    });
    
    try {
      const collector = response.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 120000
      });
      
      collector.on('collect', async i => {
        const selectedChannelId = i.values[0];
        const selectedChannel = channelDetails.find(c => c.channelId === selectedChannelId);
        
        if (selectedChannel) {
          const detailEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle(selectedChannel.title)
            .setURL(selectedChannel.url)
            .addFields(
              { name: 'Channel URL', value: selectedChannel.url },
              { name: 'Channel ID', value: `\`${selectedChannel.channelId}\`` }
            )
            .setTimestamp();
          
          await i.reply({
            embeds: [detailEmbed],
            ephemeral: true
          });
        }
      });
      
      collector.on('end', () => {
        interaction.editReply({ components: [] }).catch(console.error);
      });
      
    } catch (error) {
      console.error('Error handling channel selection:', error);
    }
  }
};
