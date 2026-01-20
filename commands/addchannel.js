const { SlashCommandBuilder } = require('discord.js');
const { getGuildConfig, saveConfig } = require('../utils/config');
const { extractYouTubeChannelId } = require('../utils/youtube');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addchannel')
    .setDescription('Add a YouTube channel to the monitoring list')
    .addStringOption(option =>
      option
        .setName('channel')
        .setDescription('YouTube channel URL, @handle, or channel ID (UC...)')
        .setRequired(true)
    ),
  
  async execute(interaction, client, config) {
    const guildConfig = getGuildConfig(interaction.guildId);
    const input = interaction.options.getString('channel').trim();
    
    const channelId = await extractYouTubeChannelId(input);
    
    if (!channelId) {
      return interaction.reply('❌ Invalid YouTube channel. Please provide a channel URL (youtube.com/channel/... or youtube.com/@...), @handle, or channel ID (UC...).');
    }
    
    if (guildConfig.youtube.channelIds.includes(channelId)) {
      return interaction.reply(`❌ This channel is already being monitored!`);
    }
    
    guildConfig.youtube.channelIds.push(channelId);
    
    if (saveConfig()) {
      await interaction.reply(`✅ Added YouTube channel to the monitoring list!\nChannel ID: \`${channelId}\`\n\nThe bot will check for new videos every 5 minutes.`);
      console.log(`Guild ${interaction.guildId} added ${channelId} to YouTube monitoring`);
    } else {
      await interaction.reply('❌ Error saving configuration. Please try again.');
    }
  }
};