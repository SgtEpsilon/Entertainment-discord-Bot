// index.js
require('dotenv').config();
const Discord = require('discord.js');
const fs = require('fs');
const config = require('./config.json');
const TwitchMonitor = require('./modules/twitch');
const YouTubeMonitor = require('./modules/youtube');

// Support both discord.js v13 and v14+
const client = new Discord.Client({
  intents: Discord.GatewayIntentBits ? [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.MessageContent
  ] : [
    Discord.Intents.FLAGS.GUILDS,
    Discord.Intents.FLAGS.GUILD_MESSAGES
  ]
});

let twitchMonitor;
let youtubeMonitor;

// Use clientReady for v14.16+, fallback to ready for older versions
const readyEvent = client.events?.ready ? 'clientReady' : 'ready';

// Helper function to get guild config
function getGuildConfig(guildId) {
  if (!config.guilds[guildId]) {
    config.guilds[guildId] = {
      channelId: null,
      twitch: {
        usernames: [],
        checkInterval: 60000,
        message: "🔴 {username} is now live on Twitch!\n**{title}**\nPlaying: {game}"
      },
      youtube: {
        channelIds: [],
        checkInterval: 300000,
        message: "📺 {channel} just uploaded a new video!\n**{title}**"
      }
    };
    saveConfig();
  }
  return config.guilds[guildId];
}

// Helper function to save config
function saveConfig() {
  try {
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
}

// Helper function to extract YouTube channel ID from various formats
async function extractYouTubeChannelId(input) {
  const axios = require('axios');
  
  // If it's already a channel ID (UC... format)
  if (input.startsWith('UC') && input.length === 24) {
    return input;
  }
  
  // If it's a @handle
  if (input.startsWith('@')) {
    const handle = input.substring(1); // Remove @
    try {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          part: 'snippet',
          q: input,
          type: 'channel',
          maxResults: 1,
          key: process.env.YOUTUBE_API_KEY
        }
      });
      
      if (response.data.items && response.data.items.length > 0) {
        return response.data.items[0].snippet.channelId;
      }
    } catch (error) {
      console.error('Error looking up YouTube handle:', error.message);
      return null;
    }
  }
  
  // If it's a URL
  if (input.includes('youtube.com') || input.includes('youtu.be')) {
    // Extract from youtube.com/channel/UC...
    const channelMatch = input.match(/youtube\.com\/channel\/(UC[\w-]{22})/);
    if (channelMatch) {
      return channelMatch[1];
    }
    
    // Extract from youtube.com/@handle or youtube.com/c/... or youtube.com/user/...
    const handleMatch = input.match(/youtube\.com\/@([\w-]+)/);
    const cMatch = input.match(/youtube\.com\/c\/([\w-]+)/);
    const userMatch = input.match(/youtube\.com\/user\/([\w-]+)/);
    
    const username = handleMatch?.[1] || cMatch?.[1] || userMatch?.[1];
    
    if (username) {
      try {
        // Try to get channel ID from username/handle
        const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
          params: {
            part: 'snippet',
            q: username,
            type: 'channel',
            maxResults: 1,
            key: process.env.YOUTUBE_API_KEY
          }
        });
        
        if (response.data.items && response.data.items.length > 0) {
          return response.data.items[0].snippet.channelId;
        }
      } catch (error) {
        console.error('Error looking up YouTube channel:', error.message);
        return null;
      }
    }
  }
  
  return null;
}

