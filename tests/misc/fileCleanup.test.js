/**
 * fileCleanup.test.js
 * 
 * FileCleanup service tests.
 */

import fs from 'fs';
import path from 'path';
import FileCleanup from '../../server/misc/FileCleanup.js';
import FilesDB from '../../server/db/filesDB.js';

const TEST_FILES_DIR = path.join(process.cwd(), 'data', 'test_files');

vi.mock('../../server/config.js', () => {
    return {
        default: {
            paths: {
                files: path.join(process.cwd(), 'data', 'test_files'),
                globals: path.join(process.cwd(), 'data', 'globals.json')
            }
        }
    };
});

// Mock Globals
vi.mock('../../server/misc/globals.js', () => {
    return {
        default: class {
            get(key) {
                return { data: '/api/files/999/download' }; // Mock default image
            }
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
        
        if (!fs.existsSync(TEST_FILES_DIR)) {
            fs.mkdirSync(TEST_FILES_DIR, { recursive: true });
        }
        fs.writeFileSync(path.join(TEST_FILES_DIR, 'test.jpg'), 'dummy content');
    });
    
    afterEach(() => {
        vi.restoreAllMocks();
        if (fs.existsSync(TEST_FILES_DIR)) {
            fs.rmSync(TEST_FILES_DIR, { recursive: true, force: true });
        }
    });

    it('should ignore non-file URLs', async () => {
        await FileCleanup.checkAndDeleteIfUnused(mockDb, '/images/static.png');
        expect(mockDb.get).not.toHaveBeenCalled();
    });

    it('should parse file ID from URL', async () => {
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
        // The mock global returns ID 999
        await FileCleanup.checkAndDeleteIfUnused(mockDb, '/api/files/999/download');
        expect(FilesDB.deleteFile).not.toHaveBeenCalled();
    });

    it('should delete file if unused', async () => {
        mockDb.get.mockResolvedValue(null); // Unused everywhere
        
        FilesDB.getFileById.mockResolvedValue({ 
            isError: () => false, 
            getData: () => ({ filename: 'test.jpg' }) 
        });
        
        await FileCleanup.checkAndDeleteIfUnused(mockDb, 123);
        
        const filePath = path.join(TEST_FILES_DIR, 'test.jpg');
        expect(fs.existsSync(filePath)).toBe(false);
        expect(FilesDB.deleteFile).toHaveBeenCalledWith(mockDb, 123);
    });
});