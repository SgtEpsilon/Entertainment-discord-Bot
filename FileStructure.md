# Discord Streaming Bot - Modular File Structure

```
discord-streaming-bot/
│
├── node_modules/              # Dependencies (auto-generated)
│
├── commands/                  # Slash command handlers (alphabetical)
│   ├── addchannel.js         # /addchannel - Add YouTube channel
│   ├── addstreamer.js        # /addstreamer - Add Twitch streamer
│   ├── clearstatus.js        # /clearstatus - Clear custom bot status and resume rotation
│   ├── customstatus.js       # /customstatus - Set custom bot status (pauses rotation)
│   ├── help.js               # /help - Dynamic help menu
│   ├── linkaccount.js        # /linkaccount - User self-link Twitch account
│   ├── listchannels.js       # /listchannels - List YouTube channels
│   ├── listlinks.js          # /listlinks - List linked Twitch accounts (Admin)
│   ├── liststreamers.js      # /liststreamers - List Twitch streamers
│   ├── manuallink.js         # /manuallink - Admin manual account linking
│   ├── nudgetwitch.js        # /nudgetwitch - Manual Twitch stream check
│   ├── nudgeyt.js            # /nudgeyt - Manual YouTube video check
│   ├── removechannel.js      # /removechannel - Remove YouTube channel
│   ├── removerole.js         # /removerole - Remove live role config
│   ├── removestreamer.js     # /removestreamer - Remove Twitch streamer
│   ├── setrole.js            # /setrole - Set/update live role
│   ├── setup.js              # /setup - Configure notification channel + role
│   └── unlinkaccount.js      # /unlinkaccount - Unlink Twitch accounts
│
├── modules/                   # Bot modules
│   ├── twitch.js             # Twitch monitoring + role management
│   └── youtube.js            # YouTube monitoring
│
├── utils/                     # Utility functions
│   ├── config.js             # Config management utilities
│   └── youtube.js            # YouTube helper functions
│
├── .env                       # Environment variables (API keys & tokens)
├── .gitignore                # Git ignore file
├── changelog.md              # Version history and changes
├── config.json               # Multi-guild configuration (auto-generated)
├── index.js                  # Main bot entry point
├── package.json              # Project dependencies
├── package-lock.json         # Locked dependency versions (auto-generated)
├── README.md                 # Documentation
└── status.json               # Bot status messages (auto-generated)

```

## File Descriptions

### **Root Files**

#### `index.js`
- Main bot entry point
- Dynamic command loader
- Event listeners:
  - `ready` / `clientReady` - Bot startup and slash command registration
  - `interactionCreate` - Handles slash command execution
  - `presenceUpdate` - Detects streaming status for auto role assignment
  - `guildDelete` - Cleans up config when bot is removed from server
- Initializes TwitchMonitor and YouTubeMonitor
- **Bot Status Management**:
  - Loads status messages from `status.json`
  - Rotates status every 30 seconds
  - Custom status functions: `setCustomStatus()`, `clearCustomStatus()`, `getCustomStatusActive()`
  - Pauses rotation when custom status is active
- Requires intents: Guilds, GuildMessages, MessageContent, GuildMembers, GuildPresences

#### `config.json`
- Auto-generated on first run (start with `{"guilds":{}}`)
- Stores per-guild configuration
- Updated by commands and saved via `utils/config.js`

#### `status.json`
- Auto-generated on first run
- Stores bot status messages for rotation
- JSON array of status objects with `type`, `text`, and optional `url`
- Editable without restarting the bot (requires restart to reload)

#### `changelog.md`
- Version history
- Feature additions and changes
- Bug fixes documentation

---

### **Commands Directory** (`commands/`)

All commands use `SlashCommandBuilder` for dynamic loading and export:
- `data` - SlashCommandBuilder instance with command definition
- `execute(interaction, client, config, monitors)` - Command execution logic

#### Command Files (Alphabetical):

**`addchannel.js`** - Add YouTube channel to monitoring
- Uses modal or string input for channel URL/@handle/ID
- Validates via RSS feed
- Stores channel ID in config

**`addstreamer.js`** - Add Twitch streamer to monitoring
- Uses modal with username and optional custom message inputs
- Validates streamer exists via Twitch API
- Supports custom notification messages with placeholders

**`clearstatus.js`** - Clear custom bot status and resume rotation (Admin only)
- Requires Administrator permission
- Clears custom status set by `/customstatus`
- Resumes automatic status rotation
- Shows warning if no custom status is active

**`customstatus.js`** - Set custom bot status (Admin only)
- Requires Administrator permission
- Pauses automatic status rotation
- Supports all Discord activity types (Playing, Streaming, Listening, Watching, Competing)
- Optional URL parameter for Streaming type
- Validates required URL for Streaming type

**`help.js`** - Dynamic help menu
- Automatically discovers all loaded commands
- Categorizes commands (Setup, Bot Management, Account Linking, Twitch, YouTube, Utility)
- Shows command descriptions pulled from SlashCommandBuilder
- Displays total command count

