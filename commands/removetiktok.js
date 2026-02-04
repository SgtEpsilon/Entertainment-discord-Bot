const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig, saveConfig } = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removetiktok')
    .setDescription('Remove a TikTok account from the monitoring list')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  async execute(interaction, client, config) {
    const guildConfig = getGuildConfig(interaction.guildId);
    
    if (!guildConfig.tiktok || guildConfig.tiktok.usernames.length === 0) {
      return interaction.reply({ content: '📋 No TikTok accounts are currently being monitored.', ephemeral: true });
    }
    
    const options = guildConfig.tiktok.usernames.slice(0, 25).map(username => {
      const hasCustomMessage = guildConfig.tiktok.customMessages && guildConfig.tiktok.customMessages[username];
      return {
        label: `@${username}`,
        description: hasCustomMessage ? 'Has custom notification' : 'Using default notification',
        value: username,
        emoji: '🎵'
      };
    });
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('remove-tiktok-select')
      .setPlaceholder('Select a TikTok account to remove')
      .addOptions(options);
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    const response = await interaction.reply({
      content: '🗑️ **Select a TikTok account to remove:**',
      components: [row],
      fetchReply: true,
      ephemeral: true
    });
    
    try {
      const collector = response.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 60000
      });
      
      collector.on('collect', async i => {
        const username = i.values[0];
        const index = guildConfig.tiktok.usernames.indexOf(username);
        
        if (index !== -1) {
          guildConfig.tiktok.usernames.splice(index, 1);
          
          if (guildConfig.tiktok.customMessages && guildConfig.tiktok.customMessages[username]) {
            delete guildConfig.tiktok.customMessages[username];
          }
          
          if (saveConfig()) {
            await i.update({
              content: `✅ Removed **@${username}** from the TikTok monitoring list!\n\nRemaining accounts: ${guildConfig.tiktok.usernames.length}`,
              components: []
            });
            console.log(`Guild ${interaction.guildId} removed @${username} from TikTok monitoring`);
          } else {
            await i.update({
              content: '❌ Error saving configuration. Please try again.',
              components: []
            });
          }
        }
        
        collector.stop();
      });
      
      collector.on('end', (collected, reason) => {
        if (reason === 'time') {
          interaction.editReply({
            content: '⏱️ Selection timed out.',
            components: []
          }).catch(console.error);
        }
      });
      
    } catch (error) {
      console.error('Error handling TikTok account removal:', error);
      await interaction.editReply({
        content: '❌ An error occurred. Please try again.',
        components: []
      });
    }
  }
};
