// commands/nudgetwitch.js
const { getGuildConfig } = require('../utils/config');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  data: {
    name: 'nudgetwitch',
    description: 'Manually check for live Twitch streams and post them'
  },
  
  async execute(interaction, client, config, monitors) {
    await interaction.deferReply();
    
    const guildConfig = getGuildConfig(interaction.guildId);
    
    if (!guildConfig.channelId) {
      return interaction.editReply('❌ No notification channel set! Use `/setup` first.');
    }
    
    if (guildConfig.twitch.usernames.length === 0) {
      return interaction.editReply('📋 No Twitch streamers are currently being monitored. Use `/addstreamer` to add some!');
    }
    
    try {
      // Check all streamers for this guild
      const liveStreams = await monitors.twitchMonitor.checkSpecificStreamers(guildConfig.twitch.usernames);
      
      if (liveStreams.length === 0) {
        return interaction.editReply('📭 None of the monitored streamers are currently live.');
      }
      
      // Get the notification channel
      const channel = await client.channels.fetch(guildConfig.channelId);
      if (!channel) {
        return interaction.editReply('❌ Could not find the notification channel. Please run `/setup` again.');
      }
      
      // Send notification for each live stream
      for (const stream of liveStreams) {
        const username = stream.user_login;
        
        // Check if there's a custom message for this streamer
        let messageText = guildConfig.twitch.message; // Default message
        
        if (guildConfig.twitch.customMessages && guildConfig.twitch.customMessages[username]) {
          messageText = guildConfig.twitch.customMessages[username];
        }
        
        // Replace placeholders in custom/default message
        messageText = messageText
          .replace(/{username}/g, stream.user_name)
          .replace(/{title}/g, stream.title)
          .replace(/{game}/g, stream.game_name || 'Unknown')
          .replace(/{url}/g, `https://twitch.tv/${stream.user_login}`);

        // Create embed with stream preview
        const embed = new EmbedBuilder()
          .setColor('#9146FF') // Twitch purple
          .setTitle(stream.title || 'Untitled Stream')
          .setURL(`https://twitch.tv/${stream.user_login}`)
          .setAuthor({
            name: `${stream.user_name} is now live on Twitch!`,
            iconURL: 'https://cdn.discordapp.com/attachments/your-attachment-id/twitch-icon.png',
            url: `https://twitch.tv/${stream.user_login}`
          })
          .setDescription(`**Playing ${stream.game_name || 'Unknown'}**`)
          .setImage(stream.thumbnail_url.replace('{width}', '1920').replace('{height}', '1080') + `?t=${Date.now()}`)
          .addFields(
            { name: '👁️ Viewers', value: stream.viewer_count.toLocaleString(), inline: true },
            { name: '🎮 Category', value: stream.game_name || 'Unknown', inline: true }
          )
          .setTimestamp()
          .setFooter({ text: 'Twitch • Manual Check' });

        // Create "Watch Now" button
        const button = new ButtonBuilder()
          .setLabel('Watch Now')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://twitch.tv/${stream.user_login}`)
          .setEmoji('🔴');

        const row = new ActionRowBuilder().addComponents(button);

        // Send message with embed and button
        await channel.send({
          content: messageText,
          embeds: [embed],
          components: [row]
        });
      }
      
      await interaction.editReply(`✅ Posted ${liveStreams.length} live stream(s) to ${channel}!`);
      console.log(`Manual Twitch check by ${interaction.user.tag} in guild ${interaction.guildId}: ${liveStreams.length} live`);
      
    } catch (error) {
      console.error('Error in nudgetwitch command:', error);
      await interaction.editReply('❌ An error occurred while checking streams. Please try again later.');
    }
  }
};