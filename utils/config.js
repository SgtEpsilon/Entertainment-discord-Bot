// utils/config.js
const fs = require('fs');
const config = require('../config.json');

function getGuildConfig(guildId) {
  if (!config.guilds[guildId]) {
    config.guilds[guildId] = {
      channelId: null,
      liveRoleId: null,
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

function saveConfig() {
  try {
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
}

function deleteGuildConfig(guildId) {
  if (config.guilds[guildId]) {
    delete config.guilds[guildId];
    saveConfig();
    return true;
  }
  return false;
}

/**
 * Resolve the Discord channel to post a Twitch notification to.
 * Priority: per-streamer channel > guild fallback channel
 */
function resolveStreamerChannel(guildConfig, username) {
  return guildConfig.twitch.streamerChannels?.[username] || guildConfig.channelId;
}

/**
 * Resolve the Discord channel to post a YouTube notification to.
 * Priority: per-YT-channel setting > guild fallback channel
 */
function resolveYouTubeChannel(guildConfig, ytChannelId) {
  return guildConfig.youtube.channelNotifChannels?.[ytChannelId] || guildConfig.channelId;
}

module.exports = {
  getGuildConfig,
  saveConfig,
  deleteGuildConfig,
  resolveStreamerChannel,
  resolveYouTubeChannel
};
