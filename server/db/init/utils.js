/**
 * Generate a random password of given length.
 * @param {number} length - The desired length of the password.
 * @returns {string} The generated random password.
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
 * Creates a database table if it does not already exist.
 * @param {string} tableName - The name of the table to create.
 * @param {string} createStatement - The SQL statement defining the table columns and constraints.
 * @param {object} db - The database instance.
 * @returns {Promise<boolean>} True if the table already existed, false if it was created.
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
