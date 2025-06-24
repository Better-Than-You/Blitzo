import chalk from 'chalk';

class Logger {
    constructor() {
        this.prefix = '[WhatsApp Bot]';
    }

        info(message, hideIcon = false, ...args) {
            const icon = hideIcon ? '' : 'ℹ️  ';
            console.log(chalk.blue(`${this.prefix} ${icon}${message}`), ...args);
        }

        success(message, hideIcon = false, ...args) {
            const icon = hideIcon ? '' : '✅ ';
            console.log(chalk.green(`${this.prefix} ${icon}${message}`), ...args);
        }

        warn(message, hideIcon = false, ...args) {
            const icon = hideIcon ? '' : '⚠️  ';
            console.log(chalk.yellow(`${this.prefix} ${icon}${message}`), ...args);
        }

        error(message, hideIcon = false, ...args) {
            const icon = hideIcon ? '' : '❌ ';
            console.log(chalk.red(`${this.prefix} ${icon}${message}`), ...args);
        }

        message(message, hideIcon = false, ...args) {
            const icon = hideIcon ? '' : '💬 ';
            console.log(chalk.cyan(`${this.prefix} ${icon}${message}`), ...args);
        }

        debug(message, hideIcon = false, ...args) {
            if (process.env.DEBUG) {
                const icon = hideIcon ? '' : '🐛 ';
                console.log(chalk.gray(`${this.prefix} ${icon}${message}`), ...args);
            }
        }
}

export const logger = new Logger();
