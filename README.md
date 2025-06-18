# ⚡ Blitzo



<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![WhatsApp](https://img.shields.io/badge/WhatsApp-Bot-25D366)
![Status](https://img.shields.io/badge/status-active-success)

**A powerful, modular WhatsApp bot with advanced permission management and beautiful terminal output**

[Features](#-features) • [Installation](#-installation) • [Commands](#-commands) • [Configuration](#-configuration) • [Contributing](#-contributing)

</div>

---

## 🌟 Features

### Core Features
- 🎨 **Colorized Terminal Logging** - Beautiful, readable message logs with timestamps
- 🔧 **Modular Command System** - Organized, extensible plugin-based architecture
- 🔄 **Command Aliases** - Multiple ways to execute the same command
- ⚙️ **Dynamic Prefix Configuration** - Change bot prefix on-the-fly
- 📱 **Full WhatsApp Integration** - Complete WhatsApp Web functionality
- 🔄 **Auto-Reconnection** - Handles disconnections gracefully

### Database Integration
- 🗄️ **MongoDB with Mongoose** - Robust database integration for persistent data
- 📊 **Session Management** - WhatsApp session persistence across restarts
- 👤 **User Management** - Track and manage user interactions
- 💬 **Message History** - Store and retrieve chat messages
- 🔧 **Command Tracking** - Monitor command usage and statistics

### Permission Management
- 👑 **Creator-Only Commands** - Exclusive access for bot owner
- 🛡️ **Moderator System** - Add/remove moderators with specific privileges
- 👥 **Group Admin Support** - Special commands for WhatsApp group admins
- 🔒 **Command Locking** - Temporarily disable specific commands

### Group Management
- 📊 **Group Information** - Detailed group stats and metadata
- 👥 **Member Management** - List members and group details
- 📢 **Mention All** - Tag all group members (admin only)
- 🔍 **Advanced Group Controls** - Full group management capabilities

## 🚀 Quick Start

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Better-Than-You/blitzo.git
   cd blitzo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Copy the `.env.example` file to `.env` in the root directory and edit it with your details:

   ```
   #.env
   # Creator Details
   CREATOR_NAME=Your Name 

   # The phone number format is: +<countrycode><phone_number>
   CREATOR_PHONE=+1234567890

   # MongoDB Connection
   MONGODB_URI=mongodb://localhost:27017/blitzo
   # Or for MongoDB Atlas:
   # MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/blitzo

   # Debug (optional)
   DEBUG=true
   ```

4. **Set up MongoDB**
   - Install MongoDB locally or use MongoDB Atlas
   - Ensure MongoDB is running on your specified URI
   - The bot will automatically create the necessary collections

5. **Start the bot**
   ```bash
   npm start
   ```

6. **Scan QR Code**
   - Open WhatsApp on your phone
   - Go to Settings > Linked Devices
   - Scan the QR code displayed in terminal

## 📋 Commands

### Core Commands
| Command | Aliases | Description | Permission |
|---------|---------|-------------|------------|
| `/help` | `h`, `commands`, `menu` | Show all available commands | Public |
| `/ping` | `p` | Test bot responsiveness | Public |
| `/status` | `s`, `stat` | Check bot status and uptime | Public |
| `/info` | `i`, `about` | Display bot information | Public |
| `/hi` | `hello`, `greet` | Get personalized welcome | Public |
| `/creator` | `contact`, `dev`, `owner` | Show creator contact info | Public |

### Configuration Commands
| Command | Aliases | Description | Permission |
|---------|---------|-------------|------------|
| `/prefix` | `setprefix`, `changeprefix` | Change bot prefix | [mods] |
| `/resetprefix` | `defaultprefix` | Reset prefix to default (/) | [mods] |
| `/lock` | `lockcmd` | Lock specific commands | [mods] |
| `/unlock` | `unlockcmd` | Unlock specific commands | [mods] |

### Moderation Commands
| Command | Aliases | Description | Permission |
|---------|---------|-------------|------------|
| `/addmod` | `mod+`, `promote` | Add user as moderator | [creator] |
| `/removemod` | `mod-`, `demote` | Remove user from moderators | [creator] |
| `/listmods` | `mods`, `modlist` | List all moderators | Public |
| `/clearmods` | `modclear` | Remove all moderators | [creator] |
| `/modtest` | `mtest` | Test moderator permissions | [mods] |
| `/creatortest` | `ctest` | Test creator permissions | [creator] |

### Group Commands
| Command | Aliases | Description | Permission |
|---------|---------|-------------|------------|
| `/groupinfo` | `gi`, `ginfo` | Show group information | [group] |
| `/members` | `m`, `list` | List group members | [group] |
| `/mention` | `all`, `everyone` | Mention all group members | [admin] |

### Development Commands
| Command | Aliases | Description | Permission |
|---------|---------|-------------|------------|
| `/mongotest` | `dbtest` | Test MongoDB connection and stats | [creator] |
| `/restart` | `reboot` | Restart the bot | [creator] |
| `/eval` | `run` | Execute JavaScript code | [creator] |

### Permission Levels
- **[creator]** - Bot creator only
- **[mods]** - Moderators and creator
- **[admin]** - WhatsApp group admins, moderators, and creator
- **[group]** - Group-only commands
- **Public** - Everyone can use

> **Note:** Always update the values in your new `.env` file to match your setup.

### Directory Structure
```
blitzo/
├── index.js                    # Main entry point
├── package.json                # Dependencies and scripts
├── .env                        # Environment variables
├── .env.example               # Environment template
├── README.md                  # This file
├── clearAuth.js               # Clear WhatsApp authentication
├── cache/                     # Runtime cache storage
├── auth_info_baileys/         # WhatsApp authentication (auto-generated)
└── src/
    ├── bot.js                 # Core WhatsApp bot class
    ├── config/
    │   └── botConfig.js       # Bot configuration and settings
    ├── database/
    │   ├── connection.js      # MongoDB/Mongoose connection
    │   ├── mongoSchema.js     # Mongoose schemas
    │   ├── authService.js     # Session management
    │   └── mongoAuthAdapter.js # WhatsApp session adapter
    ├── handlers/
    │   └── messageHandler.js  # Message processing and routing
    ├── commands/
    │   ├── commandManager.js  # Command handling and permissions
    │   └── plugins/
    │       ├── index.js       # Plugin exports
    │       ├── core.js        # Core bot commands
    │       ├── group.js       # Group management commands
    │       ├── moderation.js  # Moderation and permission commands
    │       └── development.js # Development and testing commands
    ├── cache/
    │   └── nameCache.js       # User name caching
    └── utils/
        ├── logger.js          # Colorized terminal logging
        └── helpers.js         # Utility functions
```

## 🔧 Development

### Database Schema

The bot uses Mongoose with the following main schemas:

**User Schema:**
- `jid` - WhatsApp JID (unique identifier)
- `name` - User's display name
- `phone` - Phone number
- `isCreator` - Creator status
- `isModerator` - Moderator status
- `createdAt` - Registration timestamp

**Message Schema:**
- `messageId` - Unique message identifier
- `sender` - Sender's JID
- `content` - Message content
- `timestamp` - Message timestamp
- `messageType` - Type of message (text, image, etc.)

**Command Schema:**
- `command` - Command name
- `executor` - User who executed the command
- `timestamp` - Execution timestamp
- `success` - Whether command succeeded

**Session Schema:**
- `sessionId` - Session identifier
- `data` - Session data (encrypted)
- `createdAt` - Session creation time
- `updatedAt` - Last update time

### Adding New Commands

1. Create a new command in the appropriate plugin file:
   ```javascript
   export const yourCommands = {
     yourcommand: {
       description: 'Your command description',
       aliases: ['alias1', 'alias2'],
       category: 'YourCategory',
       modsOnly: true, // Optional permission requirement
       creatorOnly: false, // Optional permission requirement
       handler: async (sock, messageInfo) => {
         // Your command logic here
         return await sock.sendReply(messageInfo, 'Response text')
       }
     }
   }
   ```

2. Export it in `src/commands/plugins/index.js`:
   ```javascript
   import { yourCommands } from './yourfile.js'
   
   export const pluginCommands = {
     ...existingCommands,
     ...yourCommands
   }
   ```

### Permission System

The bot uses a hierarchical permission system:

**Creator** > **Moderators** > **Group Admins** > **Regular Users**

- Use `creatorOnly: true` for creator-only commands
- Use `modsOnly: true` for moderator and creator access
- Use `adminOnly: true` for group admin, moderator, and creator access
- Use `groupOnly: true` for group-only commands

### Debug Mode

Enable debug logging by setting `DEBUG=true` in your `.env` file:
```bash
DEBUG=true npm start
```

### Usage Examples

### Basic Commands
```
User: /ping
Bot: 🏓 Pong! ⚡ Response Time: 45ms

User: /status  
Bot: ⚡ Blitzo Status
     ✅ Status: Running and healthy!
     ⏱️ Uptime: 2h 15m 30s
     🧠 Memory: 125MB
     ⚙️ Current Prefix: /
```

### Database Commands
```
Creator: /mongotest
Bot: 📊 MongoDB Statistics
     ✅ Connection: Active
     👥 Users: 150
     💬 Messages: 2,847
     🔧 Commands: 1,205
     📊 Sessions: 3
```

### Moderation
```
Creator: /addmod @user
Bot: ✅ Moderator Added Successfully!
     👤 User: +1234567890
     🛡️ Role: Moderator
     ⚡ They can now use moderator commands!

Moderator: /prefix !
Bot: ✅ Prefix Changed Successfully!
     🔄 Old Prefix: /
     🆕 New Prefix: !
```

### Group Management
```
User: /groupinfo
Bot: 👥 Group Information
     📝 Name: My Awesome Group
     👑 Owner: +1234567890
     📅 Created: 1/15/2024
     👥 Members: 25
     👑 Admins: 3
```

## 🛠️ Troubleshooting

### Common Issues

**Bot not responding to commands:**
- Check if the prefix is correct
- Ensure the bot is connected (check terminal output)
- Verify command permissions
- Check MongoDB connection status

**Database connection errors:**
- Verify MongoDB is running
- Check MONGODB_URI in .env file
- Ensure network connectivity to MongoDB server
- Check MongoDB authentication credentials

**QR Code not appearing:**
- Restart the bot
- Check your internet connection
- Clear authentication: `node clearAuth.js`

**Session persistence issues:**
- Check MongoDB connection
- Verify session storage in database
- Clear and re-authenticate if needed

**Permission errors:**
- Verify your phone number is correctly set in .env
- Check if you're using the right permission level for commands
- Ensure user data is properly stored in database

### Clear Authentication
If you need to re-authenticate:
```bash
node clearAuth.js
npm start
```

### Database Management
To reset or manage the database:
```bash
# Connect to MongoDB shell
mongosh mongodb://localhost:27017/blitzo

# View collections
show collections

# Clear specific data (use with caution)
db.users.deleteMany({})
db.messages.deleteMany({})
db.commands.deleteMany({})
db.sessions.deleteMany({})
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Setup
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style
- Follow modular architecture patterns
- Use ES6+ features and modules
- Minimal comments for production-ready code
- Test your changes thoroughly with the database integration

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with ❤️ by [Sujatro Chakraborty](https://github.com/Better-Than-You)**

If you found this project helpful, please consider giving it a ⭐!

</div>