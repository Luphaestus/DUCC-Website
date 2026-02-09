/**
 * slidesDB.ts
 * 
 * This module manages the homepage slideshow images.
 */

import { statusObject } from '../misc/status.js';
import Logger from '../misc/Logger.js';
import { DatabaseWrapper } from './db.js';

export default class SlidesDB {
    /**
     * Fetch all slide images.
     */
    static async getSlides(db: DatabaseWrapper): Promise<statusObject> {
        try {
            const slides = await db.all(
                `SELECT f.id 
                 FROM slides s
                 JOIN files f ON s.file_id = f.id
                 ORDER BY s.display_order ASC`
            );
            const data = slides.map(s => ({
                id: s.id,
                url: `/api/files/${s.id}/download?view=true`
            }));
            return new statusObject(200, null, data);
        } catch (error) {
            Logger.error('Database error in getSlides:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Add a file to the slideshow.
     */
    static async addSlide(db: DatabaseWrapper, fileId: number | string): Promise<statusObject> {
        try {
            const maxOrder = await db.get('SELECT MAX(display_order) as maxOrder FROM slides');
            const nextOrder = (maxOrder && maxOrder.maxOrder !== null) ? maxOrder.maxOrder + 1 : 0;
            
            await db.run(
                'INSERT INTO slides (file_id, display_order) VALUES (?, ?)',
                [fileId, nextOrder]
            );
            return new statusObject(201, 'Slide added');
        } catch (error) {
            Logger.error('Database error in addSlide:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Remove a slide from the slideshow.
     */
    static async removeSlide(db: DatabaseWrapper, fileId: number | string): Promise<statusObject> {
        try {
            const result = await db.run('DELETE FROM slides WHERE file_id = ?', [fileId]);
            if (result.changes === 0) return new statusObject(404, 'Slide not found');
            return new statusObject(200, 'Slide removed');
        } catch (error) {
            Logger.error('Database error in removeSlide:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Update the display order of slides.
     */
    static async reorderSlides(db: DatabaseWrapper, orders: { fileId: number; order: number }[]): Promise<statusObject> {
        try {
            await db.run('START TRANSACTION');
            for (const item of orders) {
                await db.run(
                    'UPDATE slides SET display_order = ? WHERE file_id = ?',
                    [item.order, item.fileId]
                );
            }
            await db.run('COMMIT');
            return new statusObject(200, 'Order updated');
        } catch (error) {
            await db.run('ROLLBACK');
            Logger.error('Database error in reorderSlides:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Count the number of slides.
     */
    static async getSlideCount(db: DatabaseWrapper): Promise<statusObject> {
        try {
            const result = await db.get('SELECT COUNT(*) as count FROM slides');
            return new statusObject(200, null, result.count);
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }
}
