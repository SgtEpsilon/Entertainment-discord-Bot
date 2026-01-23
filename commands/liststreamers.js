const { SlashCommandBuilder: SlashCommandBuilder4, StringSelectMenuBuilder: StringSelectMenuBuilder2, ActionRowBuilder: ActionRowBuilder3, EmbedBuilder: EmbedBuilder3 } = require('discord.js');
const { getGuildConfig: getGuildConfig4 } = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder4()
    .setName('liststreamers')
    .setDescription('Show all monitored Twitch streamers'),
  
  async execute(interaction, client, config) {
    const guildConfig = getGuildConfig4(interaction.guildId);
    
    if (guildConfig.twitch.usernames.length === 0) {
      return interaction.reply('📋 No streamers are currently being monitored.');
    }
    
    const embed = new EmbedBuilder3()
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
    
    const options = guildConfig.twitch.usernames.slice(0, 25).map(username => {
      const hasCustomMessage = guildConfig.twitch.customMessages && guildConfig.twitch.customMessages[username];
      return {
        label: username,
        description: hasCustomMessage ? 'Has custom notification' : 'Using default notification',
        value: username,
        emoji: '🎮'
      };
    });
    
    const selectMenu = new StringSelectMenuBuilder2()
      .setCustomId('view-streamer-details')
      .setPlaceholder('Select a streamer for more details')
      .addOptions(options);
    
    const row = new ActionRowBuilder3().addComponents(selectMenu);
    
    const response = await interaction.reply({
      embeds: [embed],
      components: [row],
      fetchReply: true
    });
    
    try {
      const collector = response.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 120000
      });
      
      collector.on('collect', async i => {
        const username = i.values[0];
        const hasCustomMessage = guildConfig.twitch.customMessages && guildConfig.twitch.customMessages[username];
        
        const detailEmbed = new EmbedBuilder3()
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