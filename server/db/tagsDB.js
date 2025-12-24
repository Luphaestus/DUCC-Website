const { statusObject } = require('../misc/status.js');

/**
 * TagsDB module.
 * Provides database operations for managing event tags and user whitelists.
 * Tags allow for fine-grained access control and categorization of events.
 */
class TagsDB {
    /**
     * Retrieves all tags from the database.
     * @param {object} db - The database instance.
     * @returns {Promise<statusObject>} A list of all tags.
     */
    static async getAllTags(db) {
        try {
            const tags = await db.all('SELECT * FROM tags ORDER BY name ASC');
            return new statusObject(200, null, tags);
        } catch (error) {
            console.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Retrieves a single tag by its ID.
     * @param {object} db - The database instance.
     * @param {number} id - The tag ID.
     * @returns {Promise<statusObject>} The tag data.
     */
    static async getTagById(db, id) {
        try {
            const tag = await db.get('SELECT * FROM tags WHERE id = ?', [id]);
            if (!tag) return new statusObject(404, 'Tag not found');
            return new statusObject(200, null, tag);
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Creates a new tag record.
     * @param {object} db - The database instance.
     * @param {object} data - The tag data (name, color, description, min_difficulty).
     * @returns {Promise<statusObject>} The ID of the new tag.
     */
    static async createTag(db, data) {
        try {
            const { name, color, description, min_difficulty } = data;
            const result = await db.run(
                'INSERT INTO tags (name, color, description, min_difficulty) VALUES (?, ?, ?, ?)',
                [name, color || '#808080', description, min_difficulty]
            );
            return new statusObject(200, null, { id: result.lastID });
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Updates an existing tag record.
     * @param {object} db - The database instance.
     * @param {number} id - The tag ID.
     * @param {object} data - The updated tag fields.
     * @returns {Promise<statusObject>}
     */
    static async updateTag(db, id, data) {
        try {
            const { name, color, description, min_difficulty } = data;
            await db.run(
                'UPDATE tags SET name=?, color=?, description=?, min_difficulty=? WHERE id=?',
                [name, color, description, min_difficulty, id]
            );
            return new statusObject(200, 'Tag updated');
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Deletes a tag record and its associated whitelists/event mappings (via cascading or manual cleanup).
     * @param {object} db - The database instance.
     * @param {number} id - The tag ID.
     * @returns {Promise<statusObject>}
     */
    static async deleteTag(db, id) {
        try {
            await db.run('DELETE FROM tags WHERE id = ?', [id]);
            return new statusObject(200, 'Tag deleted');
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Retrieves the list of users who are whitelisted for a specific tag.
     * @param {object} db - The database instance.
     * @param {number} tagId - The tag ID.
     * @returns {Promise<statusObject>} A list of users.
     */
    static async getWhitelist(db, tagId) {
        try {
            const users = await db.all(`
                SELECT u.id, u.first_name, u.last_name, u.email
                FROM users u
                JOIN tag_whitelists tw ON u.id = tw.user_id
                WHERE tw.tag_id = ?
            `, [tagId]);
            return new statusObject(200, null, users);
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Adds a user to the whitelist for a specific tag.
     * @param {object} db - The database instance.
     * @param {number} tagId - The tag ID.
     * @param {number} userId - The user ID.
     * @returns {Promise<statusObject>}
     */
    static async addToWhitelist(db, tagId, userId) {
        try {
            await db.run('INSERT OR IGNORE INTO tag_whitelists (tag_id, user_id) VALUES (?, ?)', [tagId, userId]);
            return new statusObject(200, 'User added to whitelist');
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Removes a user from the whitelist for a specific tag.
     * @param {object} db - The database instance.
     * @param {number} tagId - The tag ID.
     * @param {number} userId - The user ID.
     * @returns {Promise<statusObject>}
     */
    static async removeFromWhitelist(db, tagId, userId) {
        try {
            await db.run('DELETE FROM tag_whitelists WHERE tag_id = ? AND user_id = ?', [tagId, userId]);
            return new statusObject(200, 'User removed from whitelist');
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Maps a tag to an event.
     * @param {object} db - The database instance.
     * @param {number} eventId - The event ID.
     * @param {number} tagId - The tag ID.
     */
    static async associateTag(db, eventId, tagId) {
        await db.run('INSERT OR IGNORE INTO event_tags (event_id, tag_id) VALUES (?, ?)', [eventId, tagId]);
    }

    /**
     * Removes all tag mappings for a specific event.
     * @param {object} db - The database instance.
     * @param {number} eventId - The event ID.
     */
    static async clearEventTags(db, eventId) {
        await db.run('DELETE FROM event_tags WHERE event_id = ?', [eventId]);
    }

    /**
     * Retrieves all tags associated with a specific event.
     * @param {object} db - The database instance.
     * @param {number} eventId - The event ID.
     * @returns {Promise<Array>} List of tag objects.
     */
    static async getTagsForEvent(db, eventId) {
        return db.all(`
            SELECT t.* 
            FROM tags t
            JOIN event_tags et ON t.id = et.tag_id
            WHERE et.event_id = ?
        `, [eventId]);
    }

    /**
     * Retrieves all tags for which a user is whitelisted.
     * @param {object} db - The database instance.
     * @param {number} userId - The user ID.
     * @returns {Promise<Array>} List of tag objects.
     */
    static async getTagsForUser(db, userId) {
        return db.all(`
            SELECT t.* 
            FROM tags t
            JOIN tag_whitelists tw ON t.id = tw.tag_id
            WHERE tw.user_id = ?
        `, [userId]);
    }
}

module.exports = TagsDB;
