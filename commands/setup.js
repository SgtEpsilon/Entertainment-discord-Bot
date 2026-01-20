// commands/setup.js
const { getGuildConfig, saveConfig } = require('../utils/config');

module.exports = {
  data: {
    name: 'setup',
    description: 'Set the notification channel and optional live role for this server',
    options: [
      {
        name: 'channel',
        description: 'The channel to send notifications to',
        type: 7, // CHANNEL type
        required: true
      },
      {
        name: 'liverole',
        description: 'The role to assign when streamers go live (optional)',
        type: 8, // ROLE type
        required: false
      }
    ]
  },
  
  async execute(interaction, client, config) {
    const guildConfig = getGuildConfig(interaction.guildId);
    const channel = interaction.options.getChannel('channel');
    const role = interaction.options.getRole('liverole');
    
    if (!channel.isTextBased()) {
      return interaction.reply('❌ Please select a text channel!');
    }
    
    // Set notification channel
    guildConfig.channelId = channel.id;
    
    let responseMessage = `✅ Notification channel set to ${channel}!`;
    
    // Handle optional live role
    if (role) {
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
      responseMessage += `\n✅ Live streamer role set to ${role}!`;
      console.log(`Guild ${interaction.guildId} set live role to ${role.id}`);
    }
    
    if (saveConfig()) {
      await interaction.reply(responseMessage);
      console.log(`Guild ${interaction.guildId} set channel to ${channel.id}`);
    } else {
      await interaction.reply('❌ Error saving configuration. Please try again.');
    }
  }
};