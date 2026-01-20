# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

[BETA 0.0.8] - 2025-01-20
Added

Account Linking System: Manual Twitch account linking for reliable role assignment

New /linkaccount command - Users can self-link their Twitch accounts

Opens modal with Twitch username input
Pre-fills existing link if already configured
Stores mapping in config.json under linkedAccounts


New /manuallink command - Admins can manually link any user

User select menu for visual user picking
Modal for Twitch username input
Pre-fills existing links for editing
Requires Administrator permission


New /unlinkaccount command - Remove account links

Users can unlink their own account
Admins can unlink any user via dropdown
Shows Twitch usernames for easy identification


New /listlinks command - View all linked accounts

Admin only command
Shows Discord user → Twitch username mappings
Handles users who left the server




Presence Detection: Real-time streaming detection via Discord presence

Added presenceUpdate event listener in index.js
Detects when linked users start/stop streaming on Twitch
Automatically assigns/removes live role in real-time
Works independently of monitored streamer list
Requires linkedAccounts configuration per guild
Requires PRESENCE INTENT to be enabled


Interactive UI Overhaul: Replaced text inputs with visual components

All commands now use modals, dropdowns, or user select menus
Better user experience with point-and-click interface
Pre-filled forms for editing existing data
Consistent ephemeral replies across all commands


Message Editing on Game Change: Updates existing notification instead of posting new

Added updateNotification() method in modules/twitch.js
Stores message ID and channel ID in liveStreamers Map
Edits message when game changes (prevents spam)
Updates thumbnail, viewer count, and game info
Footer shows "Twitch • Updated" on edited messages
Only sends new notification on initial go-live


Dynamic Help Menu: Auto-discovering command documentation

Help command dynamically loads all available commands
Automatically categorizes commands by function
Pulls descriptions from SlashCommandBuilder definitions
Shows total command count in footer
Always up-to-date when new commands are added



Changed

All Commands Updated to SlashCommandBuilder: Standardized command structure

commands/setup.js - Uses addChannelOption and addRoleOption
commands/setrole.js - Uses addRoleOption
commands/removerole.js - SlashCommandBuilder (no options)
commands/addstreamer.js - SlashCommandBuilder with modal
commands/removestreamer.js - SlashCommandBuilder with dropdown
commands/liststreamers.js - SlashCommandBuilder with dropdown
commands/addchannel.js - Uses addStringOption
commands/removechannel.js - SlashCommandBuilder with dropdown
commands/listchannels.js - SlashCommandBuilder with dropdown
commands/nudgetwitch.js - SlashCommandBuilder with dropdown
commands/nudgeyt.js - SlashCommandBuilder with dropdown
commands/linkaccount.js - SlashCommandBuilder with modal (NEW)
commands/manuallink.js - SlashCommandBuilder with user select + modal (NEW)
commands/unlinkaccount.js - SlashCommandBuilder with dropdown (NEW)
commands/listlinks.js - SlashCommandBuilder (NEW)
commands/help.js - Dynamic command discovery (UPDATED)


Twitch Monitor (modules/twitch.js):

Modified liveStreamers Map to store {game_id, memberId, messageId, channelId}
Added connectedAccountsCache Map for linked account lookups
Updated findMemberByTwitchUsername() to accept members Collection (no API calls)
Updated assignLiveRole() to check linked accounts first

Priority 1: Linked accounts from config
Priority 2: Cached members (no fetch)
Priority 3: Fetch all members and search


Updated removeLiveRole() with same priority system
Updated checkStreams() to store message IDs

Sends notification on go-live
Edits message on game change
Removes role when going offline


Added sendNotification() return value (message ID)
Modified updateNotification() to return boolean success indicator

Returns true on successful update
Returns false on any failure (missing message, channel not found, etc.)
Enables retry logic for failed updates




Index.js (index.js):

Added GuildMembers and GuildPresences intents
Added presenceUpdate event handler

Checks for linked Twitch accounts
Detects streaming activity on Twitch
Assigns/removes live role automatically
Works in real-time with Discord presence




Config Schema (utils/config.js):

Added linkedAccounts: {} to default guild configuration
Stores Discord user ID → Twitch username mappings
Persists across bot restarts


Help Command (commands/help.js):

Complete rewrite with dynamic command discovery
Iterates through client.commands collection
Categorizes commands automatically
Uses command mapping for organization
Displays in rich embed format



Fixed

Critical Null Reference Fixes: Resolved TypeError crashes across multiple commands

listlinks.js: Added optional chaining (guildConfig.twitch?.linkedAccounts) to safely check if twitch exists before accessing linkedAccounts
manuallink.js: Added initialization checks for guildConfig.twitch before accessing properties; ensures both guildConfig.twitch and guildConfig.twitch.linkedAccounts are properly initialized
unlinkaccount.js: Added initialization checks for guildConfig.twitch before accessing properties; ensures safe access to nested properties


Permission Restrictions: Added missing administrator permissions

removechannel.js: Added PermissionFlagsBits import and .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) to restrict command to administrators only
removestreamer.js: Added administrator permission restriction for consistency


Command Name Collision: Fixed duplicate command registration

