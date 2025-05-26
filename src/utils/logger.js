import chalk from 'chalk';

class Logger {
    constructor() {
        this.prefix = '[WhatsApp Bot]';
    }

    info(message, ...args) {
        console.log(chalk.blue(`${this.prefix} ℹ️  ${message}`), ...args);
    }

    success(message, ...args) {
        console.log(chalk.green(`${this.prefix} ✅ ${message}`), ...args);
    }

    warn(message, ...args) {
        console.log(chalk.yellow(`${this.prefix} ⚠️  ${message}`), ...args);
    }

    error(message, ...args) {
        console.log(chalk.red(`${this.prefix} ❌ ${message}`), ...args);
    }

    message(message, ...args) {
        console.log(chalk.cyan(`${this.prefix} 💬 ${message}`), ...args);
    }

    debug(message, ...args) {
        if (process.env.DEBUG) {
            console.log(chalk.gray(`${this.prefix} 🐛 ${message}`), ...args);
        }
    }
}

export const logger = new Logger();
