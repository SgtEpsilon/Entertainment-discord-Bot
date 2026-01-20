# Discord Streaming Bot

A modular Discord bot that monitors Twitch streams and YouTube channels for new content, posts notifications to a Discord channel, and automatically manages live streamer roles.

## Features

- 🔴 **Twitch Stream Monitoring**: Detects when streamers go live with rich embeds
- 📺 **YouTube Upload Monitoring**: Detects new video uploads (RSS-based, no API key needed!)
- 👥 **Live Role Management**: Automatically assigns/removes roles when streamers go live/offline
- 🎨 **Rich Embeds**: Beautiful stream previews with thumbnails and "Watch Now" buttons
- 🎯 **Smart Game Detection**: Only notifies on go-live or game changes (prevents spam)
- 💬 **Custom Messages**: Per-streamer notification customization
- 🌐 **Multi-Guild Support**: Each Discord server has independent configuration
- ⚡ **Modular Design**: Easy to extend with new platforms
- 🔄 **Automatic Token Management**: Handles Twitch OAuth tokens automatically
- 🛠️ **Easy Commands**: Slash commands for all functionality
- 🎮 **Custom Bot Status**: Rotating status messages with admin override controls

## Project Structure

```
discord-bot/
├── index.js              # Main bot file
├── commands/             # Slash command handlers
│   ├── setup.js         # Setup command (channel + role)
│   ├── setrole.js       # Role management
│   ├── customstatus.js  # Set custom bot status (Admin)
│   ├── clearstatus.js   # Clear custom status (Admin)
│   └── ...              # Other commands
├── modules/
│   ├── twitch.js        # Twitch monitoring + role management
│   └── youtube.js       # YouTube monitoring (RSS-based)
├── utils/
│   ├── config.js        # Config management
│   └── youtube.js       # YouTube utilities
├── config.json          # Multi-guild configuration
├── status.json          # Bot status messages
├── .env                 # Environment variables (API keys)
├── changelog.md         # Version history
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
5. Enable these **Privileged Gateway Intents**:
   - ✅ **SERVER MEMBERS INTENT** (required for role management)
   - ✅ **MESSAGE CONTENT INTENT** (required for legacy support)
   - ✅ **PRESENCE INTENT** (required for automatic role assignment)
6. Go to "OAuth2" > "URL Generator"
7. Select scopes: `bot` and `applications.commands`
8. Select permissions: 
   - `Send Messages`
   - `View Channels`
   - `Use Slash Commands`
   - `Manage Roles` (required for live role feature)
9. Copy the generated URL and invite the bot to your server

**⚠️ Important**: Ensure the bot's role is positioned **higher** than the live role in your server's role hierarchy!

### 3. Get Twitch API Credentials

1. Go to [Twitch Developer Console](https://dev.twitch.tv/console)
2. Click "Register Your Application"
3. Set OAuth Redirect URL to `http://localhost`
4. Copy the Client ID and generate a Client Secret

### 4. YouTube Setup (No API Key Required!)

As of v0.0.6, the bot uses **RSS feeds** for YouTube monitoring, so **no API key is required**! 🎉

The bot automatically fetches channel information from YouTube's public RSS feeds.

### 5. Configure .env File

Fill in your `.env` file with the credentials:

```env
DISCORD_BOT_TOKEN=your_discord_bot_token
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret
```

**Note:** `YOUTUBE_API_KEY` is no longer required!

### 6. Configure config.json

The bot uses **multi-guild configuration**. Each Discord server gets its own settings.

Edit `config.json` to add your server's Guild ID:

```json
{
  "guilds": {
    "YOUR_GUILD_ID": {
      "channelId": null,
      "liveRoleId": null,
      "twitch": {
        "usernames": [],
        "checkInterval": 60000,
        "message": "🔴 {username} is now live on Twitch!\n**{title}**\nPlaying: {game}",
        "customMessages": {}
      },
      "youtube": {
        "channelIds": [],
        "checkInterval": 300000,
        "message": "📺 {channel} just uploaded a new video!\n**{title}**"
      }
    }
  }
}
```

**To get your Guild ID:**
1. Enable Developer Mode in Discord (User Settings > Advanced > Developer Mode)
2. Right-click on your server icon
3. Click "Copy Server ID"

