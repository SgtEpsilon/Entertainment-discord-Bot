# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [BETA 0.0.6] - 2026-01-18

### Added
- **YouTube RSS Feed Support**: Switched from YouTube API to RSS feeds for quota-free monitoring
  - No API key required for YouTube functionality
  - Unlimited checks without quota limits
  - Faster response times with simpler XML parsing
- **Discord Modal Forms**: Interactive forms for `/addstreamer` command
  - User-friendly popup interface for adding streamers
  - Optional custom notification message per streamer
  - Real-time validation and error handling
- **Custom Per-Streamer Notifications**: Personalized messages for individual Twitch streamers
  - Support for placeholders: `{username}`, `{title}`, `{game}`, `{url}`
  - Falls back to default message if not set
  - Stored in `guildConfig.twitch.customMessages` object
- **Rich Twitch Stream Embeds**: Beautiful visual notifications for live streams
  - Large 1080p stream preview thumbnail
  - Twitch purple branding (#9146FF)
  - Stream title as clickable link
  - "Playing [GAME]" displayed prominently in description
  - Viewer count and category fields
  - Timestamp footer
- **"Watch Now" Button**: Direct link button on all Twitch notifications
  - Red circle emoji (🔴) for visual appeal
  - Styled as Discord link button
  - One-click access to stream
- **Smart Game Change Detection**: Only sends new notification when streamer changes game
  - Prevents notification spam during long streams
  - Tracks game_id per streamer per guild
  - Notifies on initial go-live and game switches
- **Enhanced Twitch Validation**: Username validation before adding to monitoring list
  - Checks if Twitch user exists before adding
  - Validates username format (4-25 chars, alphanumeric + underscore)
  - Clear error messages for invalid usernames
- **YouTube Channel Validation**: RSS-based channel verification
  - Validates channel IDs using RSS feeds
  - Resolves @handles to channel IDs via web scraping
  - Supports multiple URL formats (channel/, @handle, /user/, /c/)
- Debug logging throughout YouTube and Twitch modules
- Enhanced error messages with troubleshooting hints

### Changed
- **YouTube Monitoring System** (`modules/youtube.js`):
  - Complete rewrite to use RSS feeds instead of YouTube Data API v3
  - Removed API key dependency
  - Added `xml2js` package for XML parsing
- **YouTube Utility Functions** (`utils/youtube.js`):
  - Updated `extractYouTubeChannelId()` to use RSS validation
  - Added `validateChannelId()` for RSS-based verification
  - Added `resolveHandleToChannelId()` for @handle resolution
- **YouTube Commands**: All YouTube commands now use RSS feeds
  - `commands/addchannel.js`: Uses RSS validation
  - `commands/removechannel.js`: Uses RSS validation with deferred replies
  - `commands/listchannels.js`: Fetches channel info from RSS feeds
- **Twitch Commands**:
  - `commands/addstreamer.js`: Now uses Discord modals with validation and custom messages
  - `commands/nudgetwitch.js`: Updated to use rich embeds with stream previews
  - Uses deferred replies to prevent timeout
- **Twitch Monitoring** (`modules/twitch.js`):
  - Complete visual overhaul with Discord embeds
  - Switched from Set-based tracking to Map-based tracking with game_id
  - Now sends embeds with stream preview images instead of plain text
  - Added "Watch Now" button component to all notifications
  - Only triggers new notification on go-live or game change
  - Added support for per-streamer custom messages
  - Enhanced notification system with viewer count and category fields
  - Improved logging with custom message and game change indicators

### Fixed
- YouTube API 403 quota exceeded errors (eliminated by switching to RSS)
- Twitch 400 errors for non-existent users (now validated before adding)
- Modal timeout issues with deferred replies
- Missing validation for malformed Twitch usernames
- `nudgetwitch` command error: "checkSpecificStreams is not a function"
- Notification spam during long streams (now only notifies on game changes)

### Technical Details
- Added dependency: `xml2js` for RSS feed parsing
- Removed dependency: YouTube API key no longer required
- Improved error handling across all YouTube operations
- Better user feedback with detailed error messages

---

## [BETA 0.0.5] - 2026-01-18

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