const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('listtiktoks')
    .setDescription('Show all monitored TikTok accounts'),
  
  async execute(interaction, client, config) {
    const guildConfig = getGuildConfig(interaction.guildId);
    
    if (!guildConfig.tiktok || guildConfig.tiktok.usernames.length === 0) {
      return interaction.reply({ content: '📋 No TikTok accounts are currently being monitored.', ephemeral: true });
    }
    
    const embed = new EmbedBuilder()
      .setColor('#000000')
      .setTitle('📋 Monitored TikTok Accounts')
      .setDescription(`Total: ${guildConfig.tiktok.usernames.length} account(s)`)
      .setTimestamp();
    
    const accountList = guildConfig.tiktok.usernames.map((username, index) => {
      const hasCustomMessage = guildConfig.tiktok.customMessages && guildConfig.tiktok.customMessages[username];
      return `${index + 1}. **@${username}** ${hasCustomMessage ? '(Custom notification ✨)' : ''}`;
    }).join('\n');
    
    embed.addFields({
      name: 'TikTok Accounts',
      value: accountList || 'None',
      inline: false
    });
    
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
      .setCustomId('view-tiktok-details')
      .setPlaceholder('Select an account for more details')
      .addOptions(options);
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    const response = await interaction.reply({
      embeds: [embed],
      components: [row],
      fetchReply: true,
      ephemeral: true
    });
    
    try {
      const collector = response.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 120000
      });
      
      collector.on('collect', async i => {
        const username = i.values[0];
        const hasCustomMessage = guildConfig.tiktok.customMessages && guildConfig.tiktok.customMessages[username];
        
        const detailEmbed = new EmbedBuilder()
          .setColor('#000000')
          .setTitle(`TikTok Account: @${username}`)
          .setURL(`https://www.tiktok.com/@${username}`)
          .addFields(
            { name: 'TikTok URL', value: `https://www.tiktok.com/@${username}` },
            { 
              name: 'Notification Message', 
              value: hasCustomMessage 
                ? `\`\`\`${guildConfig.tiktok.customMessages[username]}\`\`\`` 
                : `\`\`\`${guildConfig.tiktok.message}\`\`\`` 
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
      console.error('Error handling TikTok account selection:', error);
    }
  }
};
