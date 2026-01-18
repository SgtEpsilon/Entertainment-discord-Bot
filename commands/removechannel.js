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
    await interaction.deferReply();
    
    const guildConfig = getGuildConfig(interaction.guildId);
    const input = interaction.options.getString('channel').trim();
    
    // Extract channel ID from various formats (uses RSS validation)
    const channelId = await extractYouTubeChannelId(input);
    
    if (!channelId) {
      return interaction.editReply('❌ Invalid YouTube channel. Please provide a channel URL, @handle, or channel ID.');
    }
    
    const index = guildConfig.youtube.channelIds.indexOf(channelId);
    
    if (index === -1) {
      return interaction.editReply(`❌ This channel is not in the monitoring list!\n\nChannel ID: \`${channelId}\``);
    }
    
    guildConfig.youtube.channelIds.splice(index, 1);
    
    if (saveConfig()) {
      await interaction.editReply(`✅ Removed YouTube channel from the monitoring list!\n\nChannel ID: \`${channelId}\`\nRemaining channels: ${guildConfig.youtube.channelIds.length}`);
      console.log(`Guild ${interaction.guildId} removed ${channelId} from YouTube monitoring`);
    } else {
      await interaction.editReply('❌ Error saving configuration. Please try again.');
    }
  }
};