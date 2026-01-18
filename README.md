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
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret
YOUTUBE_API_KEY=your_youtube_api_key
```

**Note:** Channel IDs are now configured per-server using the `/setup` command!

### 6. Configure config.json

The bot now uses a **multi-guild configuration**. Each Discord server (guild) gets its own settings.

Edit `config.json` to add your server's Guild ID:

```json
{
  "guilds": {
    "YOUR_GUILD_ID": {
      "channelId": null,
      "twitch": {
        "usernames": [],
        "checkInterval": 60000,
        "message": "🔴 {username} is now live..."
      },
      "youtube": {
        "channelIds": [],
        "checkInterval": 300000,
        "message": "📺 {channel} just uploaded..."
      }
    }
  }
}
```

**To get your Guild ID:**
1. Enable Developer Mode in Discord (User Settings > Advanced > Developer Mode)
2. Right-click on your server icon
3. Click "Copy Server ID"

**Note:** You can add multiple guilds to the config. The bot will auto-create entries for new guilds when you use the `/setup` command.

### 7. Run the Bot

```bash
npm start
```

### 8. First-Time Setup in Discord

Once the bot is running, in each Discord server:

1. Run `/setup channel:#your-channel` to set where notifications will be posted
2. Use `/addstreamer` and `/addchannel` to add streamers/channels to monitor
3. Test with `/nudgetwitch` or `/nudgeyt` to see current streams/videos

## Multi-Guild Configuration

The bot supports multiple Discord servers, each with:
- **Independent notification channels**: Each server sends to its own channel
- **Separate streamer lists**: Server A can monitor different streamers than Server B
- **Custom messages**: Each server can have different notification formats
- **Auto-configuration**: New servers are automatically added when you run `/setup`

**Example:**
- Server 1 monitors: shroud, pokimane → sends to #live-streams
- Server 2 monitors: xqc, summit1g → sends to #twitch-alerts

## Features

- **Multi-Guild Support**: Each Discord server has its own separate configuration
- **Per-Server Notification Channels**: Set different channels for each server
- **Independent Streamer Lists**: Each server can monitor different streamers/channels
- **Twitch Monitoring**: Detects when streamers go live
- **YouTube Monitoring**: Detects new video uploads
- **Customizable Messages**: Configure notification format per server
- **Modular Design**: Easy to extend with new platforms
- **Automatic Token Management**: Handles Twitch OAuth tokens automatically
- **Easy Commands**: Add/remove streamers without editing config files

## Bot Commands

All commands are now **slash commands** - just type `/` in Discord to see them!

### Setup Command
- `/setup <channel>` - Set the notification channel for this server (required first step!)

### General Commands
- `/help` - Display all available commands and usage instructions

### Twitch Commands
- `/addstreamer <username>` - Add a Twitch streamer to the monitoring list
- `/removestreamer <username>` - Remove a Twitch streamer from the monitoring list
- `/liststreamers` - Show all currently monitored streamers
- `/nudgetwitch` - Check for live streams and post them to the notification channel

**Examples:**
```
/addstreamer username:shroud
/removestreamer username:ninja
/liststreamers
/nudgetwitch (posts live streams to your notification channel)
```

### YouTube Commands
- `/addchannel <channel>` - Add a YouTube channel to the monitoring list
- `/removechannel <channel>` - Remove a YouTube channel from the monitoring list
- `/listchannels` - Show all currently monitored YouTube channels
- `/nudgeyt` - Check for latest videos and post them to the notification channel

**Examples:**
```
/addchannel channel:@MrBeast
/addchannel channel:https://youtube.com/@LinusTechTips
/addchannel channel:UCX6OQ3DkcsbYNE6H8uQQuVA
/removechannel channel:@MrBeast
/listchannels
/nudgeyt (posts latest videos to your notification channel)
```

**Supported YouTube Channel Formats:**
- `@handle` - e.g., `@MrBeast`, `@LinusTechTips`
- Full URL - e.g., `https://youtube.com/@MrBeast`
- Channel URL - e.g., `https://youtube.com/channel/UCX6OQ3DkcsbYNE6H8uQQuVA`
- Channel ID - e.g., `UCX6OQ3DkcsbYNE6H8uQQuVA`

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