// utils/config.js
const fs = require('fs');
const config = require('../config.json');

// Get or create guild configuration
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

// Save configuration to file
function saveConfig() {
  try {
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
}

// Delete guild configuration when bot is removed
function deleteGuildConfig(guildId) {
  if (config.guilds[guildId]) {
    delete config.guilds[guildId];
    saveConfig();
    return true;
  }
  return false;
}

module.exports = {
  getGuildConfig,
  saveConfig,
  deleteGuildConfig
};