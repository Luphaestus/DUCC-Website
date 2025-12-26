/**
 * Generate a random password.
 * @param {number} length
 * @returns {string}
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
 * Creates a database table if missing.
 * @param {string} tableName
 * @param {string} createStatement
 * @param {object} db
 * @returns {Promise<boolean>} True if existed, false if created.
 */
async function createTable(tableName, createStatement, db) {
    const tableExists = await db.get(`
      SELECT name FROM sqlite_master WHERE type='table' AND name=?;
    `, [tableName]);

    if (tableExists) return true;

    console.log(`Creating table: ${tableName}`);

    await db.exec(`CREATE TABLE IF NOT EXISTS ${tableName} (${createStatement});`);
    return false;
}

module.exports = { generateRandomPassword, createTable };