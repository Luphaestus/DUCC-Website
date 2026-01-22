/**
 * utils.js
 * 
 * Helper functions for database initialization and seeding.
 */

/**
 * Generate a random cryptographically non-secure password for development accounts.
 * @param {number} length - Desired length.
 * @returns {string} - Random password string.
 */
function generateRandomPassword(length) {
    var upperChars = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "M", "N", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
    var lowerChars = ["a", "b", "c", "d", "e", "f", "g", "h", "j", "k", "m", "n", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];
    var numbers = ["2", "3", "4", "5", "6", "7", "8", "9"];
    var symbols = ["!", "#", "$", "%", "&", "*", "+", "-", "?", "@", "\"", "'", "(", ")", ",", ".", "/", ":", ";", "<", "=", ">", "[", "\\", "]", "^", "_", "`", "{", "}", "~"];

    var allChars = upperChars.concat(lowerChars, numbers, symbols);

    var password = "";
    for (var i = 0; i < length; i++) {
        var randomIndex = Math.floor(Math.random() * allChars.length);
        password += allChars[randomIndex];
    }
    return password;
}

/**
 * Utility to create a table if it doesn't already exist in the schema.
 * @param {string} tableName - Target table name.
 * @param {string} createStatement - SQL column definitions.
 * @param {object} db - SQLite instance.
 * @returns {Promise<boolean>} - True if it already existed, false if it was created.
 */
async function createTable(tableName, createStatement, db) {
    const tableExists = await db.get(`
      SELECT name FROM sqlite_master WHERE type='table' AND name=?;
    `, [tableName]);

    if (tableExists) return true;

    await db.exec(`CREATE TABLE IF NOT EXISTS ${tableName} (${createStatement});`);
    return false;
}

module.exports = { generateRandomPassword, createTable };
