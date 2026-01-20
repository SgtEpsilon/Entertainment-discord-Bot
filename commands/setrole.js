// commands/setrole.js
const { getGuildConfig, saveConfig } = require('../utils/config');

module.exports = {
  data: {
    name: 'setrole',
    description: 'Set or update the role to assign when streamers go live',
    options: [{
      name: 'role',
      description: 'The role to assign to live streamers (leave empty to remove)',
      type: 8, // ROLE type
      required: false
    }]
  },
  
  async execute(interaction, client, config) {
    const guildConfig = getGuildConfig(interaction.guildId);
    const role = interaction.options.getRole('role');
    
    // If no role provided, remove the configuration
    if (!role) {
      if (!guildConfig.liveRoleId) {
        return interaction.reply('❌ No live role is currently configured!');
      }
      
      const oldRoleId = guildConfig.liveRoleId;
      guildConfig.liveRoleId = null;
      
      if (saveConfig()) {
        await interaction.reply(`✅ Live streamer role configuration removed!\n\n⚠️ Note: This does not remove the role from members who currently have it.`);
        console.log(`Guild ${interaction.guildId} removed live role ${oldRoleId}`);
      } else {
        await interaction.reply('❌ Error saving configuration. Please try again.');
      }
      return;
    }
    
    // Check if the bot can manage this role
    const botMember = await interaction.guild.members.fetch(client.user.id);
    const botHighestRole = botMember.roles.highest;
    
    if (role.position >= botHighestRole.position) {
      return interaction.reply('❌ I cannot assign this role! Please ensure my role is higher than the target role in the server settings.');
    }
    
    if (role.managed) {
      return interaction.reply('❌ This role is managed by an integration and cannot be assigned manually!');
    }
    
    guildConfig.liveRoleId = role.id;
    
    if (saveConfig()) {
      await interaction.reply(`✅ Live streamer role set to ${role}!\n\nStreamers will receive this role when they go live and lose it when they go offline.`);
      console.log(`Guild ${interaction.guildId} set live role to ${role.id}`);
    } else {
      await interaction.reply('❌ Error saving configuration. Please try again.');
    }
  }
};