**`linkaccount.js`** - User self-link Twitch account
- Opens modal for Twitch username input
- Pre-fills existing link if already linked
- Stores mapping in `config.json` under `linkedAccounts`
- Enables auto role assignment via presence detection

**`listchannels.js`** - List all monitored YouTube channels
- Fetches channel names from RSS feeds
- Displays in embed with dropdown for details
- Shows channel URLs and IDs

**`listlinks.js`** - List all linked Twitch accounts (Admin only)
- Requires Administrator permission
- Shows Discord user → Twitch username mappings
- Handles users who left the server

**`liststreamers.js`** - List all monitored Twitch streamers
- Shows custom notification indicators
- Dropdown menu for detailed view
- Displays notification messages

**`manuallink.js`** - Admin manual account linking
- Requires Administrator permission
- User select menu → Modal for Twitch username
- Pre-fills existing links for editing
- Updates or creates new links

**`nudgetwitch.js`** - Manual Twitch stream check
- Checks all monitored streamers for live status
- Dropdown menu to select which streams to post
- Posts to configured notification channel
- Shows viewer counts and game info

**`nudgeyt.js`** - Manual YouTube video check
- Checks all monitored channels for recent videos
- Dropdown menu to select which videos to post
- Posts to configured notification channel

**`removechannel.js`** - Remove YouTube channel from monitoring
- Fetches channel names for dropdown
- Dropdown selection for removal
- Updates config

**`removerole.js`** - Remove live role configuration
- Alias for `/setrole` without parameters
- Removes role from config
- Does not remove role from current members

**`removestreamer.js`** - Remove Twitch streamer from monitoring
- Dropdown menu of current streamers
- Also removes custom messages if configured
- Updates config

**`setrole.js`** - Set or update live streamer role
- Optional role parameter (omit to remove)
- Validates bot can manage the role
- Checks role position and managed status

**`setup.js`** - Configure notification channel and live role
- Required: Text channel selection
- Optional: Live role selection
- Validates permissions and role hierarchy

**`unlinkaccount.js`** - Unlink Twitch accounts
- Users can unlink themselves
- Admins can unlink any user via dropdown
- Shows Twitch usernames in dropdown for easy identification

---

### **Modules Directory** (`modules/`)

#### `twitch.js` - TwitchMonitor Class
**Properties:**
- `client` - Discord.js client instance
- `config` - Config object reference
- `accessToken` - Twitch API OAuth token
- `liveStreamers` - Map of guild → username → {game_id, memberId, messageId, channelId}
- `connectedAccountsCache` - Cache for linked account lookups

**Methods:**
- `getAccessToken()` - Obtains Twitch OAuth token
- `findMemberByTwitchUsername(members, twitchUsername)` - Finds Discord member by username (uses cache)
- `assignLiveRole(guild, guildConfig, username, memberId?)` - Assigns live role when streaming
- `removeLiveRole(guild, guildConfig, username, memberId?)` - Removes live role when offline
- `checkStreams()` - Main monitoring loop (runs every 60 seconds)
- `sendNotification(stream, guildId, guildConfig)` - Sends new stream notification
- `updateNotification(stream, guildId, guildConfig, cachedData)` - Updates existing notification on game change
- `checkSpecificStreamers(usernames)` - Used by `/nudgetwitch`
- `start()` - Starts monitoring interval
- `stop()` - Stops monitoring interval

**Features:**
- Game change detection (updates message instead of new notification)
- Member ID caching for efficient role management
- Custom message support with placeholders: {username}, {title}, {game}, {url}
- Message editing when game changes (adds "Updated" to footer)

#### `youtube.js` - YouTubeMonitor Class
**Properties:**
- `client` - Discord.js client instance
- `config` - Config object reference
- `lastChecked` - Map of channel → last video ID

**Methods:**
- `checkVideos()` - Main monitoring loop (runs every 5 minutes)
- `sendNotification(video, guildId, guildConfig)` - Sends new video notification
- `checkSpecificChannels(channelIds)` - Used by `/nudgeyt`
- `start()` - Starts monitoring interval
- `stop()` - Stops monitoring interval

**Features:**
- RSS feed-based (no API key required)
- Tracks last video per channel to avoid duplicates
- Message placeholders: {channel}, {title}

---

### **Utils Directory** (`utils/`)

#### `config.js` - Configuration Management
**Functions:**
- `getGuildConfig(guildId)` - Retrieves or creates guild config with defaults
- `saveConfig()` - Saves config.json to disk
- `deleteGuildConfig(guildId)` - Removes guild config (on bot removal)

**Default Guild Config:**
```javascript
{
  channelId: null,
  liveRoleId: null,
  twitch: {
    usernames: [],
    checkInterval: 60000,
    message: "🔴 {username} is now live on Twitch!\n**{title}**\nPlaying: {game}",
    linkedAccounts: {}  // Discord ID → Twitch username mapping
  },
  youtube: {
    channelIds: [],
    checkInterval: 300000,
    message: "📺 {channel} just uploaded a new video!\n**{title}**"
  }
}
```

