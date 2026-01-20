# Discord Streaming Bot - Modular File Structure

```
discord-streaming-bot/
│
├── node_modules/              # Dependencies (auto-generated)
│
├── commands/                  # Slash command handlers
│   ├── setup.js              # /setup command (channel + optional live role)
│   ├── setrole.js            # /setrole command (manage live role)
│   ├── removerole.js         # /removerole command (remove live role config)
│   ├── addstreamer.js        # /addstreamer command
│   ├── removestreamer.js     # /removestreamer command
│   ├── liststreamers.js      # /liststreamers command
│   ├── addchannel.js         # /addchannel command
│   ├── removechannel.js      # /removechannel command
│   ├── listchannels.js       # /listchannels command
│   ├── nudgetwitch.js        # /nudgetwitch command
│   ├── nudgeyt.js            # /nudgeyt command
│   └── help.js               # /help command
│
├── modules/                   # Bot modules
│   ├── twitch.js             # Twitch monitoring logic + role management
│   └── youtube.js            # YouTube monitoring logic
│
├── utils/                     # Utility functions
│   ├── config.js             # Config management
│   └── youtube.js            # YouTube helper functions
│
├── .env                       # Environment variables (API keys & tokens)
├── .gitignore                # Git ignore file
├── changelog.md              # Version history and changes
├── config.json               # Multi-guild configuration
├── index.js                  # Main bot file
├── package.json              # Project dependencies
├── package-lock.json         # Locked dependency versions (auto-generated)
└── README.md                 # Documentation

```

## File Descriptions

### **Root Files**

#### `index.js`
- Main bot entry point
- Command loader
- Event listeners
- Minimal logic (delegates to commands)

#### `changelog.md`
- Version history
- Feature additions and changes
- Bug fixes documentation

### **Commands Directory** (`commands/`)

Each file exports:
- `data` - Command definition for Discord
- `execute(interaction, client, config, monitors)` - Command logic

#### Command Files:
- **`setup.js`** - Set notification channel and optional live role
  - Required: `channel` parameter
  - Optional: `liverole` parameter for automatic role management
- **`setrole.js`** - Set or update the live streamer role
  - Optional: `role` parameter (omit to remove)
- **`removerole.js`** - Remove live role configuration (alias for `/setrole`)
- **`addstreamer.js`** - Add Twitch streamer with optional custom message
- **`removestreamer.js`** - Remove Twitch streamer
- **`liststreamers.js`** - List all Twitch streamers
- **`addchannel.js`** - Add YouTube channel
- **`removechannel.js`** - Remove YouTube channel
- **`listchannels.js`** - List all YouTube channels
- **`nudgetwitch.js`** - Check and post live streams
- **`nudgeyt.js`** - Check and post latest videos
- **`help.js`** - Show help menu

### **Modules Directory** (`modules/`)

#### `twitch.js`
- TwitchMonitor class
- Stream status checking
- OAuth token management
- **Live role management**:
  - `findMemberByTwitchUsername()` - Smart Discord member matching
  - `assignLiveRole()` - Auto-assign role when going live
  - `removeLiveRole()` - Auto-remove role when going offline
  - Member ID caching for efficiency

#### `youtube.js`
- YouTubeMonitor class
- RSS feed-based monitoring (no API key required)
- Video upload checking
- Notification sending

### **Utils Directory** (`utils/`)

#### `config.js`
- `getGuildConfig(guildId)` - Get/create guild config
- `saveConfig()` - Save config to file
- `deleteGuildConfig(guildId)` - Remove guild config on bot removal
- Includes `liveRoleId` in default configuration

#### `youtube.js`
- `extractYouTubeChannelId(input)` - Parse channel from URL/@handle/ID
- RSS-based validation

## Configuration Schema

### `config.json` Structure (per guild)
```json
{
  "guilds": {
    "GUILD_ID": {
      "channelId": "CHANNEL_ID",
      "liveRoleId": "ROLE_ID",  // NEW in v0.0.7
      "twitch": {
        "usernames": [],
        "checkInterval": 60000,
        "message": "🔴 {username} is now live...",
        "customMessages": {}
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

# Commands (including new role commands)
touch commands/{setup,setrole,removerole,addstreamer,removestreamer,liststreamers,addchannel,removechannel,listchannels,nudgetwitch,nudgeyt,help}.js

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

### 4. Populate files with code from artifacts

### 5. Run the bot
```bash
npm start
```

## New in v0.0.7: Live Role Management

### Role Assignment Flow
1. Admin configures live role: `/setup channel:#notifications liverole:@LiveNow`
2. When streamer goes live:
   - Bot finds Discord member by Twitch username
   - Assigns configured role
   - Caches member ID for efficiency
3. When streamer goes offline:
   - Bot removes the role
   - Clears cache entry

### Member Matching Priority
1. Exact nickname match
2. Exact username match
3. Partial nickname match
4. Partial username match

### Role Management Commands
- `/setup channel:#notifications liverole:@LiveNow` - Set both channel and role
- `/setrole role:@LiveNow` - Set/update live role only
- `/setrole` - Remove live role configuration
- `/removerole` - Alternative way to remove role config

## File Organization Benefits

✅ **Maintainability** - Each command in its own file  
✅ **Scalability** - Easy to add new commands  
✅ **Testing** - Individual command testing  
✅ **Collaboration** - Multiple developers can work simultaneously  
✅ **Debugging** - Easier to locate issues  
✅ **Reusability** - Shared utilities in utils/  
✅ **Feature Isolation** - Role management self-contained in twitch.js  
✅ **Optional Features** - Role system works independently