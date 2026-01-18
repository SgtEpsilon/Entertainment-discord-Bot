// commands/removechannel.js
const { getGuildConfig, saveConfig } = require('../utils/config');
const { extractYouTubeChannelId } = require('../utils/youtube');

module.exports = {
  data: {
    name: 'removechannel',
    description: 'Remove a YouTube channel from the monitoring list',
    options: [{
      name: 'channel',
      description: 'YouTube channel URL, @handle, or channel ID (UC...)',
      type: 3,
      required: true
    }]
  },
  
  async execute(interaction, client, config) {
    const guildConfig = getGuildConfig(interaction.guildId);
    const input = interaction.options.getString('channel').trim();
    
    // Extract channel ID from various formats
    const channelId = await extractYouTubeChannelId(input);
    
    if (!channelId) {
      return interaction.reply('❌ Invalid YouTube channel. Please provide a channel URL, @handle, or channel ID.');
    }
    
    const index = guildConfig.youtube.channelIds.indexOf(channelId);
    
    if (index === -1) {
      return interaction.reply(`❌ This channel is not in the monitoring list!`);
    }
    
    guildConfig.youtube.channelIds.splice(index, 1);
    
    if (saveConfig()) {
      await interaction.reply(`✅ Removed YouTube channel from the monitoring list!`);
      console.log(`Guild ${interaction.guildId} removed ${channelId} from YouTube monitoring`);
    } else {
      await interaction.reply('❌ Error saving configuration. Please try again.');
    }
  }
};