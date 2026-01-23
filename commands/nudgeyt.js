const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../utils/config');
const axios = require('axios');
const { parseString } = require('xml2js');
const util = require('util');

const parseXML = util.promisify(parseString);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nudgeyt')
    .setDescription('Check and post latest YouTube videos'),
  
  async execute(interaction, client, config, monitors) {
    const guildConfig = getGuildConfig(interaction.guildId);
    
    await interaction.deferReply();
    
    if (!guildConfig.channelId) {
      return interaction.editReply('❌ Please set up a notification channel first using `/setup`!');
    }
    
    if (guildConfig.youtube.channelIds.length === 0) {
      return interaction.editReply('❌ No YouTube channels configured to check!');
    }

    const latestVideos = await monitors.youtubeMonitor.checkSpecificChannels(guildConfig.youtube.channelIds);
    
    if (latestVideos.length === 0) {
      return interaction.editReply('🔴 No recent videos found for monitored channels.');
    }

    const channelNames = {};
    for (const channelId of guildConfig.youtube.channelIds) {
      try {
        const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
        const response = await axios.get(rssUrl, { timeout: 5000 });
        const result = await parseXML(response.data);
        
        if (result.feed && result.feed.author && result.feed.author[0]) {
          channelNames[channelId] = result.feed.author[0].name[0];
        }
      } catch (error) {
        console.error(`Error fetching channel name for ${channelId}:`, error.message);
      }
    }

    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('📺 Recent YouTube Videos Found')
      .setDescription(`Found ${latestVideos.length} recent video(s) from monitored channels`)
      .setTimestamp();

    latestVideos.forEach((video, index) => {
      const channelTitle = video.snippet.channelTitle;
      const videoTitle = video.snippet.title;
      const videoUrl = `https://www.youtube.com/watch?v=${video.id.videoId}`;
      
      embed.addFields({
        name: `${index + 1}. ${channelTitle}`,
        value: `[${videoTitle}](${videoUrl})`,
        inline: false
      });
    });

    const options = [
      {
        label: '✅ Post All Videos',
        description: `Post all ${latestVideos.length} video(s) to the notification channel`,
        value: 'post-all',
        emoji: '📤'
      }
    ];

    latestVideos.slice(0, 24).forEach((video, index) => {
      options.push({
        label: `${video.snippet.channelTitle}`.substring(0, 100),
        description: `${video.snippet.title}`.substring(0, 100),
        value: `video-${index}`,
        emoji: '🎬'
      });
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('nudgeyt-select')
      .setPlaceholder('Choose which videos to post')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const response = await interaction.editReply({
      embeds: [embed],
      components: [row]
    });

    try {
      const collector = response.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 120000
      });

      collector.on('collect', async i => {
        const selection = i.values[0];
        
        try {
          const notificationChannel = await client.channels.fetch(guildConfig.channelId);
          
          if (selection === 'post-all') {
            for (const video of latestVideos) {
              const message = guildConfig.youtube.message
                .replace('{channel}', video.snippet.channelTitle)
                .replace('{title}', video.snippet.title);

              const videoUrl = `https://www.youtube.com/watch?v=${video.id.videoId}`;
              await notificationChannel.send(`${message}\n${videoUrl}`);
            }

            await i.update({
              content: `✅ Posted all ${latestVideos.length} video(s) to ${notificationChannel}!`,
              embeds: [],
              components: []
            });
            console.log(`Manual YouTube check by ${interaction.user.tag} in guild ${interaction.guildId}: posted ${latestVideos.length} videos`);
          } else {
            const videoIndex = parseInt(selection.split('-')[1]);
            const video = latestVideos[videoIndex];

            const message = guildConfig.youtube.message
              .replace('{channel}', video.snippet.channelTitle)
              .replace('{title}', video.snippet.title);

            const videoUrl = `https://www.youtube.com/watch?v=${video.id.videoId}`;
            await notificationChannel.send(`${message}\n${videoUrl}`);

            await i.update({
              content: `✅ Posted video from **${video.snippet.channelTitle}** to ${notificationChannel}!\n\n**Title:** ${video.snippet.title}`,
              embeds: [],
              components: []
            });
            console.log(`Manual YouTube check by ${interaction.user.tag} in guild ${interaction.guildId}: posted 1 video`);
          }
        } catch (error) {
          console.error('Error posting to channel:', error);
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
            content: '⏱️ Selection timed out. No videos were posted.',
            embeds: [],
            components: []
          }).catch(console.error);
        }
      });

    } catch (error) {
      console.error('Error handling video selection:', error);
      await interaction.editReply({
        content: '❌ An error occurred. Please try again.',
        embeds: [],
        components: []
      });
    }
  }
};