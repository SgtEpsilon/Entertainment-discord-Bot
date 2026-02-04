// index.js
require('dotenv').config();
const Discord = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');
const TwitchMonitor = require('./modules/twitch');
const YouTubeMonitor = require('./modules/youtube');
const TikTokMonitor = require('./modules/tiktok');
const { getGuildConfig, saveConfig, deleteGuildConfig } = require('./utils/config');

// Support both discord.js v13 and v14+
const client = new Discord.Client({
  intents: Discord.GatewayIntentBits ? [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.MessageContent,
    Discord.GatewayIntentBits.GuildMembers,
    Discord.GatewayIntentBits.GuildPresences
  ] : [
    Discord.Intents.FLAGS.GUILDS,
    Discord.Intents.FLAGS.GUILD_MESSAGES,
    Discord.Intents.FLAGS.GUILD_MEMBERS,
    Discord.Intents.FLAGS.GUILD_PRESENCES
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
    { type: 'WATCHING', text: 'TikTok posts' },
    { type: 'PLAYING', text: 'with notifications' },
    { type: 'LISTENING', text: 'to stream alerts' },
    { type: 'STREAMING', text: 'live updates', url: 'https://twitch.tv' }
  ];
}

// Custom status management
let customStatusActive = false;
let statusInterval = null;

// Function to set a specific status
function setStatus(client, type, text, url = null) {
  const activityOptions = {
    name: text
  };
  
  // Handle activity type - use ActivityType enum for v14+, string for v13
  if (Discord.ActivityType) {
    activityOptions.type = Discord.ActivityType[type === 'PLAYING' ? 'Playing' : 
                                                  type === 'STREAMING' ? 'Streaming' :
                                                  type === 'LISTENING' ? 'Listening' :
                                                  type === 'WATCHING' ? 'Watching' :
                                                  type === 'COMPETING' ? 'Competing' : 'Playing'];
  } else {
    activityOptions.type = type;
  }
  
  if (url) {
    activityOptions.url = url;
  }
  
  client.user.setPresence({
    activities: [activityOptions],
    status: 'online'
  });
}

// Function to set random status
function setRandomStatus(client) {
  if (customStatusActive) {
    return; // Don't change status if custom status is active
  }
  
  if (statusMessages.length === 0) {
    console.warn('[WARNING] No status messages available');
    return;
  }
  
  const status = statusMessages[Math.floor(Math.random() * statusMessages.length)];
  setStatus(client, status.type, status.text, status.url);
}

// Function to set custom status and pause rotation
function setCustomStatus(type, text, url = null) {
  if (!client.user) {
    console.error('[ERROR] Client is not ready yet');
    return false;
  }
  
  customStatusActive = true;
  setStatus(client, type, text, url);
  console.log(`✅ Custom status set: ${type} - ${text}`);
  return true;
}

// Function to clear custom status and resume rotation
function clearCustomStatus() {
  if (!client.user) {
    console.error('[ERROR] Client is not ready yet');
    return false;
  }
  
  customStatusActive = false;
  setRandomStatus(client);
  console.log('✅ Custom status cleared, rotation resumed');
  return true;
}

// Function to reload status messages from status.json
function reloadStatuses(newStatuses) {
  statusMessages = newStatuses;
  console.log(`✅ Status messages reloaded: ${newStatuses.length} statuses`);
}

// Export functions for use in commands or external scripts
client.setCustomStatus = setCustomStatus;
client.clearCustomStatus = clearCustomStatus;
client.getCustomStatusActive = () => customStatusActive;
client.reloadStatuses = reloadStatuses;

// Collection to store commands
client.commands = new Discord.Collection();

// Load all command files
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
let tiktokMonitor;

// Use clientReady for v14.16+, fallback to ready for older versions
const readyEvent = client.events?.ready ? 'clientReady' : 'ready';

client.once(readyEvent, async () => {
  console.log(`Logged in as ${client.user.tag}`);
  
  // Set initial status
  setRandomStatus(client);
  
  // Change status every 30 seconds (30000 milliseconds)
  statusInterval = setInterval(() => setRandomStatus(client), 30000);
  
  // Register slash commands
  const commands = client.commands.map(cmd => cmd.data);

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
  tiktokMonitor = new TikTokMonitor(client, config);
  
  // Start monitoring
  twitchMonitor.start();
  youtubeMonitor.start();
  tiktokMonitor.start();
  
  console.log('Bot is now monitoring Twitch, YouTube, and TikTok!');
  console.log(`Configured for ${Object.keys(config.guilds).length} guild(s)`);
});

// Handle slash commands
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction, client, config, {
      twitchMonitor,
      youtubeMonitor,
      tiktokMonitor
    });
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

// Handle presence updates for automatic role assignment
client.on('presenceUpdate', async (oldPresence, newPresence) => {
  try {
    // Skip if no guild (DM) or no new presence
    if (!newPresence || !newPresence.guild) return;

    const guildId = newPresence.guild.id;
    const guildConfig = getGuildConfig(guildId);

    // Skip if no live role configured
    if (!guildConfig.liveRoleId) return;

    // Skip if no linked accounts configured
    if (!guildConfig.twitch || !guildConfig.twitch.linkedAccounts) return;

    const userId = newPresence.userId;
    const twitchUsername = guildConfig.twitch.linkedAccounts[userId];

    // Skip if user hasn't linked their Twitch account
    if (!twitchUsername) return;

    const member = newPresence.member;
    if (!member) return;

    const role = await newPresence.guild.roles.fetch(guildConfig.liveRoleId);
    if (!role) {
      console.log(`Live role ${guildConfig.liveRoleId} not found in guild ${guildId}`);
      return;
    }

    // Check if user is now streaming
    const isStreaming = newPresence.activities.some(activity => {
      // Use ActivityType enum for v14+, string for v13
      const streamingType = Discord.ActivityType ? Discord.ActivityType.Streaming : 'STREAMING';
      
      // Check if activity is streaming and it's on Twitch
      if (activity.type === streamingType) {
        // Check if the streaming URL contains twitch.tv or if the platform is Twitch
        const url = activity.url?.toLowerCase() || '';
        const name = activity.name?.toLowerCase() || '';
        return url.includes('twitch.tv') || name === 'twitch';
      }
      return false;
    });

    const wasStreaming = oldPresence?.activities.some(activity => {
      const streamingType = Discord.ActivityType ? Discord.ActivityType.Streaming : 'STREAMING';
      if (activity.type === streamingType) {
        const url = activity.url?.toLowerCase() || '';
        const name = activity.name?.toLowerCase() || '';
        return url.includes('twitch.tv') || name === 'twitch';
      }
      return false;
    }) || false;

    // User started streaming on Twitch
    if (isStreaming && !wasStreaming) {
      if (!member.roles.cache.has(role.id)) {
        await member.roles.add(role);
        console.log(`✅ Auto-assigned live role to ${member.user.tag} (linked: ${twitchUsername}) - started streaming`);
      }
    }
    // User stopped streaming on Twitch
    else if (!isStreaming && wasStreaming) {
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
        console.log(`❌ Auto-removed live role from ${member.user.tag} (linked: ${twitchUsername}) - stopped streaming`);
      }
    }
  } catch (error) {
    console.error('Error handling presence update:', error);
  }
});

// Handle bot removal from guild - delete config
client.on('guildDelete', async (guild) => {
  const deleted = deleteGuildConfig(guild.id);
  if (deleted) {
    console.log(`✅ Bot removed from guild: ${guild.name} (${guild.id}). Config deleted.`);
  } else {
    console.log(`⚠️ Bot removed from guild: ${guild.name} (${guild.id}). No config found.`);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
