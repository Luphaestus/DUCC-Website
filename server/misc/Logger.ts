/**
 * Logger.ts
 * 
 * Simple structured logger for the application.
 */

import colors from 'ansi-colors';

class Logger {
    static getTimestamp(): string {
        return new Date().toISOString();
    }

    static info(message: any, ...args: any[]): void {
        console.log(`${colors.gray(this.getTimestamp())} [${colors.blue('INFO')}] ${message}`, ...args);
    }

    static warn(message: any, ...args: any[]): void {
        console.warn(`${colors.gray(this.getTimestamp())} [${colors.yellow('WARN')}] ${message}`, ...args);
    }

    static error(message: any, ...args: any[]): void {
        console.trace();
        console.error(`${colors.gray(this.getTimestamp())} [${colors.red('ERROR')}] ${message}`, ...args);
    }

    static debug(message: any, ...args: any[]): void {
        if (process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'development') {
            console.debug(`${colors.gray(this.getTimestamp())} [${colors.magenta('DEBUG')}] ${message}`, ...args);
        }
    }
}

export default Logger;