// commands/nudgetwitch.js
const { getGuildConfig } = require('../utils/config');

module.exports = {
  data: {
    name: 'nudgetwitch',
    description: 'Check and post current live Twitch streams'
  },
  
  async execute(interaction, client, config, monitors) {
    const guildConfig = getGuildConfig(interaction.guildId);
    
    await interaction.deferReply();
    
    if (!guildConfig.channelId) {
      return interaction.editReply('❌ Please set up a notification channel first using `/setup`!');
    }
    
    if (guildConfig.twitch.usernames.length === 0) {
      return interaction.editReply('❌ No Twitch streamers configured to check!');
    }

    const liveStreams = await monitors.twitchMonitor.checkSpecificStreams(guildConfig.twitch.usernames);
    
    if (liveStreams.length === 0) {
      return interaction.editReply('📴 None of the monitored streamers are currently live.');
    }

    // Post to the designated channel
    try {
      const notificationChannel = await client.channels.fetch(guildConfig.channelId);
      
      for (const stream of liveStreams) {
        const message = guildConfig.twitch.message
          .replace('{username}', stream.user_name)
          .replace('{title}', stream.title)
          .replace('{game}', stream.game_name);

        const streamUrl = `https://twitch.tv/${stream.user_login}`;
        await notificationChannel.send(`${message}\n${streamUrl}`);
      }

      await interaction.editReply(`✅ Posted ${liveStreams.length} live stream(s) to ${notificationChannel}!`);
    } catch (error) {
      console.error('Error posting to channel:', error);
      await interaction.editReply('❌ Error posting to the notification channel!');
    }
  }
};