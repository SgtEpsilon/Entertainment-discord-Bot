const { SlashCommandBuilder } = require('@discordjs/builders');
const { getGuildConfig, saveConfig } = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setrole')
    .setDescription('Set or update the role to assign when streamers go live')
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('The role to assign to live streamers (leave empty to remove)')
        .setRequired(false)
    ),
  
  async execute(interaction, client, config) {
    const guildConfig = getGuildConfig(interaction.guildId);
    const role = interaction.options.getRole('role');
    
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
