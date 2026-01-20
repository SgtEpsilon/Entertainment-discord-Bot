# Discord Streaming Bot

A modular Discord bot that monitors Twitch streams and YouTube channels for new content, posts notifications to a Discord channel, and automatically manages live streamer roles with presence detection.

## Features

- 🔴 **Twitch Stream Monitoring**: Detects when streamers go live with rich embeds
- 📺 **YouTube Upload Monitoring**: Detects new video uploads (RSS-based, no API key needed!)
- 👥 **Live Role Management**: Automatically assigns/removes roles when streamers go live/offline
- 🔗 **Account Linking System**: Manual linking for reliable role assignment
- 📡 **Presence Detection**: Real-time role assignment when Discord detects streaming
- 🎨 **Rich Embeds**: Beautiful stream previews with thumbnails and "Watch Now" buttons
- 🎯 **Smart Game Detection**: Updates notifications when game changes (prevents spam)
- 💬 **Custom Messages**: Per-streamer notification customization
- 🌐 **Multi-Guild Support**: Each Discord server has independent configuration
- ⚡ **Modular Design**: Easy to extend with new platforms
- 🔄 **Automatic Token Management**: Handles Twitch OAuth tokens automatically
- 🛠️ **Interactive UI**: Slash commands with dropdowns and modals
- 📋 **Dynamic Help**: Auto-updating help menu from loaded commands

## Project Structure

