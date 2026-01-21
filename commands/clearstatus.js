const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearstatus')
    .setDescription('Clear custom status and resume rotation')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    // Double-check permissions (redundant but safe)
    if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      return await interaction.reply({
        content: '❌ You need Administrator permission to use this command.',
        ephemeral: true
      });
    }

    if (!client.getCustomStatusActive()) {
      return await interaction.reply({
        content: '⚠️ No custom status is currently active. Status rotation is already running.',
        ephemeral: true
      });
    }

    const success = client.clearCustomStatus();

    if (success) {
      await interaction.reply({
        content: '✅ Custom status cleared! Status rotation has resumed.',
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: '❌ Failed to clear custom status. Bot may not be ready.',
        ephemeral: true
      });
    }
  }
};