**Note:** The bot auto-creates entries for new guilds when you use the `/setup` command.

### 7. Configure status.json (Optional)

The bot will auto-generate `status.json` on first run, but you can create it manually:

```json
[
  { "type": "WATCHING", "text": "for new streams" },
  { "type": "WATCHING", "text": "Twitch streamers" },
  { "type": "WATCHING", "text": "YouTube uploads" },
  { "type": "PLAYING", "text": "with notifications" },
  { "type": "LISTENING", "text": "to stream alerts" },
  { "type": "STREAMING", "text": "live updates", "url": "https://twitch.tv" }
]
```

**Available Activity Types:**
- `PLAYING` - "Playing [text]"
- `STREAMING` - "Streaming [text]" (requires URL)
- `LISTENING` - "Listening to [text]"
- `WATCHING` - "Watching [text]"
- `COMPETING` - "Competing in [text]"

### 8. Run the Bot

```bash
npm start
```

### 9. First-Time Setup in Discord

Once the bot is running, in each Discord server:

1. **Set notification channel** (required):
   ```
   /setup channel:#notifications
   ```

2. **Optional - Set live role** (for automatic role assignment):
   ```
   /setup channel:#notifications liverole:@LiveNow
   ```
   Or set it later with:
   ```
   /setrole role:@LiveNow
   ```

3. **Add streamers and channels**:
   ```
   /addstreamer username:shroud
   /addchannel channel:@MrBeast
   ```

4. **Link your Twitch account** (for automatic role):
   ```
   /linkaccount
   ```

5. **Test manually**:
   ```
   /nudgetwitch
   /nudgeyt
   ```

## Bot Commands

All commands are **slash commands** - just type `/` in Discord to see them!

### 🔧 Setup Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/setup` | Set notification channel and optional live role | `/setup channel:#notifications liverole:@LiveNow` |
| `/setrole` | Set or update live role (omit role to remove) | `/setrole role:@LiveNow` or `/setrole` |
| `/removerole` | Remove live role configuration | `/removerole` |
| `/help` | Display all available commands | `/help` |

### 🎮 Bot Management Commands (Admin Only)

| Command | Description | Example |
|---------|-------------|---------|
| `/customstatus` | Set a custom bot status (pauses rotation) | `/customstatus type:Playing text:Maintenance Mode` |
| `/clearstatus` | Clear custom status and resume rotation | `/clearstatus` |

**Custom Status Features:**
- Pauses automatic status rotation
- Supports all Discord activity types
- Requires Administrator permission
- Remains until manually cleared

### 🔗 Account Linking Commands

| Command | Description | Permission |
|---------|-------------|------------|
| `/linkaccount` | Link your Twitch account for auto role | Everyone |
| `/manuallink` | Manually link any user's Twitch account | Admin Only |
| `/unlinkaccount` | Unlink Twitch accounts | Self or Admin |
| `/listlinks` | Show all linked Twitch accounts | Admin Only |

**Why Link Your Account?**
- Enables automatic live role when you stream
- More reliable than username matching
- Works even if Discord/Twitch names differ

### 🔴 Twitch Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/addstreamer` | Add a Twitch streamer (opens interactive form) | `/addstreamer` |
| `/removestreamer` | Remove a Twitch streamer | `/removestreamer username:shroud` |
| `/liststreamers` | Show all monitored streamers | `/liststreamers` |
| `/nudgetwitch` | Manually check for live streams | `/nudgetwitch` |

**Adding Streamers with Custom Messages:**

When you use `/addstreamer`, a popup form appears where you can:
- Enter the Twitch username (validated before adding)
- Optionally add a custom notification message

**Custom Message Placeholders:**
- `{username}` - Streamer's display name
- `{title}` - Stream title
- `{game}` - Game being played
- `{url}` - Stream URL

**Example custom message:**
```
🎮 {username} just went live!
"{title}"
Watch at: {url}
```

### 📺 YouTube Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/addchannel` | Add a YouTube channel | `/addchannel channel:@MrBeast` |
| `/removechannel` | Remove a YouTube channel | `/removechannel channel:@MrBeast` |
| `/listchannels` | Show all monitored channels | `/listchannels` |
| `/nudgeyt` | Manually check for latest videos | `/nudgeyt` |

