/**
 * collegesDB.js
 * 
 * This module manages database operations for Durham colleges.
 * Used for populating signup forms and linking users to their respective colleges.
 */

const { statusObject } = require('../misc/status.js');

class CollegesDB {
    /**
     * Fetch a list of all colleges in the system.
     * @param {object} db - Database connection.
     * @returns {Promise<statusObject>} - Data contains an array of college objects.
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
     * @param {object} db - Database connection.
     * @param {number} id - The ID of the college.
     * @returns {Promise<object|null>} - The college object or null if not found.
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