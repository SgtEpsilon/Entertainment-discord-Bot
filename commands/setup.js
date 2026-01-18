// commands/setup.js
const { getGuildConfig, saveConfig } = require('../utils/config');

module.exports = {
  data: {
    name: 'setup',
    description: 'Set the notification channel for this server',
    options: [{
      name: 'channel',
      description: 'The channel to send notifications to',
      type: 7, // CHANNEL type
      required: true
    }]
  },
  
  async execute(interaction, client, config) {
    const guildConfig = getGuildConfig(interaction.guildId);
    const channel = interaction.options.getChannel('channel');
    
    if (!channel.isTextBased()) {
      return interaction.reply('❌ Please select a text channel!');
    }
    
    guildConfig.channelId = channel.id;
    
    if (saveConfig()) {
      await interaction.reply(`✅ Notification channel set to ${channel}!`);
      console.log(`Guild ${interaction.guildId} set channel to ${channel.id}`);
    } else {
      await interaction.reply('❌ Error saving configuration. Please try again.');
    }
  }
};