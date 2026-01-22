/**
 * globals.test.js
 * 
 * Unit tests for the Global Configuration manager.
 * Mocks the file system to verify CRUD operations, RBAC filtering, 
 * and regular expression validation without affecting the actual 'globals.json' file.
 */

const Globals = require('../../server/misc/globals');
const fs = require('fs');

describe('misc/globals', () => {
    let globals;
    const defaultData = {
        Key1: { data: 10, permission: 'Guest', regexp: '^\\d+$' },
        Key2: { data: 'Secret', permission: 'President', regexp: '.*' }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Mocking fs to prevent real file writes
        vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(defaultData));
        vi.spyOn(fs, 'existsSync').mockReturnValue(true);
        vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
        
        globals = new Globals();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('get correctly retrieves full configuration entry', () => {
        expect(globals.get('Key1')).toEqual(defaultData.Key1);
    });

    test('getInt correctly retrieves and casts value to integer', () => {
        expect(globals.getInt('Key1')).toBe(10);
    });

    /**
     * RBAC Check: Ensure sensitive configuration keys are hidden from low-privilege users.
     */
    test('getKeys correctly filters results by permission level', () => {
        // 1. Guest level: Key2 (President) should be missing
        const res = globals.getKeys(['Key1', 'Key2'], 'Guest');
        expect(res).toHaveProperty('Key1');
        expect(res).not.toHaveProperty('Key2');

        // 2. President level: everything visible
        const res2 = globals.getKeys(['Key1', 'Key2'], 'President');
        expect(res2).toHaveProperty('Key1');
        expect(res2).toHaveProperty('Key2');
    });

    test('set correctly updates value and writes to persistent storage', () => {
        globals.set('Key1', 20);
        
        // Verify file write
        expect(fs.writeFileSync).toHaveBeenCalled();
        const callArg = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
        expect(callArg.Key1.data).toBe(20);
    });

    /**
     * Validation Check: 'set' should reject values that don't match the key's regex.
     */
    test('set correctly throws an error upon regex validation failure', () => {
        // Key1 expects a digit string
        expect(() => globals.set('Key1', 'invalid-string')).toThrow();
    });
});