client.once(readyEvent, async () => {
  console.log(`Logged in as ${client.user.tag}`);
  
  // Register slash commands
  const commands = [
    {
      name: 'setup',
      description: 'Set the notification channel for this server',
      options: [{
        name: 'channel',
        description: 'The channel to send notifications to',
        type: 7, // CHANNEL type
        required: true
      }]
    },
    {
      name: 'addstreamer',
      description: 'Add a Twitch streamer to the monitoring list',
      options: [{
        name: 'username',
        description: 'Twitch username',
        type: 3, // STRING type
        required: true
      }]
    },
    {
      name: 'removestreamer',
      description: 'Remove a Twitch streamer from the monitoring list',
      options: [{
        name: 'username',
        description: 'Twitch username',
        type: 3,
        required: true
      }]
    },
    {
      name: 'liststreamers',
      description: 'Show all monitored Twitch streamers'
    },
    {
      name: 'addchannel',
      description: 'Add a YouTube channel to the monitoring list',
      options: [{
        name: 'channel',
        description: 'YouTube channel URL, @handle, or channel ID (UC...)',
        type: 3,
        required: true
      }]
    },
    {
      name: 'removechannel',
      description: 'Remove a YouTube channel from the monitoring list',
      options: [{
        name: 'channel',
        description: 'YouTube channel URL, @handle, or channel ID (UC...)',
        type: 3,
        required: true
      }]
    },
    {
      name: 'listchannels',
      description: 'Show all monitored YouTube channels'
    },
    {
      name: 'nudgetwitch',
      description: 'Check and post current live Twitch streams'
    },
    {
      name: 'nudgeyt',
      description: 'Check and post latest YouTube videos'
    },
    {
      name: 'help',
      description: 'Show all available commands'
    }
  ];

  try {
    console.log('Registering slash commands...');
    await client.application.commands.set(commands);
    console.log('Slash commands registered successfully!');
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }
  
  // Initialize monitors
  twitchMonitor = new TwitchMonitor(client, config);
  youtubeMonitor = new YouTubeMonitor(client, config);
  
  // Start monitoring
  twitchMonitor.start();
  youtubeMonitor.start();
  
  console.log('Bot is now monitoring streams and videos!');
  console.log(`Configured for ${Object.keys(config.guilds).length} guild(s)`);
});

