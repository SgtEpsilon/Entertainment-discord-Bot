// commands/liststreamers.js
const { getGuildConfig } = require('../utils/config');

module.exports = {
  data: {
    name: 'liststreamers',
    description: 'Show all monitored Twitch streamers'
  },
  
  async execute(interaction, client, config) {
    const guildConfig = getGuildConfig(interaction.guildId);
    
    if (guildConfig.twitch.usernames.length === 0) {
      return interaction.reply('📋 No streamers are currently being monitored.');
    }
    
    const list = guildConfig.twitch.usernames.map((u, i) => `${i + 1}. ${u}`).join('\n');
    await interaction.reply(`📋 **Currently monitoring:**\n${list}`);
  }
};