**Supported YouTube Channel Formats:**
- `@handle` - e.g., `@MrBeast`, `@LinusTechTips`
- Full URL - e.g., `https://youtube.com/@MrBeast`
- Channel URL - e.g., `https://youtube.com/channel/UCX6OQ3DkcsbYNE6H8uQQuVA`
- Channel ID - e.g., `UCX6OQ3DkcsbYNE6H8uQQuVA`

## 🎮 Bot Status Management (New in v0.0.9!)

The bot features a dynamic status system with automatic rotation and admin override capabilities.

### Automatic Status Rotation

The bot automatically rotates through status messages defined in `status.json`:
- Changes every 30 seconds
- Randomly selects from available messages
- Supports all Discord activity types
- Fully customizable by editing `status.json`

### Custom Status Control (Admin Only)

Administrators can override the rotation with a custom status:

**Set a custom status:**
```
/customstatus type:Playing text:Maintenance Mode
/customstatus type:Streaming text:Special Event url:https://twitch.tv/example
```

**Clear the custom status:**
```
/clearstatus
```

**Features:**
- Pauses automatic rotation while active
- Persists until manually cleared
- Requires Administrator permission
- Supports all activity types (Playing, Streaming, Listening, Watching, Competing)

### Editing Status Messages

Edit `status.json` to customize the rotation messages:

```json
[
  { "type": "WATCHING", "text": "for new streams" },
  { "type": "PLAYING", "text": "custom game" },
  { "type": "LISTENING", "text": "your feedback" }
]
```

**Note:** Bot must be restarted to reload `status.json` changes.

## 🎭 Live Role Management (v0.0.7+)

The bot can automatically assign a role to Discord members when they go live on Twitch and remove it when they go offline.

### Setup

1. **Create a role** in your Discord server (e.g., "🔴 LIVE NOW")
2. **Position the bot's role higher** than the live role in Server Settings > Roles
3. **Configure the role** using one of these methods:

   **Method 1: During initial setup**
   ```
   /setup channel:#notifications liverole:@LiveNow
   ```

   **Method 2: Set it separately**
   ```
   /setrole role:@LiveNow
   ```

4. **Link your Twitch account** (recommended):
   ```
   /linkaccount
   ```

### How It Works

**With Account Linking (Recommended):**
1. User links Twitch account via `/linkaccount`
2. When user starts streaming on Twitch, Discord detects it via presence
3. Bot assigns live role automatically
4. When stream ends, role is removed

**Without Account Linking (Fallback):**
1. Bot searches for Discord members matching Twitch username
2. Assigns role based on username/nickname match
3. Less reliable than account linking

### Member Matching Priority

When account is not linked, the bot tries to match Twitch usernames to Discord members:
1. ✅ Exact nickname match
2. ✅ Exact username match
3. ✅ Partial nickname match
4. ✅ Partial username match

**Tips for best results:**
- Use `/linkaccount` for most reliable role assignment
- Set Discord nicknames to match Twitch usernames
- Or use the same username on both platforms

### Managing the Role

**Update the role:**
```
/setrole role:@NewLiveRole
```

**Remove the role configuration:**
```
/setrole
```
or
```
/removerole
```

**⚠️ Note:** Removing the configuration doesn't automatically remove the role from members who currently have it. You may need to manually clean up roles.

## Multi-Guild Configuration

The bot supports multiple Discord servers, each with:
- ✅ **Independent notification channels**: Each server sends to its own channel
- ✅ **Separate streamer lists**: Server A can monitor different streamers than Server B
- ✅ **Independent role management**: Each server can have its own live role
- ✅ **Custom messages**: Each server can have different notification formats
- ✅ **Auto-configuration**: New servers are automatically added when you run `/setup`

**Example:**
- **Server 1**: 
  - Monitors: shroud, pokimane
  - Sends to: #live-streams
  - Live role: @Streaming
- **Server 2**: 
  - Monitors: xqc, summit1g
  - Sends to: #twitch-alerts
  - Live role: @LiveNow