// Handle slash commands
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName, options, guildId } = interaction;
  const guildConfig = getGuildConfig(guildId);

  // Setup command
  if (commandName === 'setup') {
    const channel = options.getChannel('channel');
    
    if (!channel.isTextBased()) {
      return interaction.reply('❌ Please select a text channel!');
    }
    
    guildConfig.channelId = channel.id;
    
    if (saveConfig()) {
      await interaction.reply(`✅ Notification channel set to ${channel}!`);
      console.log(`Guild ${guildId} set channel to ${channel.id}`);
    } else {
      await interaction.reply('❌ Error saving configuration. Please try again.');
    }
  }

  // Add Twitch streamer
  if (commandName === 'addstreamer') {
    const username = options.getString('username').toLowerCase();
    
    if (guildConfig.twitch.usernames.includes(username)) {
      return interaction.reply(`❌ **${username}** is already being monitored!`);
    }
    
    guildConfig.twitch.usernames.push(username);
    
    if (saveConfig()) {
      await interaction.reply(`✅ Added **${username}** to the monitoring list!`);
      console.log(`Guild ${guildId} added ${username} to Twitch monitoring`);
    } else {
      await interaction.reply('❌ Error saving configuration. Please try again.');
    }
  }

  // Remove Twitch streamer
  if (commandName === 'removestreamer') {
    const username = options.getString('username').toLowerCase();
    const index = guildConfig.twitch.usernames.indexOf(username);
    
    if (index === -1) {
      return interaction.reply(`❌ **${username}** is not in the monitoring list!`);
    }
    
    guildConfig.twitch.usernames.splice(index, 1);
    
    if (saveConfig()) {
      await interaction.reply(`✅ Removed **${username}** from the monitoring list!`);
      console.log(`Guild ${guildId} removed ${username} from Twitch monitoring`);
    } else {
      await interaction.reply('❌ Error saving configuration. Please try again.');
    }
  }

  // List Twitch streamers
  if (commandName === 'liststreamers') {
    if (guildConfig.twitch.usernames.length === 0) {
      return interaction.reply('📋 No streamers are currently being monitored.');
    }
    
    const list = guildConfig.twitch.usernames.map((u, i) => `${i + 1}. ${u}`).join('\n');
    await interaction.reply(`📋 **Currently monitoring:**\n${list}`);
  }

  // Add YouTube channel
  if (commandName === 'addchannel') {
    const input = options.getString('channel').trim();
    
    // Extract channel ID from various formats
    let channelId = await extractYouTubeChannelId(input);
    
    if (!channelId) {
      return interaction.reply('❌ Invalid YouTube channel. Please provide a channel URL (youtube.com/channel/... or youtube.com/@...), @handle, or channel ID (UC...).');
    }
    
    if (guildConfig.youtube.channelIds.includes(channelId)) {
      return interaction.reply(`❌ This channel is already being monitored!`);
    }
    
    guildConfig.youtube.channelIds.push(channelId);
    
    if (saveConfig()) {
      await interaction.reply(`✅ Added YouTube channel to the monitoring list!\nChannel ID: ${channelId}`);
      console.log(`Guild ${guildId} added ${channelId} to YouTube monitoring`);
    } else {
      await interaction.reply('❌ Error saving configuration. Please try again.');
    }
  }

  // Remove YouTube channel
  if (commandName === 'removechannel') {
    const input = options.getString('channel').trim();
    
    // Extract channel ID from various formats
    let channelId = await extractYouTubeChannelId(input);
    
    if (!channelId) {
      return interaction.reply('❌ Invalid YouTube channel. Please provide a channel URL, @handle, or channel ID.');
    }
    
    const index = guildConfig.youtube.channelIds.indexOf(channelId);
    
    if (index === -1) {
      return interaction.reply(`❌ This channel is not in the monitoring list!`);
    }
    
    guildConfig.youtube.channelIds.splice(index, 1);
    
    if (saveConfig()) {
      await interaction.reply(`✅ Removed YouTube channel from the monitoring list!`);
      console.log(`Guild ${guildId} removed ${channelId} from YouTube monitoring`);
    } else {
      await interaction.reply('❌ Error saving configuration. Please try again.');
    }
  }

  // List YouTube channels
  if (commandName === 'listchannels') {
    if (guildConfig.youtube.channelIds.length === 0) {
      return interaction.reply('📋 No YouTube channels are currently being monitored.');
    }
    
    const list = guildConfig.youtube.channelIds.map((id, i) => `${i + 1}. ${id}`).join('\n');
    await interaction.reply(`📋 **Currently monitoring YouTube channels:**\n${list}`);
  }

  // Nudge Twitch command
  if (commandName === 'nudgetwitch') {
    await interaction.deferReply();
    
    if (!guildConfig.channelId) {
      return interaction.editReply('❌ Please set up a notification channel first using `/setup`!');
    }
    
    if (guildConfig.twitch.usernames.length === 0) {
      return interaction.editReply('❌ No Twitch streamers configured to check!');
    }

    const liveStreams = await twitchMonitor.checkSpecificStreams(guildConfig.twitch.usernames);
    
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

  // Nudge YouTube command
  if (commandName === 'nudgeyt') {
    await interaction.deferReply();
    
    if (!guildConfig.channelId) {
      return interaction.editReply('❌ Please set up a notification channel first using `/setup`!');
    }
    
    if (guildConfig.youtube.channelIds.length === 0) {
      return interaction.editReply('❌ No YouTube channels configured to check!');
    }

    const latestVideos = await youtubeMonitor.checkSpecificChannels(guildConfig.youtube.channelIds);
    
    if (latestVideos.length === 0) {
      return interaction.editReply('📴 No recent videos found for monitored channels.');
    }

    // Post to the designated channel
    try {
      const notificationChannel = await client.channels.fetch(guildConfig.channelId);
      
      for (const video of latestVideos) {
        const message = guildConfig.youtube.message
          .replace('{channel}', video.snippet.channelTitle)
          .replace('{title}', video.snippet.title);

        const videoUrl = `https://www.youtube.com/watch?v=${video.id.videoId}`;
        await notificationChannel.send(`${message}\n${videoUrl}`);
      }

      await interaction.editReply(`✅ Posted ${latestVideos.length} video(s) to ${notificationChannel}!`);
    } catch (error) {
      console.error('Error posting to channel:', error);
      await interaction.editReply('❌ Error posting to the notification channel!');
    }
  }

  // Help command
  if (commandName === 'help') {
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
});

client.login(process.env.DISCORD_BOT_TOKEN);