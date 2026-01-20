// commands/removerole.js
// NOTE: This command is now redundant as /setrole can remove the role when called without parameters
// You can delete this file or keep it as an alias for users who prefer explicit commands

const { getGuildConfig, saveConfig } = require('../utils/config');

module.exports = {
  data: {
    name: 'removerole',
    description: 'Remove the live streamer role configuration'
  },
  
  async execute(interaction, client, config) {
    const guildConfig = getGuildConfig(interaction.guildId);
    
    if (!guildConfig.liveRoleId) {
      return interaction.reply('❌ No live role is currently configured!');
    }
    
    const oldRoleId = guildConfig.liveRoleId;
    guildConfig.liveRoleId = null;
    
    if (saveConfig()) {
      await interaction.reply(`✅ Live streamer role configuration removed!\n\n⚠️ Note: This does not remove the role from members who currently have it. You may need to manually remove it from live streamers.`);
      console.log(`Guild ${interaction.guildId} removed live role ${oldRoleId}`);
    } else {
      await interaction.reply('❌ Error saving configuration. Please try again.');
    }
  }
};