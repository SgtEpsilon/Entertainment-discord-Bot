const { SlashCommandBuilder, PermissionFlagsBits, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require('discord.js');
const { getGuildConfig, saveConfig } = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removestreamer')
    .setDescription('Remove a Twitch streamer from the monitoring list')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  async execute(interaction, client, config) {
    const guildConfig = getGuildConfig(interaction.guildId);
    
    if (guildConfig.twitch.usernames.length === 0) {
      return interaction.reply('📋 No streamers are currently being monitored.');
    }
    
    // Build streamer list with chunking to avoid Discord's 1024 char limit
    const chunkSize = 1024;
    const streamerEntries = guildConfig.twitch.usernames.map((username, index) => {
      const hasCustomMessage = guildConfig.twitch.customMessages && guildConfig.twitch.customMessages[username];
      return `${index + 1}. **${username}** ${hasCustomMessage ? '(Custom notification ✨)' : ''}`;
    });
    
    // Split entries into chunks
    const chunks = [];
    let currentChunk = '';
    
    for (const entry of streamerEntries) {
      const entryWithNewline = entry + '\n';
      if ((currentChunk + entryWithNewline).length > chunkSize) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = entryWithNewline;
      } else {
        currentChunk += entryWithNewline;
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim());
    
    // Build dropdown options (max 25 for Discord)
    const options = guildConfig.twitch.usernames.slice(0, 25).map(username => {
      const hasCustomMessage = guildConfig.twitch.customMessages && guildConfig.twitch.customMessages[username];
      return new StringSelectMenuOptionBuilder()
        .setLabel(username)
        .setDescription(hasCustomMessage ? 'Has custom notification' : 'Using default notification')
        .setValue(username)
        .setEmoji('🎮');
    });
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('remove-streamer-select')
      .setPlaceholder('Select a streamer to remove')
      .addOptions(options);
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    const response = await interaction.reply({
      content: '🗑️ **Select a Twitch streamer to remove:**',
      components: [row],
      fetchReply: true
    });
    
    try {
      const collector = response.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 60000
      });
      
      collector.on('collect', async i => {
        const username = i.values[0];
        const index = guildConfig.twitch.usernames.indexOf(username);
        
        if (index !== -1) {
          guildConfig.twitch.usernames.splice(index, 1);
          
          // Also remove custom message if it exists
          if (guildConfig.twitch.customMessages && guildConfig.twitch.customMessages[username]) {
            delete guildConfig.twitch.customMessages[username];
          }
          
          if (saveConfig()) {
            await i.update({
              content: `✅ Removed **${username}** from the monitoring list!\n\nRemaining streamers: ${guildConfig.twitch.usernames.length}`,
              components: []
            });
            console.log(`Guild ${interaction.guildId} removed ${username} from Twitch monitoring`);
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
      console.error('Error handling streamer removal:', error);
      await interaction.reply({
        content: '❌ An error occurred. Please try again.',
        components: []
      });
    }
  }
};