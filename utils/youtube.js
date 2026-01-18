// utils/youtube.js
const axios = require('axios');
const { parseString } = require('xml2js');
const util = require('util');

const parseXML = util.promisify(parseString);

/**
 * Extract YouTube channel ID from various input formats
 * Supports: Direct ID, channel URLs, @handles, RSS validation
 */
async function extractYouTubeChannelId(input) {
  // Remove whitespace
  input = input.trim();

  // Case 1: Direct channel ID (starts with UC)
  if (input.startsWith('UC') && input.length === 24) {
    // Validate by checking RSS feed
    const isValid = await validateChannelId(input);
    return isValid ? input : null;
  }

  // Case 2: Full URL with channel ID
  const channelIdMatch = input.match(/youtube\.com\/channel\/(UC[\w-]{22})/);
  if (channelIdMatch) {
    const channelId = channelIdMatch[1];
    const isValid = await validateChannelId(channelId);
    return isValid ? channelId : null;
  }

  // Case 3: @handle format or URL with @handle
  let handle = input;
  
  // Extract handle from URL
  const handleMatch = input.match(/youtube\.com\/@([\w-]+)/);
  if (handleMatch) {
    handle = handleMatch[1];
  } else if (input.startsWith('@')) {
    handle = input.substring(1);
  }

  // Try to resolve @handle to channel ID
  if (handle && handle !== input) {
    const channelId = await resolveHandleToChannelId(handle);
    if (channelId) {
      const isValid = await validateChannelId(channelId);
      return isValid ? channelId : null;
    }
  }

  // Case 4: Legacy username URL format
  const usernameMatch = input.match(/youtube\.com\/user\/([\w-]+)/);
  if (usernameMatch) {
    const username = usernameMatch[1];
    const channelId = await resolveHandleToChannelId(username);
    if (channelId) {
      const isValid = await validateChannelId(channelId);
      return isValid ? channelId : null;
    }
  }

  // Case 5: Custom URL format
  const customMatch = input.match(/youtube\.com\/c\/([\w-]+)/);
  if (customMatch) {
    const customName = customMatch[1];
    const channelId = await resolveHandleToChannelId(customName);
    if (channelId) {
      const isValid = await validateChannelId(channelId);
      return isValid ? channelId : null;
    }
  }

  return null;
}

/**
 * Validate a channel ID by checking if its RSS feed exists
 */
async function validateChannelId(channelId) {
  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const response = await axios.get(rssUrl, { timeout: 5000 });
    
    // Parse to ensure it's valid XML
    const result = await parseXML(response.data);
    return result && result.feed;
  } catch (error) {
    console.error(`Channel validation failed for ${channelId}:`, error.message);
    return false;
  }
}

/**
 * Resolve @handle or username to channel ID by scraping the channel page
 */
async function resolveHandleToChannelId(handle) {
  try {
    // Try @handle format first
    let url = `https://www.youtube.com/@${handle}`;
    let response = await axios.get(url, { 
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // Look for channel ID in the page HTML
    const channelIdMatch = response.data.match(/"channelId":"(UC[\w-]{22})"/);
    if (channelIdMatch) {
      return channelIdMatch[1];
    }

    // Also try the externalId field
    const externalIdMatch = response.data.match(/"externalId":"(UC[\w-]{22})"/);
    if (externalIdMatch) {
      return externalIdMatch[1];
    }

    // Try legacy /user/ format as fallback
    url = `https://www.youtube.com/user/${handle}`;
    response = await axios.get(url, { 
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const legacyMatch = response.data.match(/"channelId":"(UC[\w-]{22})"/);
    if (legacyMatch) {
      return legacyMatch[1];
    }

    return null;
  } catch (error) {
    console.error(`Failed to resolve handle ${handle}:`, error.message);
    return null;
  }
}

module.exports = {
  extractYouTubeChannelId,
  validateChannelId,
  resolveHandleToChannelId
};