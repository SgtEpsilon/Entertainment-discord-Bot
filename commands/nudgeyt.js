// commands/nudgeyt.js
const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { getGuildConfig, resolveYouTubeChannel } = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nudgeyt')
    .setDescription('Check and post latest YouTube videos'),

  async execute(interaction, client, config, monitors) {
    const guildConfig = getGuildConfig(interaction.guildId);

    await interaction.deferReply();

    if (guildConfig.youtube.channelIds.length === 0) {
      return interaction.editReply('❌ No YouTube channels configured to check!');
    }

    const latestVideos = await monitors.youtubeMonitor.checkSpecificChannels(guildConfig.youtube.channelIds);

    if (latestVideos.length === 0) {
      return interaction.editReply('🔴 No recent videos found for monitored channels.');
    }

    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('📺 Recent YouTube Videos Found')
      .setDescription(`Found ${latestVideos.length} recent video(s) from monitored channels`)
      .setTimestamp();

    // ✅ FIX: Use channelId from video object instead of index mapping
    latestVideos.forEach((video, index) => {
      const ytChannelId = video.snippet.channelId;  // Now included in the video object
      const notifChannelId = resolveYouTubeChannel(guildConfig, ytChannelId);
      const channelStr = notifChannelId ? `<#${notifChannelId}>` : '⚠️ No channel';
      embed.addFields({
        name: `${index + 1}. ${video.snippet.channelTitle}`,
        value: `[${video.snippet.title}](https://www.youtube.com/watch?v=${video.id.videoId})\n📢 → ${channelStr}`,
        inline: false
      });
    });

    const options = [
      { label: '✅ Post All Videos', description: `Post all ${latestVideos.length} video(s) to their configured channels`, value: 'post-all', emoji: '📤' }
    ];
    latestVideos.slice(0, 24).forEach((video, index) => {
      options.push({
        label: video.snippet.channelTitle.substring(0, 100),
        description: video.snippet.title.substring(0, 100),
        value: `video-${index}`,
        emoji: '🎬'
      });
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('nudgeyt-select')
      .setPlaceholder('Choose which videos to post')
      .addOptions(options);

    const response = await interaction.editReply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(selectMenu)] });

    try {
      const collector = response.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 120000
      });

      collector.on('collect', async i => {
        const selection = i.values[0];
        try {
          if (selection === 'post-all') {
            let posted = 0, skipped = 0;
            for (const video of latestVideos) {
              const ytChannelId = video.snippet.channelId;  // ✅ Use from video object
              const notifChannelId = resolveYouTubeChannel(guildConfig, ytChannelId);
              if (!notifChannelId) { skipped++; continue; }
              const notifChannel = await client.channels.fetch(notifChannelId);
              if (notifChannel) {
                const message = guildConfig.youtube.message
                  .replace('{channel}', video.snippet.channelTitle)
                  .replace('{title}', video.snippet.title);
                await notifChannel.send(`${message}\nhttps://www.youtube.com/watch?v=${video.id.videoId}`);
                posted++;
              }
            }
            await i.update({
              content: `✅ Posted ${posted} video(s) to their configured channels!${skipped ? ` (${skipped} skipped — no channel set)` : ''}`,
              embeds: [], components: []
            });
          } else {
            const videoIndex = parseInt(selection.split('-')[1]);
            const video = latestVideos[videoIndex];
            const ytChannelId = video.snippet.channelId;  // ✅ Use from video object
            const notifChannelId = resolveYouTubeChannel(guildConfig, ytChannelId);
            if (!notifChannelId) {
              return await i.update({ content: `❌ No notification channel configured for **${video.snippet.channelTitle}**. Use \`/addchannel\` to set one.`, embeds: [], components: [] });
            }
            const notifChannel = await client.channels.fetch(notifChannelId);
            const message = guildConfig.youtube.message
              .replace('{channel}', video.snippet.channelTitle)
              .replace('{title}', video.snippet.title);
            await notifChannel.send(`${message}\nhttps://www.youtube.com/watch?v=${video.id.videoId}`);
            await i.update({
              content: `✅ Posted video from **${video.snippet.channelTitle}** to ${notifChannel}!\n\n**Title:** ${video.snippet.title}`,
              embeds: [], components: []
            });
          }
        } catch (error) {
          console.error('Error posting video:', error);
          await i.update({ content: '❌ Error posting to the notification channel!', embeds: [], components: [] });
        }
        collector.stop();
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time') {
          interaction.editReply({ content: '⏱️ Selection timed out.', embeds: [], components: [] }).catch(console.error);
        }
      });
    } catch (error) {
      console.error('Error handling video selection:', error);
      await interaction.editReply({ content: '❌ An error occurred. Please try again.', embeds: [], components: [] });
    }
  }
};
