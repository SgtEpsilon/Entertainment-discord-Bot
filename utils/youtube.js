// utils/youtube.js
const axios = require('axios');

// Extract YouTube channel ID from various formats (URL, @handle, or ID)
async function extractYouTubeChannelId(input) {
  // If it's already a channel ID (UC... format)
  if (input.startsWith('UC') && input.length === 24) {
    return input;
  }
  
  // If it's a @handle
  if (input.startsWith('@')) {
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

module.exports = {
  extractYouTubeChannelId
};