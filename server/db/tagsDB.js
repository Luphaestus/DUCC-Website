const { statusObject } = require('../misc/status.js');

/**
 * Database operations for event tags and user whitelists.
 */
class TagsDB {
    /**
     * Fetch all tags.
     * @param {object} db
     * @returns {Promise<statusObject>}
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
     * Fetch a tag by ID.
     * @param {object} db
     * @param {number} id
     * @returns {Promise<statusObject>}
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
     * Create a new tag.
     * @param {object} db
     * @param {object} data
     * @returns {Promise<statusObject>}
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
     * Update a tag.
     * @param {object} db
     * @param {number} id
     * @param {object} data
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
     * Delete a tag.
     * @param {object} db
     * @param {number} id
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
     * Fetch whitelisted users for a tag.
     * @param {object} db
     * @param {number} tagId
     * @returns {Promise<statusObject>}
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
     * Add a user to a tag's whitelist.
     * @param {object} db
     * @param {number} tagId
     * @param {number} userId
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
     * Remove a user from a tag's whitelist.
     * @param {object} db
     * @param {number} tagId
     * @param {number} userId
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
     * Check if a user is whitelisted for a tag.
     * @param {object} db 
     * @param {number} tagId 
     * @param {number} userId 
     * @returns {Promise<boolean>}
     */
    static async isWhitelisted(db, tagId, userId) {
        const whitelisted = await db.get(
            'SELECT 1 FROM tag_whitelists WHERE tag_id = ? AND user_id = ?',
            [tagId, userId]
        );
        return !!whitelisted;
    }

    /**
     * Fetch managers for a tag.
     * @param {object} db
     * @param {number} tagId
     * @returns {Promise<statusObject>}
     */
    static async getManagers(db, tagId) {
        try {
            const users = await db.all(`
                SELECT u.id, u.first_name, u.last_name, u.email
                FROM users u
                JOIN user_managed_tags umt ON u.id = umt.user_id
                WHERE umt.tag_id = ?
            `, [tagId]);
            return new statusObject(200, null, users);
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Add a manager to a tag.
     * @param {object} db
     * @param {number} tagId
     * @param {number} userId
     * @returns {Promise<statusObject>}
     */
    static async addManager(db, tagId, userId) {
        try {
            await db.run('INSERT OR IGNORE INTO user_managed_tags (tag_id, user_id) VALUES (?, ?)', [tagId, userId]);
            return new statusObject(200, 'Manager added');
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Remove a manager from a tag.
     * @param {object} db
     * @param {number} tagId
     * @param {number} userId
     * @returns {Promise<statusObject>}
     */
    static async removeManager(db, tagId, userId) {
        try {
            await db.run('DELETE FROM user_managed_tags WHERE tag_id = ? AND user_id = ?', [tagId, userId]);
            return new statusObject(200, 'Manager removed');
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Link a tag to an event.
     * @param {object} db
     * @param {number} eventId
     * @param {number} tagId
     */
    static async associateTag(db, eventId, tagId) {
        await db.run('INSERT OR IGNORE INTO event_tags (event_id, tag_id) VALUES (?, ?)', [eventId, tagId]);
    }

    /**
     * Remove all tags from an event.
     * @param {object} db
     * @param {number} eventId
     */
    static async clearEventTags(db, eventId) {
        await db.run('DELETE FROM event_tags WHERE event_id = ?', [eventId]);
    }

    /**
     * Fetch tags linked to an event.
     * @param {object} db
     * @param {number} eventId
     * @returns {Promise<Array>}
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
     * Fetch tags a user is whitelisted for.
     * @param {object} db
     * @param {number} userId
     * @returns {Promise<Array>}
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