/**
 * tagsDB.js
 * 
 * This module manages the lifecycle of event tags and their associated user whitelists.
 * Tags are used to categorize events and restrict visibility or joining based on policies.
 */

const { statusObject } = require('../misc/status.js');
const FileCleanup = require('../misc/FileCleanup.js');

/**
 * Database operations for event tags and user whitelists.
 */
class TagsDB {
    /**
     * Fetch all tags registered in the system.
     * @param {object} db - Database connection.
     * @returns {Promise<statusObject>} - Data is an array of tag objects.
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
     * Fetch metadata for a specific tag by its ID.
     * @param {object} db - Database connection.
     * @param {number} id - Tag ID.
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
     * Fetch a list of tags by their IDs.
     * @param {object} db - Database connection.
     * @param {number[]} ids - Array of tag IDs.
     * @returns {Promise<object[]>} - Array of tag objects.
     */
    static async getTagListByIds(db, ids) {
        const placeholders = ids.map(() => '?').join(',');
        return await db.all(`SELECT * FROM tags WHERE id IN (${placeholders})`, ids);
    }

    /**
     * Create a new tag.
     * @param {object} db - Database connection.
     * @param {object} data - { name, color, description, min_difficulty, priority, join_policy, view_policy, image_id }.
     * @returns {Promise<statusObject>} - Data contains { id }.
     */
    static async createTag(db, data) {
        try {
            const { name, color, description, min_difficulty, priority, join_policy, view_policy, image_id } = data;
            const result = await db.run(
                'INSERT INTO tags (name, color, description, min_difficulty, priority, join_policy, view_policy, image_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [name, color || '#808080', description, min_difficulty, priority || 0, join_policy || 'open', view_policy || 'open', image_id]
            );
            return new statusObject(200, null, { id: result.lastID });
        } catch (error) {
            console.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Update an existing tag's metadata.
     */
    static async updateTag(db, id, data) {
        try {
            const { name, color, description, min_difficulty, priority, join_policy, view_policy, image_id } = data;
            
            const oldTag = await db.get('SELECT image_id FROM tags WHERE id = ?', [id]);
            
            await db.run(
                'UPDATE tags SET name=?, color=?, description=?, min_difficulty=?, priority=?, join_policy=?, view_policy=?, image_id=? WHERE id=?',
                [name, color, description, min_difficulty, priority, join_policy, view_policy, image_id, id]
            );

            if (oldTag && oldTag.image_id !== image_id) {
                await FileCleanup.checkAndDeleteIfUnused(db, oldTag.image_id);
            }

            return new statusObject(200, 'Tag updated');
        } catch (error) {
            console.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Reset tag image to default (none).
     * @param {object} db - Database connection.
     * @param {number} id - Tag ID.
     * @returns {Promise<statusObject>}
     */
    static async resetImage(db, id) {
        try {
            const tag = await db.get('SELECT image_id FROM tags WHERE id = ?', [id]);
            await db.run('UPDATE tags SET image_id = NULL WHERE id = ?', [id]);
            
            if (tag) await FileCleanup.checkAndDeleteIfUnused(db, tag.image_id);
            
            return new statusObject(200, 'Image removed');
        } catch (error) {
            console.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Delete a tag from the database.
     */
    static async deleteTag(db, id) {
        try {
            const tag = await db.get('SELECT image_id FROM tags WHERE id = ?', [id]);
            await db.run('DELETE FROM tags WHERE id = ?', [id]);
            
            if (tag) {
                await FileCleanup.checkAndDeleteIfUnused(db, tag.image_id);
            }
            
            return new statusObject(200, 'Tag deleted');
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Fetch a list of all users currently whitelisted for a specific tag.
     * @param {object} db - Database connection.
     * @param {number} tagId - Tag ID.
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
     * Check if a specific user is whitelisted for a tag.
     */
    static async isWhitelisted(db, tagId, userId) {
        const whitelisted = await db.get(
            'SELECT 1 FROM tag_whitelists WHERE tag_id = ? AND user_id = ?',
            [tagId, userId]
        );
        return !!whitelisted;
    }

    /**
     * Fetch a list of users explicitly assigned as managers for a tag scope.
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
     * Assign a user as a direct manager for a tag scope.
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
     * Remove a user from the direct management scope of a tag.
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
     */
    static async associateTag(db, eventId, tagId) {
        await db.run('INSERT OR IGNORE INTO event_tags (event_id, tag_id) VALUES (?, ?)', [eventId, tagId]);
    }

    /**
     * Remove all tag associations for a specific event.
     */
    static async clearEventTags(db, eventId) {
        await db.run('DELETE FROM event_tags WHERE event_id = ?', [eventId]);
    }

    /**
     * Fetch all tags associated with a specific event.
     * @returns {Promise<Array>} - List of tag objects.
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
     * Fetch all tags that a specific user is whitelisted for.
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