## Configuration Options

### Check Intervals

- `twitch.checkInterval`: Default 60000ms (1 minute)
- `youtube.checkInterval`: Default 300000ms (5 minutes)

### Status Rotation

- Default rotation interval: 30 seconds
- Configurable in `index.js` by changing the `setInterval` value

### Message Placeholders

**Twitch:**
- `{username}`: Streamer's display name
- `{title}`: Stream title
- `{game}`: Game being played
- `{url}`: Stream URL

**YouTube:**
- `{channel}`: Channel name
- `{title}`: Video title

## What's New in v0.0.9

### 🎮 Bot Status Management
- Automatic status rotation from `status.json`
- Changes status every 30 seconds
- Custom status override for admins
- Pauses rotation when custom status is active
- New `/customstatus` command (Admin only)
- New `/clearstatus` command (Admin only)
- Support for all Discord activity types

See [changelog.md](changelog.md) for complete version history.

## Notes

- The bot stores stream states in memory to prevent duplicate notifications
- First run won't send notifications, it just records current state
- YouTube monitoring uses RSS feeds (no API quota limits!)
- Twitch checks are more frequent as streams change state quickly
- **New notifications only on**:
  - Initial go-live
  - Game/category changes (prevents spam during long streams)
- Role management requires **SERVER MEMBERS INTENT** and **PRESENCE INTENT** to be enabled
- Status messages are loaded once on startup (requires restart to reload changes)
- Custom status persists until manually cleared with `/clearstatus`

## Troubleshooting

### General Issues
- **Bot not posting**: Check channel ID and bot permissions
- **Commands not appearing**: Wait a few minutes for slash commands to register
- **Missing notifications**: Check console for errors

### Status Issues
- **Status not changing**: Check if custom status is active (`/clearstatus` to clear)
- **Status messages not loading**: Verify `status.json` is valid JSON
- **Custom status not working**: Ensure you have Administrator permission

### Twitch Issues
- **Not detecting streams**: Verify Twitch client ID and secret in `.env`
- **400 errors**: Invalid username - use `/addstreamer` which validates usernames
- **Duplicate notifications**: Should be fixed in v0.0.6+ (game change detection)

### YouTube Issues
- **Channels not found**: Try using the channel ID instead of @handle
- **Old API errors**: Update to v0.0.6+ which uses RSS feeds

### Role Management Issues
- **Roles not being assigned**:
  - ✅ Check that **SERVER MEMBERS INTENT** and **PRESENCE INTENT** are enabled
  - ✅ Ensure bot's role is **higher** than the live role in role hierarchy
  - ✅ Link your Twitch account with `/linkaccount` (most reliable method)
  - ✅ Verify Discord username/nickname matches Twitch username (if not linked)
  - ✅ Check console for "Could not find Discord member" messages
- **Permission errors**: 
  - ✅ Bot needs "Manage Roles" permission
  - ✅ Bot's role must be positioned higher than target role
- **Role not removed when offline**: 
  - ✅ Check if the streamer left the server
  - ✅ Verify bot still has permission to manage the role

### Debugging

Enable debug logging by checking the console output. Look for:
- `✅ Assigned live role to [user]` - Role successfully assigned
- `❌ Removed live role from [user]` - Role successfully removed
- `Could not find Discord member for Twitch user [username]` - Member matching failed
- `Loaded X status message(s) from status.json` - Status file loaded successfully
- `✅ Custom status set: [type] - [text]` - Custom status activated
- `✅ Custom status cleared, rotation resumed` - Rotation resumed

## Permissions Checklist

✅ **Required Discord Bot Permissions:**
- Send Messages
- View Channels
- Use Slash Commands
- Manage Roles (for live role feature)

✅ **Required Privileged Intents:**
- SERVER MEMBERS INTENT (for role management)
- PRESENCE INTENT (for automatic role via streaming detection)
- MESSAGE CONTENT INTENT (legacy support)

✅ **Role Hierarchy:**
- Bot's role must be positioned higher than the live role

## Support

For issues, feature requests, or questions, please open an issue on the project repository.

## Version

**Current Version:** BETA 0.0.9

See [changelog.md](changelog.md) for full version history and changes.