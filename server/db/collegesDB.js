/**
 * collegesDB.js
 * 
 * This module manages database operations for Durham colleges.
 */

const { statusObject } = require('../misc/status.js');

class CollegesDB {
    /**
     * Fetch a list of all colleges in the system.
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
     * Fetch metadata for a specific college by its ID.
     */
    static async getCollegeById(db, id) {
        try {
            const college = await db.get('SELECT * FROM colleges WHERE id = ?', [id]);
            return college;
        } catch (e) {
            console.error('Database error fetching college by ID:', e);
            return null;
        }
    }
}

module.exports = CollegesDB;