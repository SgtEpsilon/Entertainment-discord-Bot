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

client.once(readyEvent, async () => {
  console.log(`Logged in as ${client.user.tag}`);
  
  // Validate Discord channel ID
  if (!process.env.DISCORD_CHANNEL_ID) {
    console.error('ERROR: DISCORD_CHANNEL_ID is not set in .env file!');
    process.exit(1);
  }
  
  // Register slash commands
  const commands = [
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
        name: 'channel_id',
        description: 'YouTube channel ID (starts with UC)',
        type: 3,
        required: true
      }]
    },
    {
      name: 'removechannel',
      description: 'Remove a YouTube channel from the monitoring list',
      options: [{
        name: 'channel_id',
        description: 'YouTube channel ID',
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
  
  // Initialize monitors with channel ID from .env
  const configWithChannel = {
    ...config,
    discord: { channelId: process.env.DISCORD_CHANNEL_ID }
  };
  
  twitchMonitor = new TwitchMonitor(client, configWithChannel);
  youtubeMonitor = new YouTubeMonitor(client, configWithChannel);
  
  // Start monitoring
  twitchMonitor.start();
  youtubeMonitor.start();
  
  console.log('Bot is now monitoring streams and videos!');
  console.log(`Notifications will be sent to channel: ${process.env.DISCORD_CHANNEL_ID}`);
});
});

