// index.js
require('dotenv').config();
const Discord = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');
const TwitchMonitor = require('./modules/twitch');
const YouTubeMonitor = require('./modules/youtube');
const { getGuildConfig, saveConfig, deleteGuildConfig } = require('./utils/config');

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

// Use clientReady for v14.16+, fallback to ready for older versions
const readyEvent = client.events?.ready ? 'clientReady' : 'ready';

client.once(readyEvent, async () => {
  console.log(`Logged in as ${client.user.tag}`);
  
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
  
  // Start monitoring
  twitchMonitor.start();
  youtubeMonitor.start();
  
  console.log('Bot is now monitoring streams and videos!');
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
      youtubeMonitor
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