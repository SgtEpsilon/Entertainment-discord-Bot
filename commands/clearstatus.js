const { SlashCommandBuilder: SlashCommandBuilder4, PermissionFlagsBits: PermissionFlagsBits2 } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder4()
    .setName('clearstatus')
    .setDescription('Clear custom status and resume rotation')
    .setDefaultMemberPermissions(PermissionFlagsBits2.Administrator),

  async execute(interaction, client) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits2.Administrator)) {
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
