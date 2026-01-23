const { SlashCommandBuilder: SlashCommandBuilder3, StringSelectMenuBuilder: StringSelectMenuBuilder2, ActionRowBuilder: ActionRowBuilder2, PermissionFlagsBits: PermissionFlagsBits2 } = require('discord.js');
const { getGuildConfig: getGuildConfig2, saveConfig } = require('../utils/config');
const axios2 = require('axios');
const { parseString: parseString2 } = require('xml2js');
const util2 = require('util');

const parseXML2 = util2.promisify(parseString2);

module.exports = {
  data: new SlashCommandBuilder3()
    .setName('removechannel')
    .setDescription('Remove a YouTube channel from the monitoring list')
    .setDefaultMemberPermissions(PermissionFlagsBits2.Administrator),
  
  async execute(interaction, client, config) {
    const guildConfig = getGuildConfig2(interaction.guildId);
    
    if (guildConfig.youtube.channelIds.length === 0) {
      return interaction.reply('📋 No YouTube channels are currently being monitored.');
    }
    
    await interaction.deferReply();
    
    const channelOptions = [];
    
    for (const channelId of guildConfig.youtube.channelIds) {
      try {
        const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
        const response = await axios2.get(rssUrl, { timeout: 5000 });
        const result = await parseXML2(response.data);
        
        let channelTitle = 'Unknown Channel';
        if (result.feed && result.feed.author && result.feed.author[0]) {
          channelTitle = result.feed.author[0].name[0];
        }
        
        channelOptions.push({
          label: channelTitle,
          description: channelId,
          value: channelId
        });
      } catch (error) {
        console.error(`Error fetching channel info for ${channelId}:`, error.message);
        channelOptions.push({
          label: 'Unknown Channel',
          description: channelId,
          value: channelId
        });
      }
    }
    
    const selectMenu = new StringSelectMenuBuilder2()
      .setCustomId('remove-channel-select')
      .setPlaceholder('Select a channel to remove')
      .addOptions(channelOptions);
    
    const row = new ActionRowBuilder2().addComponents(selectMenu);
    
    const response = await interaction.editReply({
      content: '🗑️ **Select a YouTube channel to remove:**',
      components: [row]
    });
    
    try {
      const collector = response.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 60000
      });
      
      collector.on('collect', async i => {
        const channelId = i.values[0];
        const index = guildConfig.youtube.channelIds.indexOf(channelId);
        
        if (index !== -1) {
          guildConfig.youtube.channelIds.splice(index, 1);
          
          if (saveConfig()) {
            await i.update({
              content: `✅ Removed YouTube channel from the monitoring list!\n\nChannel ID: \`${channelId}\`\nRemaining channels: ${guildConfig.youtube.channelIds.length}`,
              components: []
            });
            console.log(`Guild ${interaction.guildId} removed ${channelId} from YouTube monitoring`);
          } else {
            await i.update({
              content: '❌ Error saving configuration. Please try again.',
              components: []
            });
          }
        }
        
        collector.stop();
      });
      
      collector.on('end', (collected, reason) => {
        if (reason === 'time') {
          interaction.editReply({
            content: '⏱️ Selection timed out.',
            components: []
          }).catch(console.error);
        }
      });
      
    } catch (error) {
      console.error('Error handling channel removal:', error);
      await interaction.editReply({
        content: '❌ An error occurred. Please try again.',
        components: []
      });
    }
  }
};
