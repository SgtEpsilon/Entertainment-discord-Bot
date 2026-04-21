// commands/setup.js
const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { getGuildConfig, saveConfig } = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Set the fallback notification channel and optional live role for this server')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('Fallback channel for notifications when no per-streamer channel is set')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addRoleOption(option =>
      option
        .setName('liverole')
        .setDescription('Role to assign when streamers go live (optional)')
        .setRequired(false)
    ),

  async execute(interaction, client, config) {
    const guildConfig = getGuildConfig(interaction.guildId);
    const channel = interaction.options.getChannel('channel');
    const role = interaction.options.getRole('liverole');

    guildConfig.channelId = channel.id;
    let responseMessage = `✅ Fallback notification channel set to ${channel}!\n\n💡 You can set a specific channel per streamer with \`/addstreamer\` and per YouTube channel with \`/addchannel\`.`;

    if (role) {
      const botMember = await interaction.guild.members.fetch(client.user.id);
      if (role.position >= botMember.roles.highest.position) {
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
      console.log(`Guild ${interaction.guildId} set fallback channel to ${channel.id}`);
    } else {
      await interaction.reply('❌ Error saving configuration. Please try again.');
    }
  }
};
