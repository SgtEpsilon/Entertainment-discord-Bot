// index.js
require('dotenv').config();
const Discord = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');
const TwitchMonitor = require('./modules/twitch');
const YouTubeMonitor = require('./modules/youtube');
const { getGuildConfig, saveConfig, deleteGuildConfig } = require('./utils/config');

const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.MessageContent,
    Discord.GatewayIntentBits.GuildMembers,
    Discord.GatewayIntentBits.GuildPresences
  ]
});

// Load status messages from status.json
let statusMessages = [];
try {
  const statusData = fs.readFileSync(path.join(__dirname, 'status.json'), 'utf8');
  statusMessages = JSON.parse(statusData);
  console.log(`Loaded ${statusMessages.length} status message(s) from status.json`);
} catch (error) {
  console.warn('[WARNING] Could not load status.json, using default status messages');
  statusMessages = [
    { type: 'WATCHING', text: 'for new streams' },
    { type: 'WATCHING', text: 'Twitch streamers' },
    { type: 'WATCHING', text: 'YouTube uploads' },
    { type: 'PLAYING', text: 'with notifications' },
    { type: 'LISTENING', text: 'to stream alerts' },
    { type: 'STREAMING', text: 'live updates', url: 'https://twitch.tv' }
  ];
}

// Custom status management
let customStatusActive = false;
let statusInterval = null;

function setStatus(client, type, text, url = null) {
  const typeMap = {
    PLAYING: Discord.ActivityType.Playing,
    STREAMING: Discord.ActivityType.Streaming,
    LISTENING: Discord.ActivityType.Listening,
    WATCHING: Discord.ActivityType.Watching,
    COMPETING: Discord.ActivityType.Competing
  };

  const activityOptions = {
    name: text,
    type: typeMap[type] ?? Discord.ActivityType.Playing
  };

  if (url) activityOptions.url = url;

  client.user.setPresence({
    activities: [activityOptions],
    status: 'online'
  });
}

function setRandomStatus(client) {
  if (customStatusActive || statusMessages.length === 0) return;
  const status = statusMessages[Math.floor(Math.random() * statusMessages.length)];
  setStatus(client, status.type, status.text, status.url);
}

function setCustomStatus(type, text, url = null) {
  if (!client.user) return false;
  customStatusActive = true;
  setStatus(client, type, text, url);
  console.log(`✅ Custom status set: ${type} - ${text}`);
  return true;
}

function clearCustomStatus() {
  if (!client.user) return false;
  customStatusActive = false;
  setRandomStatus(client);
  console.log('✅ Custom status cleared, rotation resumed');
  return true;
}

function reloadStatuses(newStatuses) {
  statusMessages = newStatuses;
  console.log(`✅ Status messages reloaded: ${newStatuses.length} statuses`);
}

client.setCustomStatus = setCustomStatus;
client.clearCustomStatus = clearCustomStatus;
client.getCustomStatusActive = () => customStatusActive;
client.reloadStatuses = reloadStatuses;

// Load commands
client.commands = new Discord.Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    console.log(`Loaded command: ${command.data.name}`);
  } else {
    console.warn(`[WARNING] Command at ${filePath} is missing "data" or "execute" property.`);
  }
}

let twitchMonitor;
let youtubeMonitor;

client.once('clientReady', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  setRandomStatus(client);
  statusInterval = setInterval(() => setRandomStatus(client), 30000);

  try {
    console.log('Registering slash commands...');
    await client.application.commands.set(client.commands.map(cmd => cmd.data));
    console.log('Slash commands registered successfully!');
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }

  twitchMonitor = new TwitchMonitor(client, config);
  youtubeMonitor = new YouTubeMonitor(client, config);

  twitchMonitor.start();
  youtubeMonitor.start();

  console.log('Bot is now monitoring streams and videos!');
  console.log(`Configured for ${Object.keys(config.guilds).length} guild(s)`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client, config, { twitchMonitor, youtubeMonitor });
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}:`, error);
    const errorMessage = '❌ There was an error executing this command!';
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMessage, ephemeral: true });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
});

client.on('guildDelete', async (guild) => {
  const deleted = deleteGuildConfig(guild.id);
  console.log(deleted
    ? `✅ Bot removed from guild: ${guild.name} (${guild.id}). Config deleted.`
    : `⚠️ Bot removed from guild: ${guild.name} (${guild.id}). No config found.`
  );
});

client.login(process.env.DISCORD_BOT_TOKEN);
