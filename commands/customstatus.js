const { SlashCommandBuilder: SlashCommandBuilder5, PermissionFlagsBits: PermissionFlagsBits3, ActivityType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder5()
    .setName('customstatus')
    .setDescription('Set a custom bot status (pauses rotation)')
    .setDefaultMemberPermissions(PermissionFlagsBits3.Administrator)
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Status type')
        .setRequired(true)
        .addChoices(
          { name: 'Playing', value: 'PLAYING' },
          { name: 'Streaming', value: 'STREAMING' },
          { name: 'Listening', value: 'LISTENING' },
          { name: 'Watching', value: 'WATCHING' },
          { name: 'Competing', value: 'COMPETING' }
        ))
    .addStringOption(option =>
      option.setName('text')
        .setDescription('Status text')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('url')
        .setDescription('URL (only for Streaming type)')
        .setRequired(false)),

  async execute(interaction, client) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits3.Administrator)) {
      return await interaction.reply({
        content: '❌ You need Administrator permission to use this command.',
        ephemeral: true
      });
    }

    const type = interaction.options.getString('type');
    const text = interaction.options.getString('text');
    const url = interaction.options.getString('url');

    if (type === 'STREAMING' && !url) {
      return await interaction.reply({
        content: '❌ URL is required for Streaming status type!',
        ephemeral: true
      });
    }

    const success = client.setCustomStatus(type, text, url);

    if (success) {
      await interaction.reply({
        content: `✅ Custom status set to: **${type}** - "${text}"${url ? `\nURL: ${url}` : ''}\n\n*Status rotation is now paused. Use \`/clearstatus\` to resume.*`,
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: '❌ Failed to set custom status. Bot may not be ready.',
        ephemeral: true
      });
    }
  }
};