// Handle slash commands
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName, options } = interaction;

  // Add Twitch streamer
  if (commandName === 'addstreamer') {
    const username = options.getString('username').toLowerCase();
    
    if (config.twitch.usernames.includes(username)) {
      return interaction.reply(`❌ **${username}** is already being monitored!`);
    }
    
    config.twitch.usernames.push(username);
    
    try {
      fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
      await interaction.reply(`✅ Added **${username}** to the monitoring list!`);
      console.log(`Added ${username} to Twitch monitoring`);
    } catch (error) {
      console.error('Error saving config:', error);
      await interaction.reply('❌ Error saving configuration. Please try again.');
    }
  }

  // Remove Twitch streamer
  if (commandName === 'removestreamer') {
    const username = options.getString('username').toLowerCase();
    const index = config.twitch.usernames.indexOf(username);
    
    if (index === -1) {
      return interaction.reply(`❌ **${username}** is not in the monitoring list!`);
    }
    
    config.twitch.usernames.splice(index, 1);
    
    try {
      fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
      await interaction.reply(`✅ Removed **${username}** from the monitoring list!`);
      console.log(`Removed ${username} from Twitch monitoring`);
    } catch (error) {
      console.error('Error saving config:', error);
      await interaction.reply('❌ Error saving configuration. Please try again.');
    }
  }

  // List Twitch streamers
  if (commandName === 'liststreamers') {
    if (config.twitch.usernames.length === 0) {
      return interaction.reply('📋 No streamers are currently being monitored.');
    }
    
    const list = config.twitch.usernames.map((u, i) => `${i + 1}. ${u}`).join('\n');
    await interaction.reply(`📋 **Currently monitoring:**\n${list}`);
  }

  // Add YouTube channel
  if (commandName === 'addchannel') {
    const channelId = options.getString('channel_id');
    
    if (!channelId.startsWith('UC') || channelId.length !== 24) {
      return interaction.reply('❌ Invalid YouTube channel ID format. It should start with "UC" and be 24 characters long.');
    }
    
    if (config.youtube.channelIds.includes(channelId)) {
      return interaction.reply(`❌ This channel is already being monitored!`);
    }
    
    config.youtube.channelIds.push(channelId);
    
    try {
      fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
      await interaction.reply(`✅ Added YouTube channel to the monitoring list!`);
      console.log(`Added ${channelId} to YouTube monitoring`);
    } catch (error) {
      console.error('Error saving config:', error);
      await interaction.reply('❌ Error saving configuration. Please try again.');
    }
  }

  // Remove YouTube channel
  if (commandName === 'removechannel') {
    const channelId = options.getString('channel_id');
    const index = config.youtube.channelIds.indexOf(channelId);
    
    if (index === -1) {
      return interaction.reply(`❌ This channel is not in the monitoring list!`);
    }
    
    config.youtube.channelIds.splice(index, 1);
    
    try {
      fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
      await interaction.reply(`✅ Removed YouTube channel from the monitoring list!`);
      console.log(`Removed ${channelId} from YouTube monitoring`);
    } catch (error) {
      console.error('Error saving config:', error);
      await interaction.reply('❌ Error saving configuration. Please try again.');
    }
  }

  // List YouTube channels
  if (commandName === 'listchannels') {
    if (config.youtube.channelIds.length === 0) {
      return interaction.reply('📋 No YouTube channels are currently being monitored.');
    }
    
    const list = config.youtube.channelIds.map((id, i) => `${i + 1}. ${id}`).join('\n');
    await interaction.reply(`📋 **Currently monitoring YouTube channels:**\n${list}`);
  }

  // Help command
  if (commandName === 'help') {
    const helpMessage = `
🤖 **Entertainment Bot - Help Menu**

**Twitch Commands:**
\`/addstreamer <username>\` - Add a Twitch streamer to monitor
\`/removestreamer <username>\` - Remove a Twitch streamer
\`/liststreamers\` - Show all monitored streamers
\`/nudgetwitch\` - Check and post current live streams

**YouTube Commands:**
\`/addchannel <channel_id>\` - Add a YouTube channel to monitor
\`/removechannel <channel_id>\` - Remove a YouTube channel
\`/listchannels\` - Show all monitored channels
\`/nudgeyt\` - Check and post latest videos

**Examples:**
\`/addstreamer username:shroud\`
\`/addchannel channel_id:UCX6OQ3DkcsbYNE6H8uQQuVA\`
\`/nudgetwitch\` - Check all monitored streamers
\`/nudgeyt\` - Check all monitored channels

**Finding YouTube Channel IDs:**
1. Go to the channel page
2. Click "About" tab
3. Click "Share Channel"
4. Copy the ID from the URL (starts with UC)

**Need more help?** Contact a server admin!
    `;
    await interaction.reply(helpMessage);
  }

  // Nudge Twitch command
  if (commandName === 'nudgetwitch') {
    await interaction.deferReply();
    
    if (configWithChannel.twitch.usernames.length === 0) {
      return interaction.editReply('❌ No Twitch streamers configured to check!');
    }

    const liveStreams = await twitchMonitor.checkSpecificStreams(configWithChannel.twitch.usernames);
    
    if (liveStreams.length === 0) {
      return interaction.editReply('📴 None of the monitored streamers are currently live.');
    }

    let response = '🔴 **Currently Live on Twitch:**\n\n';
    for (const stream of liveStreams) {
      response += `**${stream.user_name}** - ${stream.title}\n`;
      response += `Playing: ${stream.game_name}\n`;
      response += `https://twitch.tv/${stream.user_login}\n\n`;
    }

    await interaction.editReply(response);
  }

  // Nudge YouTube command
  if (commandName === 'nudgeyt') {
    await interaction.deferReply();
    
    if (configWithChannel.youtube.channelIds.length === 0) {
      return interaction.editReply('❌ No YouTube channels configured to check!');
    }

    const latestVideos = await youtubeMonitor.checkSpecificChannels(configWithChannel.youtube.channelIds);
    
    if (latestVideos.length === 0) {
      return interaction.editReply('📴 No recent videos found for monitored channels.');
    }

    let response = '📺 **Latest YouTube Videos:**\n\n';
    for (const video of latestVideos) {
      response += `**${video.snippet.channelTitle}**\n`;
      response += `${video.snippet.title}\n`;
      response += `https://www.youtube.com/watch?v=${video.id.videoId}\n\n`;
    }

    await interaction.editReply(response);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);