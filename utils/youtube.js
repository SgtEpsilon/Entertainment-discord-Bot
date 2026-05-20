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
 * Uses multiple strategies to extract the channel ID from YouTube's HTML
 * Prioritizes most reliable sources first (RSS feed, canonical URL)
 */
async function resolveHandleToChannelId(handle) {
  try {
    // Try @handle format first
    const url = `https://www.youtube.com/@${handle}`;
    console.log(`Attempting to resolve YouTube handle: @${handle}`);
    
    const response = await axios.get(url, { 
      timeout: 10000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    const html = response.data;

    // PRIORITY 1: RSS feed link - Most reliable for the actual channel
    // This appears in <head> and always points to the correct channel
    const rssFeedMatch = html.match(/<link[^>]*type="application\/rss\+xml"[^>]*href="https?:\/\/www\.youtube\.com\/feeds\/videos\.xml\?channel_id=(UC[\w-]{22})"/);
    if (rssFeedMatch) {
      console.log(`✅ Found channel ID via RSS feed link (most reliable): ${rssFeedMatch[1]}`);
      return rssFeedMatch[1];
    }

    // PRIORITY 2: Canonical link - Very reliable
    // YouTube sets this to the channel's canonical URL
    const canonicalMatch = html.match(/<link rel="canonical" href="https?:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/);
    if (canonicalMatch) {
      console.log(`✅ Found channel ID via canonical link: ${canonicalMatch[1]}`);
      return canonicalMatch[1];
    }

    // PRIORITY 3: Meta property og:url - Also reliable
    const ogUrlMatch = html.match(/<meta property="og:url" content="https?:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/);
    if (ogUrlMatch) {
      console.log(`✅ Found channel ID via og:url meta tag: ${ogUrlMatch[1]}`);
      return ogUrlMatch[1];
    }

    // PRIORITY 4: Look in ytInitialData for browse_id
    // This is in the page's initial data and should be the main channel
    const browseIdMatch = html.match(/"browseId":"(UC[\w-]{22})"/);
    if (browseIdMatch) {
      // Verify this is in the header/channel context, not a related channel
      const contextCheck = html.substring(Math.max(0, html.indexOf(browseIdMatch[0]) - 500), html.indexOf(browseIdMatch[0]) + 100);
      if (contextCheck.includes('"header"') || contextCheck.includes('"metadata"')) {
        console.log(`✅ Found channel ID via browseId in header: ${browseIdMatch[1]}`);
        return browseIdMatch[1];
      }
    }

    // PRIORITY 5: channelId in page metadata
    // Look specifically in the metadata section
    const metadataMatch = html.match(/"metadata"[^{]*{[^}]*"channelId":"(UC[\w-]{22})"/);
    if (metadataMatch) {
      console.log(`✅ Found channel ID in metadata section: ${metadataMatch[1]}`);
      return metadataMatch[1];
    }

    // PRIORITY 6: externalId in header
    const externalIdMatch = html.match(/"header"[^{]*{[^}]*"externalId":"(UC[\w-]{22})"/);
    if (externalIdMatch) {
      console.log(`✅ Found channel ID via externalId in header: ${externalIdMatch[1]}`);
      return externalIdMatch[1];
    }

    console.warn(`⚠️ Could not extract channel ID from @${handle} page`);
    console.warn(`   Tried: RSS feed link, canonical URL, og:url, browseId, metadata, externalId`);
    return null;
  } catch (error) {
    if (error.response?.status === 404) {
      console.error(`❌ YouTube handle @${handle} not found (404)`);
    } else {
      console.error(`❌ Failed to resolve handle @${handle}: ${error.message}`);
    }
    return null;
  }
}

module.exports = {
  extractYouTubeChannelId,
  validateChannelId,
  resolveHandleToChannelId
};