```
discord-bot/
├── index.js              # Main bot file + presence detection
├── commands/             # Slash command handlers (16 commands)
│   ├── addchannel.js
│   ├── addstreamer.js
│   ├── help.js          # Dynamic command discovery
│   ├── linkaccount.js   # User self-link
│   ├── listchannels.js
│   ├── listlinks.js     # Admin view links
│   ├── liststreamers.js
│   ├── manuallink.js    # Admin manual link
│   ├── nudgetwitch.js
│   ├── nudgeyt.js
│   ├── removechannel.js
│   ├── removerole.js
│   ├── removestreamer.js
│   ├── setrole.js
│   ├── setup.js
│   └── unlinkaccount.js # Unlink accounts
├── modules/
│   ├── twitch.js        # Twitch monitoring + role + message editing
│   └── youtube.js       # YouTube monitoring (RSS-based)
├── utils/
│   ├── config.js        # Config management
│   └── youtube.js       # YouTube utilities
├── config.json          # Multi-guild configuration
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
   - ✅ **PRESENCE INTENT** (required for presence detection)
   - ✅ **MESSAGE CONTENT INTENT** (required for legacy support)
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

The bot uses **RSS feeds** for YouTube monitoring, so **no API key is required**! 🎉

The bot automatically fetches channel information from YouTube's public RSS feeds.

### 5. Configure .env File

Fill in your `.env` file with the credentials:

```env
DISCORD_BOT_TOKEN=your_discord_bot_token
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret
```

### 6. Configure config.json

Create `config.json` with initial empty structure:

```json
{
  "guilds": {}
}
```

The bot will auto-populate this when you use `/setup` command.

### 7. Run the Bot

```bash
npm start
```

### 8. First-Time Setup in Discord

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

3. **Link your Twitch account** (for auto role):
   ```
   /linkaccount
   ```
   Enter your Twitch username in the popup

4. **Add streamers and channels**:
   ```
   /addstreamer
   /addchannel channel:@MrBeast
   ```

5. **Test manually**:
   ```
   /nudgetwitch
   /nudgeyt
   ```

## Bot Commands

All commands are **slash commands** with interactive UI elements!

### 🔧 Setup Commands

| Command | Description |
|---------|-------------|
| `/setup` | Set notification channel and optional live role |
| `/setrole` | Set or update live role (omit role to remove) |
| `/removerole` | Remove live role configuration |

### 🔗 Account Linking Commands (NEW in v0.0.8)

| Command | Description |
|---------|-------------|
| `/linkaccount` | Link your Twitch account (opens modal) |
| `/manuallink` | Admin: Manually link a user's account (user picker + modal) |
| `/unlinkaccount` | Unlink accounts (dropdown selection) |
| `/listlinks` | Admin: View all linked accounts |

### 🔴 Twitch Commands

| Command | Description |
|---------|-------------|
| `/addstreamer` | Add a Twitch streamer (modal with validation) |
| `/removestreamer` | Remove a Twitch streamer (dropdown selection) |
| `/liststreamers` | Show all monitored streamers (with dropdown details) |
| `/nudgetwitch` | Manually check for live streams (dropdown to post) |

### 📺 YouTube Commands

| Command | Description |
|---------|-------------|
| `/addchannel` | Add a YouTube channel |
| `/removechannel` | Remove a YouTube channel (dropdown selection) |
| `/listchannels` | Show all monitored channels (with dropdown details) |
| `/nudgeyt` | Manually check for latest videos (dropdown to post) |

### 🛠️ Utility Commands

| Command | Description |
|---------|-------------|
| `/help` | Display all available commands (dynamic discovery) |

## 🎭 Live Role Management (Enhanced in v0.0.8!)

The bot now supports **two methods** for automatic role assignment:

### Method 1: Account Linking (Recommended)

**Setup:**
1. Link Twitch accounts using `/linkaccount` or `/manuallink`
2. Configure live role with `/setrole role:@LiveNow`

**How it works:**
- User starts streaming on Twitch
- Discord shows their presence as "Streaming"
- Bot detects via `presenceUpdate` event
- Bot checks if user has linked Twitch account
- Role assigned/removed automatically in real-time

**Benefits:**
- ✅ Instant role assignment (presence-based)
- ✅ Works even if streamer isn't in bot's monitoring list
- ✅ Most reliable method
- ✅ No username matching needed

### Method 2: Username Matching (Automatic)

**How it works:**
- Bot monitors streamers via `/addstreamer`
- When stream goes live, bot searches for Discord member
- Matches by nickname/username
- Assigns role if match found

**Matching Priority:**
1. Exact nickname match
2. Exact username match
3. Partial nickname match
4. Partial username match

### Account Linking Commands

**User Self-Link:**
```
/linkaccount
```
Opens a modal to enter Twitch username. Pre-fills if already linked.

**Admin Manual Link:**
```
/manuallink
```
User picker dropdown → Modal to enter Twitch username. Can update existing links.

**Unlink:**
```
/unlinkaccount
```
Dropdown shows your link + all server links (admin only). Select to remove.

**View All Links:**
```
/listlinks
```
Admin only. Shows Discord user → Twitch username mappings.

## 🎮 Stream Notification Updates (v0.0.8)

- **First notification** when streamer goes live
- **Message edited** (not reposted) when game changes
- Thumbnail, viewer count, and game info updated
- Footer shows "Twitch • Updated" on edits
- Prevents spam during long streams

## Interactive UI Features (NEW)

### Modals
- `/linkaccount` - Popup form for Twitch username
- `/manuallink` - Popup after selecting user
- `/addstreamer` - Popup with username + custom message fields

### Dropdowns
- `/removestreamer` - Select from monitored streamers
- `/removechannel` - Select from monitored channels
- `/unlinkaccount` - Select account to unlink
- `/nudgetwitch` - Select streams to post
- `/nudgeyt` - Select videos to post
- `/liststreamers` - Select for details
- `/listchannels` - Select for details

### User Picker
- `/manuallink` - Visual user selection

## Configuration Options

### Check Intervals

- `twitch.checkInterval`: 60000ms (1 minute)
- `youtube.checkInterval`: 300000ms (5 minutes)

### Message Placeholders

**Twitch:**
- `{username}`: Streamer's display name
- `{title}`: Stream title
- `{game}`: Game being played
- `{url}`: Stream URL

**YouTube:**
- `{channel}`: Channel name
- `{title}`: Video title

## What's New in v0.0.8

### 🔗 Account Linking System
- Manual Twitch account linking for users and admins
- Stored in `config.json` under `linkedAccounts`
- Enables reliable role assignment via presence detection

### 📡 Presence Detection
- Real-time detection when users start streaming
- Automatic role assignment for linked accounts
- Works independently of monitored streamer list
- Role removed automatically when stream ends

### 🎨 Interactive UI Overhaul
- All commands use modals, dropdowns, or user pickers
- Better user experience with visual selections
- Pre-filled forms for editing existing data
- Consistent design across all commands

### 📝 Dynamic Help Menu
- Auto-discovers all loaded commands
- Categorizes commands by function
- Shows total command count
- Always up-to-date with new commands

### ✏️ Message Editing
- Stream notifications edited on game change
- No duplicate messages during long streams
- Updates thumbnail and viewer count
- Shows "Updated" indicator in footer

### 🛠️ Command Updates
- All 16 commands use `SlashCommandBuilder`
- Proper option types (Channel, Role, String, User)
- Consistent ephemeral replies
- Enhanced error handling

See [changelog.md](changelog.md) for complete version history.

## Troubleshooting

### Account Linking Issues
- **Link not working**: Check that Twitch username is spelled exactly as on Twitch
- **Role not assigned**: Verify **PRESENCE INTENT** is enabled in Developer Portal
- **Can't see linked accounts**: Use `/listlinks` (admin only)

### Presence Detection Issues
- **Role not auto-assigned**:
  - ✅ Check **PRESENCE INTENT** enabled
  - ✅ Verify account is linked via `/linkaccount`
  - ✅ Ensure live role is configured with `/setrole`
  - ✅ Confirm bot's role is higher than live role
- **Works in monitoring but not presence**: Link account with `/linkaccount`

### Role Management Issues
- **Roles not being assigned**:
  - ✅ Check **SERVER MEMBERS INTENT** and **PRESENCE INTENT** enabled
  - ✅ Ensure bot's role is **higher** than live role in hierarchy
  - ✅ Verify account is linked or username matches
  - ✅ Check console for "Could not find Discord member" messages
- **Permission errors**: 
  - ✅ Bot needs "Manage Roles" permission
  - ✅ Bot's role must be positioned higher than target role

### General Issues
- **Bot not posting**: Check channel ID and bot permissions
- **Commands not appearing**: Wait a few minutes for slash commands to register
- **Modal/Dropdown timeout**: Respond within 15 minutes

## Permissions Checklist

✅ **Required Discord Bot Permissions:**
- Send Messages
- View Channels
- Use Slash Commands
- Manage Roles

✅ **Required Privileged Intents:**
- SERVER MEMBERS INTENT (role management)
- PRESENCE INTENT (streaming detection) **NEW**
- MESSAGE CONTENT INTENT (legacy support)

✅ **Role Hierarchy:**
- Bot's role must be positioned higher than the live role

## Support

For issues, feature requests, or questions, please open an issue on the project repository.

## Version

**Current Version:** BETA 0.0.8

See [changelog.md](changelog.md) for full version history and changes.