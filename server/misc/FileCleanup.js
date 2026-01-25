/**
 * FileCleanup.js
 * 
 * Utility for garbage collecting unused file uploads.
 */

const FilesDB = require('../db/filesDB.js');
const path = require('path');
const fs = require('fs');

class FileCleanup {
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

            const Globals = require('./globals.js');
            const defaultImage = new Globals().get('DefaultEventImage').data;
            if (defaultImage && defaultImage.includes(`/api/files/${fileId}/`)) return;

            const fileRes = await FilesDB.getFileById(db, fileId);
            if (!fileRes.isError()) {
                const file = fileRes.getData();
                const uploadDir = path.join(__dirname, '../../data/files');
                const filePath = path.join(uploadDir, file.filename);
                
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
                
                await FilesDB.deleteFile(db, fileId);
            }
        } catch (error) {
            console.error('[FileCleanup] Error during cleanup:', error);
        }
    }
}

module.exports = FileCleanup;