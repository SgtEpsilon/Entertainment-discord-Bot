// commands/removestreamer.js
const { getGuildConfig, saveConfig } = require('../utils/config');

module.exports = {
  data: {
    name: 'removestreamer',
    description: 'Remove a Twitch streamer from the monitoring list',
    options: [{
      name: 'username',
      description: 'Twitch username',
      type: 3,
      required: true
    }]
  },
  
  async execute(interaction, client, config) {
    const guildConfig = getGuildConfig(interaction.guildId);
    const username = interaction.options.getString('username').toLowerCase();
    const index = guildConfig.twitch.usernames.indexOf(username);
    
    if (index === -1) {
      return interaction.reply(`❌ **${username}** is not in the monitoring list!`);
    }
    
    guildConfig.twitch.usernames.splice(index, 1);
    
    if (saveConfig()) {
      await interaction.reply(`✅ Removed **${username}** from the monitoring list!`);
      console.log(`Guild ${interaction.guildId} removed ${username} from Twitch monitoring`);
    } else {
      await interaction.reply('❌ Error saving configuration. Please try again.');
    }
  }
};