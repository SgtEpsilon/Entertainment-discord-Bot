#!/usr/bin/env node
// test-youtube-handle.js - Test YouTube @handle resolution
// Usage: node test-youtube-handle.js "@MrBeast"

const { extractYouTubeChannelId } = require('./utils/youtube');

async function testHandle(input) {
  console.log(`\n🔍 Testing YouTube input: "${input}"`);
  console.log('─'.repeat(60));
  
  try {
    const channelId = await extractYouTubeChannelId(input);
    
    if (channelId) {
      console.log('✅ SUCCESS!');
      console.log(`   Channel ID: ${channelId}`);
      console.log(`   Channel URL: https://youtube.com/channel/${channelId}`);
      console.log(`   RSS Feed: https://youtube.com/feeds/videos.xml?channel_id=${channelId}`);
    } else {
      console.log('❌ FAILED to resolve channel');
      console.log('   Please check:');
      console.log('   • Handle is spelled correctly');
      console.log('   • Channel exists and has an @handle');
      console.log('   • Try using the full channel URL or channel ID instead');
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
  
  console.log('─'.repeat(60));
}

// Get input from command line arguments
let input = process.argv[2];

if (!input) {
  console.log('YouTube @Handle Resolver Test');
  console.log('─'.repeat(60));
  console.log('Usage: node test-youtube-handle.js <input>');
  console.log('');
  console.log('Examples (PowerShell - use quotes around @handle):');
  console.log('  node test-youtube-handle.js "@MrBeast"');
  console.log('  node test-youtube-handle.js "@LinusTechTips"');
  console.log('  node test-youtube-handle.js roguemandogaming');
  console.log('  node test-youtube-handle.js "youtube.com/@MrBeast"');
  console.log('  node test-youtube-handle.js UCX6OQ3DkcsbYNE6H8uQQuVA');
  console.log('');
  console.log('Note: In PowerShell, @ is a special character. Use quotes!');
  console.log('─'.repeat(60));
  process.exit(1);
}

// Auto-add @ if it looks like a handle without one
if (!input.startsWith('@') && !input.startsWith('UC') && !input.includes('/') && !input.includes('.')) {
  console.log(`💡 Adding @ prefix to "${input}" → "@${input}"`);
  input = '@' + input;
}

testHandle(input);
