/**
 * FileCleanup.js
 * 
 * Utility for garbage collecting unused file uploads.
 */

import FilesDB from '../db/filesDB.js';
import path from 'path';
import fs from 'fs';
import Globals from './globals.js';
import config from '../config.js';
import Logger from './Logger.js';

export default class FileCleanup {
    /**
     * Checks if a file is still in use by any entity.
     */
    static async checkAndDeleteIfUnused(db, fileIdOrUrl) {
        if (!fileIdOrUrl) return;

        let fileId = null;

        if (typeof fileIdOrUrl === 'string') {
            const match = fileIdOrUrl.match(/\/api\/files\/(\d+)\//);
            if (match) {
                fileId = parseInt(match[1], 10);
            } else if (!isNaN(parseInt(fileIdOrUrl, 10))) {
                fileId = parseInt(fileIdOrUrl, 10);
            } else {
                return;
            }
        } else {
            fileId = fileIdOrUrl;
        }

        if (!fileId) return;

        try {
            const tagUsage = await db.get('SELECT 1 FROM tags WHERE image_id = ?', [fileId]);
            if (tagUsage) return;

            const eventUsage = await db.get('SELECT 1 FROM events WHERE image_id = ?', [fileId]);
            if (eventUsage) return;

            const userUsage = await db.get('SELECT 1 FROM users WHERE profile_picture_id = ?', [fileId]);
            if (userUsage) return;

            const slideUsage = await db.get('SELECT 1 FROM slides WHERE file_id = ?', [fileId]);
            if (slideUsage) return;

            const defaultImage = new Globals().get('DefaultEventImage').data;
            if (defaultImage && defaultImage.includes(`/api/files/${fileId}/`)) return;

            const fileRes = await FilesDB.getFileById(db, fileId);
            if (!fileRes.isError()) {
                const file = fileRes.getData();
                const uploadDir = config.paths.files;
                const filePath = path.join(uploadDir, file.filename);
                
                try {
                    await fs.promises.unlink(filePath);
                } catch (err) {
                    // Ignore if file missing
                }
                
                await FilesDB.deleteFile(db, fileId);
            }
        } catch (error) {
            Logger.error('[FileCleanup] Error during cleanup:', error);
        }
    }
}
