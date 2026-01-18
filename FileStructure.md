# Discord Streaming Bot - Modular File Structure

```
discord-streaming-bot/
│
├── node_modules/              # Dependencies (auto-generated)
│
├── commands/                  # Slash command handlers
│   ├── setup.js              # /setup command
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
│   ├── twitch.js             # Twitch monitoring logic
│   └── youtube.js            # YouTube monitoring logic
│
├── utils/                     # Utility functions
│   ├── config.js             # Config management
│   └── youtube.js            # YouTube helper functions
│
├── .env                       # Environment variables (API keys & tokens)
├── .gitignore                # Git ignore file
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

### **Commands Directory** (`commands/`)

Each file exports:
- `data` - Command definition for Discord
- `execute(interaction, client, config, monitors)` - Command logic

#### Command Files:
- **`setup.js`** - Set notification channel
- **`addstreamer.js`** - Add Twitch streamer
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

#### `youtube.js`
- YouTubeMonitor class
- Video upload checking
- Notification sending

### **Utils Directory** (`utils/`)

#### `config.js`
- `getGuildConfig(guildId)` - Get/create guild config
- `saveConfig()` - Save config to file

#### `youtube.js`
- `extractYouTubeChannelId(input)` - Parse channel from URL/@handle/ID

## Setup Instructions

### 1. Create the directory structure
```bash
mkdir -p discord-streaming-bot/{commands,modules,utils}
cd discord-streaming-bot
```

### 2. Create all files
```bash
# Root files
touch index.js .env .gitignore README.md
echo '{"guilds":{}}' > config.json

# Commands
touch commands/{setup,addstreamer,removestreamer,liststreamers,addchannel,removechannel,listchannels,nudgetwitch,nudgeyt,help}.js

# Modules
touch modules/{twitch,youtube}.js

# Utils
touch utils/{config,youtube}.js
```

### 3. Initialize npm and install dependencies
```bash
npm init -y
npm install discord.js@14.14.1 dotenv@16.3.1 axios@1.6.2
```

### 4. Populate files with code from artifacts

### 5. Run the bot
```bash
npm start
```

## File Organization Benefits

✅ **Maintainability** - Each command in its own file
✅ **Scalability** - Easy to add new commands
✅ **Testing** - Individual command testing
✅ **Collaboration** - Multiple developers can work simultaneously
✅ **Debugging** - Easier to locate issues
✅ **Reusability** - Shared utilities in utils/