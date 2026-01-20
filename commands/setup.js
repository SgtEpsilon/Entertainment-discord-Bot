const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { getGuildConfig, saveConfig } = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Set the notification channel and optional live role for this server')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The channel to send notifications to')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addRoleOption(option =>
      option
        .setName('liverole')
        .setDescription('The role to assign when streamers go live (optional)')
        .setRequired(false)
    ),
  
  async execute(interaction, client, config) {
    const guildConfig = getGuildConfig(interaction.guildId);
    const channel = interaction.options.getChannel('channel');
    const role = interaction.options.getRole('liverole');
    
    if (!channel.isTextBased()) {
      return interaction.reply('❌ Please select a text channel!');
    }
    
    guildConfig.channelId = channel.id;
    let responseMessage = `✅ Notification channel set to ${channel}!`;
    
    if (role) {
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