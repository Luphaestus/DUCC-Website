/**
 * fileCleanup.test.js
 * 
 * Tests for the FileCleanup utility service.
 * 
 * Scenarios covered:
 * - Handling of non-file URLs (should be ignored).
 * - Parsing of file IDs from API URLs.
 * - preventing deletion if file is used in:
 *   - Tags (image_id)
 *   - Events (image_url)
 *   - Users (profile_picture_path)
 *   - Globals (DefaultEventImage)
 * - Verifying physical and database deletion when file is truly unused.
 */

const fs = require('fs');
const FileCleanup = require('../../server/misc/FileCleanup.js');
const FilesDB = require('../../server/db/filesDB.js');

// Mock Globals
vi.mock('../../server/misc/globals.js', () => {
    return class {
        get(key) {
            return { data: '/api/files/999/download' }; // Mock default image
        }
    };
});

describe('FileCleanup', () => {
    let mockDb;

    beforeEach(() => {
        // Mock DB connection
        mockDb = {
            get: vi.fn()
        };
        vi.clearAllMocks();
        
        // Spy on FilesDB static methods
        vi.spyOn(FilesDB, 'getFileById').mockResolvedValue({ isError: () => true });
        vi.spyOn(FilesDB, 'deleteFile').mockResolvedValue({ isError: () => false });
        
        vi.spyOn(fs, 'existsSync').mockReturnValue(false);
        vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
    });
    
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should ignore non-file URLs', async () => {
        await FileCleanup.checkAndDeleteIfUnused(mockDb, '/images/static.png');
        expect(mockDb.get).not.toHaveBeenCalled();
    });

    it('should parse file ID from URL', async () => {
        // Force tags/events/globals to return null (unused)
        mockDb.get.mockResolvedValue(null);
        FilesDB.getFileById.mockResolvedValue({ 
            isError: () => false, 
            getData: () => ({ filename: 'test.jpg' }) 
        });

        await FileCleanup.checkAndDeleteIfUnused(mockDb, '/api/files/123/download');
        
        expect(mockDb.get).toHaveBeenCalledWith('SELECT 1 FROM tags WHERE image_id = ?', [123]);
    });

    it('should not delete if used in tags', async () => {
        mockDb.get.mockImplementation((query) => {
            if (query.includes('FROM tags')) return Promise.resolve({ 1: 1 });
            return Promise.resolve(null);
        });

        await FileCleanup.checkAndDeleteIfUnused(mockDb, '/api/files/123/download');
        expect(FilesDB.deleteFile).not.toHaveBeenCalled();
    });

    it('should not delete if used in events', async () => {
        mockDb.get.mockImplementation((query) => {
            if (query.includes('FROM events')) return Promise.resolve({ 1: 1 });
            return Promise.resolve(null);
        });

        await FileCleanup.checkAndDeleteIfUnused(mockDb, '/api/files/123/download');
        expect(FilesDB.deleteFile).not.toHaveBeenCalled();
    });

    it('should not delete if used in users (profile picture)', async () => {
        mockDb.get.mockImplementation((query) => {
            if (query.includes('FROM users')) return Promise.resolve({ 1: 1 });
            return Promise.resolve(null);
        });

        await FileCleanup.checkAndDeleteIfUnused(mockDb, '/api/files/123/download');
        expect(FilesDB.deleteFile).not.toHaveBeenCalled();
    });

    it('should not delete if used in globals (DefaultEventImage)', async () => {
        // Our mock global returns ID 999
        await FileCleanup.checkAndDeleteIfUnused(mockDb, '/api/files/999/download');
        expect(FilesDB.deleteFile).not.toHaveBeenCalled();
    });

    it('should delete file if unused', async () => {
        mockDb.get.mockResolvedValue(null); // Unused everywhere
        
        FilesDB.getFileById.mockResolvedValue({ 
            isError: () => false, 
            getData: () => ({ filename: 'test.jpg' }) 
        });
        
        fs.existsSync.mockReturnValue(true);

        await FileCleanup.checkAndDeleteIfUnused(mockDb, 123);
        
        expect(fs.unlinkSync).toHaveBeenCalled();
        expect(FilesDB.deleteFile).toHaveBeenCalledWith(mockDb, 123);
    });
});