#### `youtube.js` - YouTube Helper Functions
**Functions:**
- `extractYouTubeChannelId(input)` - Extracts channel ID from:
  - Full URL (youtube.com/channel/UC... or youtube.com/@handle)
  - @handle
  - Direct channel ID (UC...)
  - Validates via RSS feed fetch

---

## Configuration Schema

### `config.json` Structure (per guild)
```json
{
  "guilds": {
    "GUILD_ID": {
      "channelId": "CHANNEL_ID",
      "liveRoleId": "ROLE_ID",
      "twitch": {
        "usernames": ["streamer1", "streamer2"],
        "checkInterval": 60000,
        "message": "🔴 {username} is now live on Twitch!\n**{title}**\nPlaying: {game}",
        "customMessages": {
          "streamer1": "🎮 Custom message for streamer1!"
        },
        "linkedAccounts": {
          "DISCORD_USER_ID_1": "twitch_username_1",
          "DISCORD_USER_ID_2": "twitch_username_2"
        }
      },
      "youtube": {
        "channelIds": ["UC...", "UC..."],
        "checkInterval": 300000,
        "message": "📺 {channel} just uploaded a new video!\n**{title}**"
      }
    }
  }
}
```

### `status.json` Structure
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

---

## Setup Instructions

### 1. Create the directory structure
```bash
mkdir -p discord-streaming-bot/{commands,modules,utils}
cd discord-streaming-bot
```

### 2. Create all files
```bash
# Root files
touch index.js .env .gitignore README.md changelog.md
echo '{"guilds":{}}' > config.json
echo '[{"type":"WATCHING","text":"for new streams"},{"type":"PLAYING","text":"with notifications"}]' > status.json

# Commands (alphabetical)
touch commands/{addchannel,addstreamer,clearstatus,customstatus,help,linkaccount,listchannels,listlinks,liststreamers,manuallink,nudgetwitch,nudgeyt,removechannel,removerole,removestreamer,setrole,setup,unlinkaccount}.js

# Modules
touch modules/{twitch,youtube}.js

# Utils
touch utils/{config,youtube}.js
```

### 3. Initialize npm and install dependencies
```bash
npm init -y
npm install discord.js@14.14.1 dotenv@16.3.1 axios@1.6.2 xml2js@0.6.2
```

### 4. Configure environment variables (.env)
```env
DISCORD_BOT_TOKEN=your_bot_token_here
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret
```

### 5. Enable Discord Intents
In Discord Developer Portal → Your App → Bot:
- ✅ Presence Intent
- ✅ Server Members Intent
- ✅ Message Content Intent

### 6. Populate files with code from artifacts

### 7. Run the bot
```bash
npm start
```

---

## Features Overview

### Bot Status Management (v0.0.9+)
**Automatic Status Rotation:**
1. Bot loads status messages from `status.json` on startup
2. Randomly selects and displays a status
3. Changes status every 30 seconds
4. Supports all Discord activity types

**Custom Status Control (Admin Only):**
1. Admin runs `/customstatus type:Playing text:Maintenance Mode`
2. Automatic rotation pauses
3. Custom status remains until cleared
4. Admin runs `/clearstatus` to resume rotation

**Status Priority:**
1. Custom status (if set) - Pauses rotation
2. Automatic rotation from `status.json` - Normal operation

### Live Role Management (v0.0.8+)
**Manual Account Linking:**
1. User runs `/linkaccount` or admin runs `/manuallink`
2. Twitch username stored in `config.json`
3. Bot uses linked accounts for role assignment

**Auto Role Assignment via Presence:**
1. User starts streaming on Twitch
2. Discord presence shows "Streaming" status
3. Bot detects via `presenceUpdate` event
4. Bot assigns configured live role automatically
5. When stream ends, role is removed

**Role Assignment Priority:**
1. Check `linkedAccounts` mapping (most reliable)
2. Check cached members by username/nickname match
3. Fetch all members and search by username/nickname

### Stream Notification Updates
- First notification sent when streamer goes live
- Message edited (not reposted) when game changes
- Thumbnail, viewer count, and game info updated
- Footer shows "Twitch • Updated" on edits

### Command Categories
- **Server Setup**: setup, setrole, removerole
- **Bot Management**: customstatus, clearstatus
- **Account Linking**: linkaccount, manuallink, unlinkaccount, listlinks
- **Twitch Monitoring**: addstreamer, removestreamer, liststreamers, nudgetwitch
- **YouTube Monitoring**: addchannel, removechannel, listchannels, nudgeyt
- **Utility**: help

---

## File Organization Benefits

✅ **Alphabetically Organized** - Easy to locate files  
✅ **Dynamic Command Loading** - Help menu auto-updates  
✅ **Modular Architecture** - Each command in its own file  
✅ **Scalable Design** - Easy to add new features  
✅ **Interactive UI** - Dropdowns and modals for better UX  
✅ **Presence Detection** - Real-time role assignment  
✅ **Message Editing** - No spam from game changes  
✅ **Multi-Guild Support** - Separate config per server  
✅ **Caching System** - Efficient API usage  
✅ **Error Handling** - Graceful failures with user feedback  
✅ **Custom Bot Status** - Configurable presence with admin controls