const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('customstatus')
    .setDescription('Set a custom bot status (pauses rotation)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
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
    // Double-check permissions (redundant but safe)
    if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      return await interaction.reply({
        content: '❌ You need Administrator permission to use this command.',
        ephemeral: true
      });
    }

    const type = interaction.options.getString('type');
    const text = interaction.options.getString('text');
    const url = interaction.options.getString('url');

    // Validate URL for streaming
    if (type === 'STREAMING' && !url) {
      return await interaction.reply({
        content: '❌ URL is required for Streaming status type!',
        ephemeral: true
      });
    }

    // Set custom status
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