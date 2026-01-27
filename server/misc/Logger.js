/**
 * Logger.js
 * 
 * Simple structured logger for the application.
 */

import colors from 'ansi-colors';

class Logger {
    static getTimestamp() {
        return new Date().toISOString();
    }

    static info(message, ...args) {
        console.log(`${colors.gray(this.getTimestamp())} [${colors.blue('INFO')}] ${message}`, ...args);
    }

    static warn(message, ...args) {
        console.warn(`${colors.gray(this.getTimestamp())} [${colors.yellow('WARN')}] ${message}`, ...args);
    }

    static error(message, ...args) {
        console.error(`${colors.gray(this.getTimestamp())} [${colors.red('ERROR')}] ${message}`, ...args);
    }

    static debug(message, ...args) {
        if (process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'development') {
            console.debug(`${colors.gray(this.getTimestamp())} [${colors.magenta('DEBUG')}] ${message}`, ...args);
        }
    }
}

export default Logger;
