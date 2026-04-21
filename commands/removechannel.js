// commands/removechannel.js
const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig, saveConfig } = require('../utils/config');
const axios = require('axios');
const { parseString } = require('xml2js');
const util = require('util');

const parseXML = util.promisify(parseString);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removechannel')
    .setDescription('Remove a YouTube channel from the monitoring list')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client, config) {
    const guildConfig = getGuildConfig(interaction.guildId);

    if (guildConfig.youtube.channelIds.length === 0) {
      return interaction.reply('📋 No YouTube channels are currently being monitored.');
    }

    await interaction.deferReply();

    const channelOptions = [];

    for (const channelId of guildConfig.youtube.channelIds) {
      try {
        const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
        const response = await axios.get(rssUrl, { timeout: 5000 });
        const result = await parseXML(response.data);

        let channelTitle = 'Unknown Channel';
        if (result.feed?.author?.[0]) channelTitle = result.feed.author[0].name[0];

        const hasChannel = guildConfig.youtube.channelNotifChannels?.[channelId];
        channelOptions.push({
          label: channelTitle.substring(0, 100),
          description: hasChannel ? `→ <#${hasChannel}>` : channelId,
          value: channelId
        });
      } catch (error) {
        channelOptions.push({ label: 'Unknown Channel', description: channelId, value: channelId });
      }
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('remove-channel-select')
      .setPlaceholder('Select a channel to remove')
      .addOptions(channelOptions);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const response = await interaction.editReply({
      content: '🗑️ **Select a YouTube channel to remove:**',
      components: [row]
    });

    try {
      const collector = response.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 60000
      });

      collector.on('collect', async i => {
        const channelId = i.values[0];
        const index = guildConfig.youtube.channelIds.indexOf(channelId);

        if (index !== -1) {
          guildConfig.youtube.channelIds.splice(index, 1);
          if (guildConfig.youtube.channelNotifChannels?.[channelId]) delete guildConfig.youtube.channelNotifChannels[channelId];

          if (saveConfig()) {
            await i.update({
              content: `✅ Removed YouTube channel from the monitoring list!\nChannel ID: \`${channelId}\`\nRemaining channels: ${guildConfig.youtube.channelIds.length}`,
              components: []
            });
            console.log(`Guild ${interaction.guildId} removed ${channelId} from YouTube monitoring`);
          } else {
            await i.update({ content: '❌ Error saving configuration. Please try again.', components: [] });
          }
        }
        collector.stop();
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time') {
          interaction.editReply({ content: '⏱️ Selection timed out.', components: [] }).catch(console.error);
        }
      });
    } catch (error) {
      console.error('Error handling channel removal:', error);
    }
  }
};
