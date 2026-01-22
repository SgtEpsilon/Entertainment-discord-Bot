// commands/reloadstatus.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reloadstatus')
    .setDescription('Reload status messages from status.json without restarting the bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    // Double-check permissions (redundant but safe)
    if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      return await interaction.reply({
        content: '❌ You need Administrator permission to use this command.',
        ephemeral: true
      });
    }

    try {
      // Check if status.json exists
      if (!fs.existsSync('./status.json')) {
        return await interaction.reply({
          content: '❌ status.json file not found!',
          ephemeral: true
        });
      }

      // Read and parse status.json
      const statusData = fs.readFileSync('./status.json', 'utf8');
      const newStatuses = JSON.parse(statusData);

      // Validate the data
      if (!Array.isArray(newStatuses) || newStatuses.length === 0) {
        return await interaction.reply({
          content: '❌ Invalid status.json format! Must be a non-empty array of status objects.',
          ephemeral: true
        });
      }

      // Validate each status object
      for (const status of newStatuses) {
        if (!status.type || !status.text) {
          return await interaction.reply({
            content: '❌ Invalid status format! Each status must have "type" and "text" properties.',
            ephemeral: true
          });
        }
        
        const validTypes = ['PLAYING', 'STREAMING', 'LISTENING', 'WATCHING', 'COMPETING'];
        if (!validTypes.includes(status.type)) {
          return await interaction.reply({
            content: `❌ Invalid status type "${status.type}"! Must be one of: ${validTypes.join(', ')}`,
            ephemeral: true
          });
        }

        // Check if STREAMING type has URL
        if (status.type === 'STREAMING' && !status.url) {
          return await interaction.reply({
            content: '❌ STREAMING status type requires a "url" property!',
            ephemeral: true
          });
        }
      }

      // Update the bot's status array
      if (typeof client.reloadStatuses === 'function') {
        client.reloadStatuses(newStatuses);
        
        await interaction.reply({
          content: `✅ Successfully reloaded ${newStatuses.length} status message${newStatuses.length !== 1 ? 's' : ''} from status.json!\n\n💡 The new statuses will take effect on the next rotation cycle.`,
          ephemeral: true
        });

        console.log(`🔄 ${interaction.user.tag} reloaded status messages (${newStatuses.length} statuses loaded)`);
      } else {
        return await interaction.reply({
          content: '❌ Bot is not ready or reload function is unavailable.',
          ephemeral: true
        });
      }
    } catch (error) {
      console.error('Error reloading status.json:', error);
      
      if (error instanceof SyntaxError) {
        return await interaction.reply({
          content: '❌ Failed to parse status.json! Check for JSON syntax errors.',
          ephemeral: true
        });
      }
      
      await interaction.reply({
        content: `❌ Failed to reload status.json: ${error.message}`,
        ephemeral: true
      });
    }
  }
};