// index.js
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config.json');
const TwitchMonitor = require('./modules/twitch');
const YouTubeMonitor = require('./modules/youtube');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

let twitchMonitor;
let youtubeMonitor;

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  
  // Initialize monitors
  twitchMonitor = new TwitchMonitor(client, config);
  youtubeMonitor = new YouTubeMonitor(client, config);
  
  // Start monitoring
  twitchMonitor.start();
  youtubeMonitor.start();
  
  console.log('Bot is now monitoring streams and videos!');
});

client.login(process.env.DISCORD_BOT_TOKEN);