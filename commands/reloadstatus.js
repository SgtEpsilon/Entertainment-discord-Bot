const { SlashCommandBuilder: SlashCommandBuilder2, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder2()
    .setName('reloadstatus')
    .setDescription('Reload status messages from status.json without restarting the bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      return await interaction.reply({
        content: '❌ You need Administrator permission to use this command.',
        ephemeral: true
      });
    }

    try {
      const statusPath = path.join(__dirname, '..', 'status.json');
      
      if (!fs.existsSync(statusPath)) {
        return await interaction.reply({
          content: '❌ status.json file not found!',
          ephemeral: true
        });
      }

      const statusData = fs.readFileSync(statusPath, 'utf8');
      const newStatuses = JSON.parse(statusData);

      if (!Array.isArray(newStatuses) || newStatuses.length === 0) {
        return await interaction.reply({
          content: '❌ Invalid status.json format! Must be a non-empty array of status objects.',
          ephemeral: true
        });
      }

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

        if (status.type === 'STREAMING' && !status.url) {
          return await interaction.reply({
            content: '❌ STREAMING status type requires a "url" property!',
            ephemeral: true
          });
        }
      }

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