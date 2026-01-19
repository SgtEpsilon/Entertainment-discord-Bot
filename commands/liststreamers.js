const { getGuildConfig } = require('../utils/config');
const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: {
    name: 'liststreamers',
    description: 'Show all monitored Twitch streamers'
  },
  
  async execute(interaction, client, config) {
    const guildConfig = getGuildConfig(interaction.guildId);
    
    if (guildConfig.twitch.usernames.length === 0) {
      return interaction.reply('📋 No streamers are currently being monitored.');
    }
    
    // Create embed
    const embed = new EmbedBuilder()
      .setColor('#9146FF')
      .setTitle('📋 Monitored Twitch Streamers')
      .setDescription(`Total: ${guildConfig.twitch.usernames.length} streamer(s)`)
      .setTimestamp();
    
    const streamerList = guildConfig.twitch.usernames.map((username, index) => {
      const hasCustomMessage = guildConfig.twitch.customMessages && guildConfig.twitch.customMessages[username];
      return `${index + 1}. **${username}** ${hasCustomMessage ? '(Custom notification ✨)' : ''}`;
    }).join('\n');
    
    embed.addFields({
      name: 'Streamers',
      value: streamerList || 'None',
      inline: false
    });
    
    // Create dropdown
    const options = guildConfig.twitch.usernames.slice(0, 25).map(username => {
      const hasCustomMessage = guildConfig.twitch.customMessages && guildConfig.twitch.customMessages[username];
      return new StringSelectMenuOptionBuilder()
        .setLabel(username)
        .setDescription(hasCustomMessage ? 'Has custom notification' : 'Using default notification')
        .setValue(username)
        .setEmoji('🎮');
    });
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('view-streamer-details')
      .setPlaceholder('Select a streamer for more details')
      .addOptions(options);
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    const response = await interaction.reply({
      embeds: [embed],
      components: [row],
      fetchReply: true
    });
    
    // Handle streamer selection
    try {
      const collector = response.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 120000
      });
      
      collector.on('collect', async i => {
        const username = i.values[0];
        const hasCustomMessage = guildConfig.twitch.customMessages && guildConfig.twitch.customMessages[username];
        
        const detailEmbed = new EmbedBuilder()
          .setColor('#9146FF')
          .setTitle(`Streamer: ${username}`)
          .setURL(`https://twitch.tv/${username}`)
          .addFields(
            { name: 'Twitch URL', value: `https://twitch.tv/${username}` },
            { 
              name: 'Notification Message', 
              value: hasCustomMessage 
                ? `\`\`\`${guildConfig.twitch.customMessages[username]}\`\`\`` 
                : `\`\`\`${guildConfig.twitch.message}\`\`\`` 
            },
            { 
              name: 'Message Type', 
              value: hasCustomMessage ? '✨ Custom' : '📝 Default' 
            }
          )
          .setTimestamp();
        
        await i.reply({
          embeds: [detailEmbed],
          ephemeral: true
        });
      });
      
      collector.on('end', () => {
        interaction.editReply({ components: [] }).catch(console.error);
      });
      
    } catch (error) {
      console.error('Error handling streamer selection:', error);
    }
  }
};