/**
 * utils.ts
 * 
 * Helper functions for database initialization and seeding. 
 */

import { DatabaseWrapper } from '../db.js';

/**
 * Generate a random cryptographically non-secure password for development accounts.
 */
export function generateRandomPassword(length: number): string {
    const upperChars = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "M", "N", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
    const lowerChars = ["a", "b", "c", "d", "e", "f", "g", "h", "j", "k", "m", "n", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];
    const numbers = ["2", "3", "4", "5", "6", "7", "8", "9"];
    const symbols = ["!", "#", "$", "%", "&", "*", "+", "-", "?", "@", "\"", "'", "(", ")", ",", ".", "/", ":", ";", "<", "=", ">", "[", "\\", "]", "^", "_", "`", "{", "}", "~"];

    const allChars = upperChars.concat(lowerChars, numbers, symbols);

    let password = "";
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * allChars.length);
        password += allChars[randomIndex];
    }
    return password;
}

/**
 * Utility to create a table if it doesn't already exist in the schema.
 */
export async function createTable(tableName: string, createStatement: string, db: DatabaseWrapper): Promise<boolean> {
    const tableExists = await db.get(`
      SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?;
    `, [tableName]);

    if (tableExists) return true;

    await db.exec(`CREATE TABLE IF NOT EXISTS ${tableName} (${createStatement});`);
    return false;
}
