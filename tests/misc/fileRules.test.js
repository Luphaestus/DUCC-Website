const FileRules = require('../../server/misc/fileRules');

describe('misc/fileRules', () => {
    test('Public files accessible by everyone', () => {
        const file = { visibility: 'public' };
        expect(FileRules.canAccessFile(file, 'public')).toBe(true);
        expect(FileRules.canAccessFile(file, 'member')).toBe(true);
        expect(FileRules.canAccessFile(file, 'exec')).toBe(true);
    });

    test('Member files accessible by member and exec', () => {
        const file = { visibility: 'members' };
        expect(FileRules.canAccessFile(file, 'public')).toBe(false);
        expect(FileRules.canAccessFile(file, 'member')).toBe(true);
        expect(FileRules.canAccessFile(file, 'exec')).toBe(true);
    });

    test('Exec files accessible by exec only', () => {
        const file = { visibility: 'execs' };
        expect(FileRules.canAccessFile(file, 'public')).toBe(false);
        expect(FileRules.canAccessFile(file, 'member')).toBe(false);
        expect(FileRules.canAccessFile(file, 'exec')).toBe(true);
    });
});