removestreamer.js: Changed .setName('liststreamers') to .setName('removestreamer') to resolve registration collision with liststreamers.js
Implemented proper removal logic with dropdown menu for streamer selection
Added removal of custom messages when streamer is removed
Removed unused chunking logic that was copied from liststreamers.js


Notification Suppression Bug: Fixed failed notifications preventing retries

twitch.js: Modified checkStreams() to only set liveMap entry and call assignLiveRole when sendNotification returns a valid (non-null) messageId
Modified updateNotification() to return boolean success/failure indicator
Added conditional check: only updates cached game_id if notification update succeeds
Prevents caching of failed notifications that would suppress future notification attempts
Failed notifications (both initial and updates) will now be retried on subsequent check cycles
Added warning log when notification updates fail to indicate retry will occur


Performance: Reduced API calls with member caching

findMemberByTwitchUsername() now uses cache first
Only fetches when cache misses
Member IDs cached after first role assignment


Notification Spam: Fixed duplicate messages during long streams

Messages now edited on game change
Only new notification on initial go-live
Prevents channel flooding


Command Registration: All commands now properly register as slash commands

Consistent SlashCommandBuilder usage
Proper option type definitions
Auto-registration on bot startup



Technical Details

Added 4 new commands for account linking system
Total commands: 16 (up from 12)
All commands use ephemeral replies where appropriate
Enhanced error handling across all commands
Comprehensive logging for debugging
Message editing uses Discord.js Message.edit()
Presence detection uses ActivityType.Streaming
Cache system prevents repeated member lookups
User select menus use ComponentType.UserSelect
Modals use ModalBuilder and TextInputBuilder
Dropdowns use StringSelectMenuBuilder
All null-safety checks use optional chaining or explicit initialization
Proper error handling for missing configuration objects
Retry mechanism allows recovery from temporary Discord API failures for both initial notifications and game change updates
Boolean return values used for notification success/failure tracking

Security & Validation

Account links validated before storage
Admin-only commands properly restricted
Permission checks before role operations
Graceful handling of missing permissions
User-specific interaction collectors

Dependencies

No new dependencies added
Uses existing Discord.js v14 features
Compatible with current package versions

## [BETA 0.0.7] - 2026-01-20

### Added
- **Live Streamer Role Management**: Automatic role assignment/removal for live streamers
  - Configurable role that gets assigned when streamers go live
  - Automatically removed when streamers go offline
  - Optional feature - bot works with or without it
  - Smart Discord member matching by Twitch username
  - Member ID caching for efficient role management
- **Enhanced `/setup` Command**: Now includes optional live role parameter
  - Single command setup: `/setup channel:#notifications liverole:@LiveNow`
  - Can still be used without role: `/setup channel:#notifications`
  - Combined notification channel and role configuration
- **New `/setrole` Command**: Manage live streamer role independently
  - Add role: `/setrole role:@LiveNow`
  - Update role: `/setrole role:@NewRole`
  - Remove role: `/setrole` (no parameters)
  - Validates bot permissions and role hierarchy
  - Prevents assignment of managed roles (integration roles)
- **New `/removerole` Command**: Alias for removing live role configuration
  - Alternative to `/setrole` with no parameters
  - Provides clear feedback about manual role cleanup needed
- **Live Role Configuration Storage**: Added `liveRoleId` field to guild configs
  - Stored in `config.json` per guild
  - Persists across bot restarts
  - Automatically initialized as `null` for new guilds

### Changed
- **Twitch Monitor (`modules/twitch.js`)**:
  - Modified `liveStreamers` Map structure to store `{game_id, memberId}` objects
  - Added `findMemberByTwitchUsername()` method for Discord member discovery
    - Tries exact nickname match first
    - Falls back to exact username match
    - Then tries partial nickname match
    - Finally tries partial username match
  - Added `assignLiveRole()` method for role assignment
    - Validates role exists in guild
    - Checks if member already has role
    - Caches member ID for future operations
    - Handles permission errors gracefully
  - Added `removeLiveRole()` method for role removal
    - Uses cached member ID when available
    - Falls back to member search if needed
    - Only removes if member has the role
  - Updated `checkStreams()` to integrate role management
    - Assigns role on first go-live
    - Removes role when going offline
    - Maintains member ID cache throughout stream
- **Config Utilities (`utils/config.js`)**:
  - Added `liveRoleId: null` to default guild configuration template
  - Ensures all new guilds have role field initialized
- **Configuration Structure (`config.json`)**:
  - Added `liveRoleId` field to guild configuration schema
  - Maintains backward compatibility with existing configs

### Technical Details
- Role assignment uses Discord.js `GuildMember.roles.add()` and `.remove()`
- Member matching uses case-insensitive comparison for flexibility
- Comprehensive error handling for role operations
- Enhanced logging with role assignment/removal events
- Efficient caching prevents repeated member lookups
- Bot role hierarchy validation prevents permission errors

### Security & Validation
- Validates bot's role is higher than target role in hierarchy
- Prevents assignment of managed roles (e.g., bot integration roles)
- Checks role existence before operations
- Graceful handling of missing members or roles

---

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
- `nudgetwitch` command error: "checkSpecificStreamers is not a function"
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