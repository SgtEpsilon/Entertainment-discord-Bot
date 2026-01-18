// commands/help.js
module.exports = {
  data: {
    name: 'help',
    description: 'Show all available commands'
  },
  
  async execute(interaction, client, config) {
    const helpMessage = `
🤖 **Entertainment Bot - Help Menu**

**Setup:**
\`/setup <channel>\` - Set the notification channel for this server

**Twitch Commands:**
\`/addstreamer <username>\` - Add a Twitch streamer to monitor
\`/removestreamer <username>\` - Remove a Twitch streamer
\`/liststreamers\` - Show all monitored streamers
\`/nudgetwitch\` - Check for live streams and post to notification channel

**YouTube Commands:**
\`/addchannel <channel>\` - Add a YouTube channel to monitor
\`/removechannel <channel>\` - Remove a YouTube channel
\`/listchannels\` - Show all monitored channels
\`/nudgeyt\` - Check for latest videos and post to notification channel

**Examples:**
\`/setup channel:#notifications\`
\`/addstreamer username:shroud\`
\`/addchannel channel:@MrBeast\`
\`/addchannel channel:https://youtube.com/@LinusTechTips\`
\`/addchannel channel:UCX6OQ3DkcsbYNE6H8uQQuVA\`
\`/nudgetwitch\` - Posts any live streams to your notification channel
\`/nudgeyt\` - Posts latest videos to your notification channel

**Adding YouTube Channels:**
You can use any of these formats:
• \`@handle\` (e.g., @MrBeast)
• Full URL (e.g., https://youtube.com/@LinusTechTips)
• Channel ID (e.g., UCX6OQ3DkcsbYNE6H8uQQuVA)

**Note:** Each server has its own separate configuration!
    `;
    
    await interaction.reply(helpMessage);
  }
};