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

## Note:
### 🗄️ **Database integration coming soon!**

---

## 🌟 Features

### Core Features
- 🎨 **Colorized Terminal Logging** - Beautiful, readable message logs with timestamps
- 🔧 **Modular Command System** - Organized, extensible plugin-based architecture
- 🔄 **Command Aliases** - Multiple ways to execute the same command
- ⚙️ **Dynamic Prefix Configuration** - Change bot prefix on-the-fly
- 📱 **Full WhatsApp Integration** - Complete WhatsApp Web functionality
- 🔄 **Auto-Reconnection** - Handles disconnections gracefully

### Permission Management
- 👑 **Creator-Only Commands** - Exclusive access for bot owner
- 🛡️ **Moderator System** - Add/remove moderators with specific privileges
- 👥 **Group Admin Support** - Special commands for WhatsApp group admins
- 🔒 **Command Locking** - Temporarily disable specific commands

### Group Management
- 📊 **Group Information** - Detailed group stats and metadata
- 👥 **Member Management** - List members and group details
- 📢 **Mention All** - Tag all group members (admin only)
- 🔍 **Advanced Group Controls** - Coming soon!

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
   Edit `.env` with your details:
   ```env
   # Creator Information
   CREATOR_NAME=Your Name
   CREATOR_PHONE=+1234567890
   CREATOR_JID=1234567890@s.whatsapp.net
   CREATOR_EMAIL=your.email@example.com
   CREATOR_WEBSITE=https://yourwebsite.com
   CREATOR_SOCIAL=@yourusername

   # Bot Configuration
   BOT_NAME=YourBotName
   BOT_VERSION=1.0.0
   BOT_DESCRIPTION=Your bot description
   ```

4. **Start the bot**
   ```bash
   npm start
   ```

5. **Scan QR Code**
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

### Permission Levels
- **[creator]** - Bot creator only
- **[mods]** - Moderators and creator
- **[admin]** - WhatsApp group admins, moderators, and creator
- **[group]** - Group-only commands
- **Public** - Everyone can use

## ⚙️ Configuration

### Environment Variables

Copy the `.env.example` file to `.env` in the root directory and edit it with your details:

```env
# Creator Details
CREATOR_NAME=Your Name 

# The phone number format is: +<countrycode><phone_number>
CREATOR_PHONE=+1234567890

# Debug (optional)
DEBUG=true
```

> **Note:** Always update the values in your new `.env` file to match your setup.
```

### Directory Structure
```
blitzo/
├── index.js                    # Main entry point
├── package.json                # Dependencies and scripts
├── .env                        # Environment variables
├── .env.example               # Environment template
├── README.md                  # This file
├── auth_info_baileys/         # WhatsApp authentication (auto-generated)
└── src/
    ├── bot.js                 # Core WhatsApp bot class
    ├── config/
    │   └── botConfig.js       # Bot configuration and settings
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
    └── utils/
        ├── logger.js          # Colorized terminal logging
        ├── helpers.js         # Utility functions
        └── sockHelpers.js     # Socket helper functions
```

## 🔧 Development

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

## 📱 Usage Examples

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

**QR Code not appearing:**
- Restart the bot
- Check your internet connection
- Clear authentication: `npm run clearauth`

**Permission errors:**
- Verify your JID is correctly set in `.env`
- Check if you're using the right permission level for commands

### Clear Authentication
If you need to re-authenticate:
```bash
node clearAuth.js
npm start
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
- Add appropriate comments and documentation
- Test your changes thoroughly

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with ❤️ by [Sujatro Chakraborty](https://github.com/Better-Than-You)**

If you found this project helpful, please consider giving it a ⭐!

</div>