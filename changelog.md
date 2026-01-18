# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [BETA 0.0.5]

### Added
- Automatic guild configuration cleanup when bot is removed from a server
- `deleteGuildConfig()` function in `utils/config.js` for removing guild configurations
- `guildDelete` event handler in `index.js` to detect when bot leaves a guild
- Enhanced logging for guild removal events

### Changed
- Updated `utils/config.js` to export `deleteGuildConfig` function
- Updated `index.js` to import and use `deleteGuildConfig` from config utilities
- Improved code organization in `utils/config.js` by moving function definitions before exports

### Fixed
- Fixed `ReferenceError: deleteGuildConfig is not defined` error when bot is removed from guilds
- Resolved missing import issue in `index.js`

---

## [BETA 0.0.1] - Initial Release

### Added
- Multi-guild Discord bot for monitoring Twitch streams and YouTube uploads
- Modular file structure with separate command handlers
- Slash command system with the following commands:
  - `/setup` - Set notification channel
  - `/addstreamer` - Add Twitch streamer to monitor
  - `/removestreamer` - Remove Twitch streamer
  - `/liststreamers` - List all monitored Twitch streamers
  - `/addchannel` - Add YouTube channel to monitor
  - `/removechannel` - Remove YouTube channel
  - `/listchannels` - List all monitored YouTube channels
  - `/nudgetwitch` - Manually check and post live Twitch streams
  - `/nudgeyt` - Manually check and post latest YouTube videos
  - `/help` - Display help menu
- Twitch monitoring module with OAuth token management
- YouTube monitoring module for video upload detection
- Configuration management system (`utils/config.js`)
- YouTube helper utilities for channel ID extraction
- Support for both Discord.js v13 and v14+
- Automatic guild configuration creation
- JSON-based configuration storage
- Environment variable support via `.env` file

### Technical Details
- Built with Discord.js v14.14.1
- Uses Axios v1.6.2 for HTTP requests
- Dotenv v16.3.1 for environment management
- Modular architecture for easy maintenance and scaling

---

## Release Notes

### Version Numbering
- **Major version** (X.0.0): Breaking changes or significant feature additions
- **Minor version** (0.X.0): New features, backward compatible
- **Patch version** (0.0.X): Bug fixes and minor improvements

### Support
For issues, feature requests, or questions, please open an issue on the project repository.