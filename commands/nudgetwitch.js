// commands/nudgetwitch.js
const { getGuildConfig } = require('../utils/config');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');

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
        return interaction.editReply('🔭 None of the monitored streamers are currently live.');
      }
      
      // Get the notification channel
      const channel = await client.channels.fetch(guildConfig.channelId);
      if (!channel) {
        return interaction.editReply('❌ Could not find the notification channel. Please run `/setup` again.');
      }
      
      // Create embed showing live streams
      const listEmbed = new EmbedBuilder()
        .setColor('#9146FF')
        .setTitle('🔴 Live Streams Found')
        .setDescription(`Found ${liveStreams.length} live stream(s)`)
        .setTimestamp();

      liveStreams.forEach((stream, index) => {
        listEmbed.addFields({
          name: `${index + 1}. ${stream.user_name}`,
          value: `**${stream.title || 'Untitled Stream'}**\nPlaying: ${stream.game_name || 'Unknown'}\nViewers: ${stream.viewer_count.toLocaleString()}\n[Watch](https://twitch.tv/${stream.user_login})`,
          inline: false
        });
      });

      // Create dropdown options
      const options = [
        new StringSelectMenuOptionBuilder()
          .setLabel('✅ Post All Streams')
          .setDescription(`Post all ${liveStreams.length} live stream(s) to the notification channel`)
          .setValue('post-all')
          .setEmoji('📤')
      ];

      // Add individual stream options (up to 24 more)
      liveStreams.slice(0, 24).forEach((stream, index) => {
        const hasCustomMessage = guildConfig.twitch.customMessages && 
                                 guildConfig.twitch.customMessages[stream.user_login];
        
        options.push(
          new StringSelectMenuOptionBuilder()
            .setLabel(`${stream.user_name} - ${stream.game_name || 'Unknown'}`.substring(0, 100))
            .setDescription(`${stream.viewer_count.toLocaleString()} viewers${hasCustomMessage ? ' • Custom notification' : ''}`.substring(0, 100))
            .setValue(`stream-${index}`)
            .setEmoji('🎮')
        );
      });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('nudgetwitch-select')
        .setPlaceholder('Choose which streams to post')
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const response = await interaction.editReply({
        embeds: [listEmbed],
        components: [row]
      });

      // Handle selection
      const collector = response.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 120000
      });

      collector.on('collect', async i => {
        const selection = i.values[0];
        
        try {
          let postedCount = 0;

          if (selection === 'post-all') {
            // Post all streams
            for (const stream of liveStreams) {
              await postStreamNotification(stream, guildConfig, channel);
              postedCount++;
            }

            await i.update({
              content: `✅ Posted all ${postedCount} live stream(s) to ${channel}!`,
              embeds: [],
              components: []
            });
            console.log(`Manual Twitch check by ${interaction.user.tag} in guild ${interaction.guildId}: posted ${postedCount} streams`);
          } else {
            // Post individual stream
            const streamIndex = parseInt(selection.split('-')[1]);
            const stream = liveStreams[streamIndex];

            await postStreamNotification(stream, guildConfig, channel);

            await i.update({
              content: `✅ Posted **${stream.user_name}**'s stream to ${channel}!\n\n**Title:** ${stream.title || 'Untitled Stream'}\n**Game:** ${stream.game_name || 'Unknown'}\n**Viewers:** ${stream.viewer_count.toLocaleString()}`,
              embeds: [],
              components: []
            });
            console.log(`Manual Twitch check by ${interaction.user.tag} in guild ${interaction.guildId}: posted 1 stream`);
          }
        } catch (error) {
          console.error('Error posting stream:', error);
          await i.update({
            content: '❌ Error posting to the notification channel!',
            embeds: [],
            components: []
          });
        }

        collector.stop();
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time') {
          interaction.editReply({
            content: '⏱️ Selection timed out. No streams were posted.',
            embeds: [],
            components: []
          }).catch(console.error);
        }
      });
      
    } catch (error) {
      console.error('Error in nudgetwitch command:', error);
      await interaction.editReply('❌ An error occurred while checking streams. Please try again later.');
    }
  }
};

/**
 * Helper function to post a stream notification
 */
async function postStreamNotification(stream, guildConfig, channel) {
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