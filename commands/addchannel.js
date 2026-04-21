// commands/addchannel.js
const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ChannelType } = require('discord.js');
const { getGuildConfig, saveConfig } = require('../utils/config');
const { extractYouTubeChannelId } = require('../utils/youtube');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addchannel')
    .setDescription('Add a YouTube channel to the monitoring list'),

  async execute(interaction, client, config) {
    const modal = new ModalBuilder()
      .setCustomId('addchannel-modal')
      .setTitle('Add YouTube Channel');

    const ytChannelInput = new TextInputBuilder()
      .setCustomId('yt-channel')
      .setLabel('YouTube Channel')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Channel URL, @handle, or channel ID (UC...)')
      .setRequired(true);

    const notifChannelInput = new TextInputBuilder()
      .setCustomId('notif-channel')
      .setLabel('Notification Channel (Optional)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g., #youtube-uploads or channel ID — leave blank for default')
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(ytChannelInput),
      new ActionRowBuilder().addComponents(notifChannelInput)
    );

    await interaction.showModal(modal);

    try {
      const submitted = await interaction.awaitModalSubmit({
        time: 300000,
        filter: i => i.user.id === interaction.user.id && i.customId === 'addchannel-modal'
      });

      await submitted.deferReply();

      const input = submitted.fields.getTextInputValue('yt-channel').trim();
      const channelRaw = submitted.fields.getTextInputValue('notif-channel').trim();

      const guildConfig = getGuildConfig(interaction.guildId);

      const channelId = await extractYouTubeChannelId(input);
      if (!channelId) {
        return submitted.editReply('❌ Invalid YouTube channel. Please provide a channel URL (youtube.com/channel/... or youtube.com/@...), @handle, or channel ID (UC...).');
      }

      if (guildConfig.youtube.channelIds.includes(channelId)) {
        return submitted.editReply('❌ This channel is already being monitored!');
      }

      // Resolve the notification channel from the text input
      let notifChannel = null;
      if (channelRaw) {
        // Strip leading # and any <#id> mention formatting
        const cleaned = channelRaw.replace(/^#/, '').replace(/^<#(\d+)>$/, '$1');
        // Try by ID first, then by name
        notifChannel =
          interaction.guild.channels.cache.get(cleaned) ||
          interaction.guild.channels.cache.find(
            c => c.type === ChannelType.GuildText && c.name.toLowerCase() === cleaned.toLowerCase()
          );

        if (!notifChannel) {
          return submitted.editReply(`❌ Could not find a text channel matching **${channelRaw}**. Use the channel name (e.g. \`youtube-uploads\`) or its ID.`);
        }
      }

      guildConfig.youtube.channelIds.push(channelId);

      if (notifChannel) {
        if (!guildConfig.youtube.channelNotifChannels) guildConfig.youtube.channelNotifChannels = {};
        guildConfig.youtube.channelNotifChannels[channelId] = notifChannel.id;
      }

      if (saveConfig()) {
        const channelInfo = notifChannel
          ? `\n📢 Notifications → <#${notifChannel.id}>`
          : guildConfig.channelId
            ? `\n📢 Notifications → <#${guildConfig.channelId}> *(fallback)*`
            : `\n⚠️ No notification channel set — run \`/setup\` or specify a channel when adding.`;

        await submitted.editReply(`✅ Added YouTube channel to the monitoring list!\nChannel ID: \`${channelId}\`${channelInfo}\n\nThe bot will check for new videos every 5 minutes.`);
        console.log(`Guild ${interaction.guildId} added ${channelId} to YouTube monitoring (channel: ${notifChannel?.id || 'fallback'})`);
      } else {
        await submitted.editReply('❌ Error saving configuration. Please try again.');
      }

    } catch (error) {
      if (error.code !== 'InteractionCollectorError') {
        console.error('Error handling modal submission:', error);
      }
    }
  }
};
