const { statusObject } = require('../misc/status.js');

class CollegesDB {
    /**
     * Get all colleges
     * @param {object} db - Database connection
     * @returns {Promise<object>} Status object with data or error
     */
    static async getAll(db) {
        try {
            const colleges = await db.all('SELECT * FROM colleges ORDER BY name ASC');
            return new statusObject(200, 'Success', colleges);
        } catch (e) {
            console.error('Database error fetching colleges:', e);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Get college by name.
     * @param {object} db 
     * @param {string} name 
     * @returns {Promise<object|null>} College object or null
     */
    static async getCollegeByName(db, name) {
        try {
            const college = await db.get('SELECT * FROM colleges WHERE name = ?', [name]);
            return college;
        } catch (e) {
            console.error('Database error fetching college by name:', e);
            return null;
        }
    }
}

module.exports = CollegesDB;