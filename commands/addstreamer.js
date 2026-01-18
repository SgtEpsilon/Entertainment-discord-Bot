// commands/addstreamer.js
const { getGuildConfig, saveConfig } = require('../utils/config');

module.exports = {
  data: {
    name: 'addstreamer',
    description: 'Add a Twitch streamer to the monitoring list',
    options: [{
      name: 'username',
      description: 'Twitch username',
      type: 3, // STRING type
      required: true
    }]
  },
  
  async execute(interaction, client, config) {
    const guildConfig = getGuildConfig(interaction.guildId);
    const username = interaction.options.getString('username').toLowerCase();
    
    if (guildConfig.twitch.usernames.includes(username)) {
      return interaction.reply(`❌ **${username}** is already being monitored!`);
    }
    
    guildConfig.twitch.usernames.push(username);
    
    if (saveConfig()) {
      await interaction.reply(`✅ Added **${username}** to the monitoring list!`);
      console.log(`Guild ${interaction.guildId} added ${username} to Twitch monitoring`);
    } else {
      await interaction.reply('❌ Error saving configuration. Please try again.');
    }
  }
};