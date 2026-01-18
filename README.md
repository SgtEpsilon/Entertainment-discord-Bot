# Discord Streaming Bot

A modular Discord bot that monitors Twitch streams and YouTube channels for new content and posts notifications to a Discord channel.

## Project Structure

```
discord-bot/
├── index.js              # Main bot file
├── modules/
│   ├── twitch.js        # Twitch monitoring module
│   └── youtube.js       # YouTube monitoring module
├── config.json          # Configuration file
├── .env                 # Environment variables (API keys)
├── package.json         # Dependencies
└── README.md            # This file
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Create a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to "Bot" section and click "Add Bot"
4. Under "TOKEN", click "Reset Token" and copy it
5. Enable "MESSAGE CONTENT INTENT" under Privileged Gateway Intents (required for legacy support)
6. Go to "OAuth2" > "URL Generator"
7. Select scopes: `bot` and `applications.commands`
8. Select permissions: `Send Messages`, `View Channels`, `Use Slash Commands`
9. Copy the generated URL and invite the bot to your server

### 3. Get Twitch API Credentials

1. Go to [Twitch Developer Console](https://dev.twitch.tv/console)
2. Click "Register Your Application"
3. Set OAuth Redirect URL to `http://localhost`
4. Copy the Client ID and generate a Client Secret

### 4. Get YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable "YouTube Data API v3"
4. Go to "Credentials" and create an API key
5. Copy the API key

### 5. Configure .env File

Fill in your `.env` file with the credentials:

```env
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CHANNEL_ID=your_discord_channel_id
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret
YOUTUBE_API_KEY=your_youtube_api_key
```

**To get your Discord Channel ID:**
1. Enable Developer Mode in Discord (User Settings > Advanced > Developer Mode)
2. Right-click on the channel where you want notifications
3. Click "Copy Channel ID"

### 6. Configure config.json

Edit `config.json`:

- **twitch.usernames**: Array of Twitch usernames to monitor
- **youtube.channelIds**: Array of YouTube channel IDs (find in channel URL or About page)
- **checkInterval**: How often to check (in milliseconds)
- **message**: Customize notification messages

**Note:** The Discord channel ID is now stored in the `.env` file for better security.

### 7. Run the Bot

```bash
npm start
```

## Features

- **Twitch Monitoring**: Detects when streamers go live
- **YouTube Monitoring**: Detects new video uploads
- **Customizable Messages**: Configure notification format
- **Modular Design**: Easy to extend with new platforms
- **Automatic Token Management**: Handles Twitch OAuth tokens automatically
- **Easy Commands**: Add/remove streamers without editing config files

## Bot Commands

All commands are now **slash commands** - just type `/` in Discord to see them!

### General Commands
- `/help` - Display all available commands and usage instructions

### Twitch Commands
- `/addstreamer <username>` - Add a Twitch streamer to the monitoring list
- `/removestreamer <username>` - Remove a Twitch streamer from the monitoring list
- `/liststreamers` - Show all currently monitored streamers
- `/nudgetwitch` - Check and post all current live streams

**Examples:**
```
/addstreamer username:shroud
/removestreamer username:ninja
/liststreamers
/nudgetwitch
```

### YouTube Commands
- `/addchannel <channel_id>` - Add a YouTube channel to the monitoring list
- `/removechannel <channel_id>` - Remove a YouTube channel from the monitoring list
- `/listchannels` - Show all currently monitored YouTube channels
- `/nudgeyt` - Check and post all latest videos

**Examples:**
```
/addchannel channel_id:UCX6OQ3DkcsbYNE6H8uQQuVA
/removechannel channel_id:UCX6OQ3DkcsbYNE6H8uQQuVA
/listchannels
/nudgeyt
```

**Finding YouTube Channel IDs:**
1. Go to the channel page
2. Click "About" tab
3. Click "Share Channel" 
4. The ID is at the end of the URL (starts with "UC")
   - Or use the channel URL: `youtube.com/channel/UCxxxxxxxxxx`

## Configuration Options

### Check Intervals

- `twitch.checkInterval`: Default 60000ms (1 minute)
- `youtube.checkInterval`: Default 300000ms (5 minutes)

### Message Placeholders

**Twitch:**
- `{username}`: Streamer's display name
- `{title}`: Stream title
- `{game}`: Game being played

**YouTube:**
- `{channel}`: Channel name
- `{title}`: Video title

## Notes

- The bot stores stream states in memory, so it won't send duplicate notifications
- First run won't send notifications, it just records current state
- YouTube API has daily quota limits (10,000 units/day)
- Twitch checks are more frequent as streams change state quickly

## Troubleshooting

- **Bot not posting**: Check channel ID and bot permissions
- **Twitch not working**: Verify client ID and secret
- **YouTube not working**: Check API key and channel IDs
- **Missing notifications**: Check console for errors