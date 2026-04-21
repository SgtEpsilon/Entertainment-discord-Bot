// commands/nudgetwitch.js
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getGuildConfig, resolveStreamerChannel } = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nudgetwitch')
    .setDescription('Manually check for live Twitch streams and post them'),

  async execute(interaction, client, config, monitors) {
    await interaction.deferReply();

    const guildConfig = getGuildConfig(interaction.guildId);

    if (guildConfig.twitch.usernames.length === 0) {
      return interaction.editReply('📋 No Twitch streamers are currently being monitored. Use `/addstreamer` to add some!');
    }

    try {
      const liveStreams = await monitors.twitchMonitor.checkSpecificStreamers(guildConfig.twitch.usernames);

      if (liveStreams.length === 0) {
        return interaction.editReply('🔭 None of the monitored streamers are currently live.');
      }

      const listEmbed = new EmbedBuilder()
        .setColor('#9146FF')
        .setTitle('🔴 Live Streams Found')
        .setDescription(`Found ${liveStreams.length} live stream(s)`)
        .setTimestamp();

      liveStreams.forEach((stream, index) => {
        const notifChannelId = resolveStreamerChannel(guildConfig, stream.user_login);
        const channelStr = notifChannelId ? `<#${notifChannelId}>` : '⚠️ No channel';
        listEmbed.addFields({
          name: `${index + 1}. ${stream.user_name}`,
          value: `**${stream.title || 'Untitled Stream'}**\nPlaying: ${stream.game_name || 'Unknown'} • Viewers: ${stream.viewer_count.toLocaleString()}\n📢 → ${channelStr}\n[Watch](https://twitch.tv/${stream.user_login})`,
          inline: false
        });
      });

      const options = [
        { label: '✅ Post All Streams', description: `Post all ${liveStreams.length} stream(s) to their configured channels`, value: 'post-all', emoji: '📤' }
      ];
      liveStreams.slice(0, 24).forEach((stream, index) => {
        const notifChannelId = resolveStreamerChannel(guildConfig, stream.user_login);
        options.push({
          label: `${stream.user_name} - ${stream.game_name || 'Unknown'}`.substring(0, 100),
          description: `${stream.viewer_count.toLocaleString()} viewers • → ${notifChannelId ? `#channel` : 'No channel set'}`.substring(0, 100),
          value: `stream-${index}`,
          emoji: '🎮'
        });
      });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('nudgetwitch-select')
        .setPlaceholder('Choose which streams to post')
        .addOptions(options);

      const response = await interaction.editReply({ embeds: [listEmbed], components: [new ActionRowBuilder().addComponents(selectMenu)] });

      const collector = response.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 120000
      });

      collector.on('collect', async i => {
        const selection = i.values[0];
        try {
          if (selection === 'post-all') {
            let posted = 0, skipped = 0;
            for (const stream of liveStreams) {
              const notifChannelId = resolveStreamerChannel(guildConfig, stream.user_login);
              if (!notifChannelId) { skipped++; continue; }
              const channel = await client.channels.fetch(notifChannelId);
              if (channel) { await postStreamNotification(stream, guildConfig, channel); posted++; }
            }
            await i.update({
              content: `✅ Posted ${posted} stream(s) to their configured channels!${skipped ? ` (${skipped} skipped — no channel set)` : ''}`,
              embeds: [], components: []
            });
          } else {
            const stream = liveStreams[parseInt(selection.split('-')[1])];
            const notifChannelId = resolveStreamerChannel(guildConfig, stream.user_login);
            if (!notifChannelId) {
              return await i.update({ content: `❌ No notification channel configured for **${stream.user_name}**. Use \`/addstreamer\` to set one.`, embeds: [], components: [] });
            }
            const channel = await client.channels.fetch(notifChannelId);
            await postStreamNotification(stream, guildConfig, channel);
            await i.update({
              content: `✅ Posted **${stream.user_name}**'s stream to ${channel}!\n**Title:** ${stream.title || 'Untitled'} • **Game:** ${stream.game_name || 'Unknown'} • **Viewers:** ${stream.viewer_count.toLocaleString()}`,
              embeds: [], components: []
            });
          }
        } catch (error) {
          console.error('Error posting stream:', error);
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
      console.error('Error in nudgetwitch:', error);
      await interaction.editReply('❌ An error occurred while checking streams. Please try again later.');
    }
  }
};

async function postStreamNotification(stream, guildConfig, channel) {
  const username = stream.user_login;
  let messageText = guildConfig.twitch.customMessages?.[username] || guildConfig.twitch.message;
  messageText = messageText
    .replace(/{username}/g, stream.user_name)
    .replace(/{title}/g, stream.title)
    .replace(/{game}/g, stream.game_name || 'Unknown')
    .replace(/{url}/g, `https://twitch.tv/${stream.user_login}`);

  const embed = new EmbedBuilder()
    .setColor('#9146FF')
    .setTitle(stream.title || 'Untitled Stream')
    .setURL(`https://twitch.tv/${stream.user_login}`)
    .setAuthor({ name: `${stream.user_name} is now live on Twitch!`, url: `https://twitch.tv/${stream.user_login}` })
    .setDescription(`**Playing ${stream.game_name || 'Unknown'}**`)
    .setImage(stream.thumbnail_url.replace('{width}', '1920').replace('{height}', '1080') + `?t=${Date.now()}`)
    .addFields(
      { name: '👁️ Viewers', value: stream.viewer_count.toLocaleString(), inline: true },
      { name: '🎮 Category', value: stream.game_name || 'Unknown', inline: true }
    )
    .setTimestamp()
    .setFooter({ text: 'Twitch • Manual Check' });

  const button = new ButtonBuilder()
    .setLabel('Watch Now').setStyle(ButtonStyle.Link)
    .setURL(`https://twitch.tv/${stream.user_login}`).setEmoji('🔴');

  await channel.send({ content: messageText, embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] });
}
