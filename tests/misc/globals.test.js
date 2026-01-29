/**
 * globals.test.js
 * 
 * Global Configuration manager tests.
 */

import Globals from '../../server/misc/globals.js';
import fs from 'fs';
import path from 'path';

const TEST_GLOBALS_PATH = path.join(process.cwd(), 'data', 'test_globals.json');

vi.mock('../../server/config.js', async () => {
    const path = await import('path');
    return {
        default: {
            paths: {
                globals: path.join(process.cwd(), 'data', 'test_globals.json'),
                data: path.join(process.cwd(), 'data')
            }
        }
    };
});

describe('misc/globals', () => {
    let globals;
    const defaultData = {
        Key1: { data: 10, permission: 'Guest', regexp: '^\\d+$' },
        Key2: { data: 'Secret', permission: 'President', regexp: '.*' }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        
        fs.writeFileSync(TEST_GLOBALS_PATH, JSON.stringify(defaultData));
        
        globals = new Globals();
    });

    afterEach(() => {
        // Clean up test file
        if (fs.existsSync(TEST_GLOBALS_PATH)) {
            fs.unlinkSync(TEST_GLOBALS_PATH);
        }
        vi.restoreAllMocks();
    });

    test('get correctly retrieves full configuration entry', () => {
        expect(globals.get('Key1')).toEqual(defaultData.Key1);
    });

    test('getInt correctly retrieves and casts value to integer', () => {
        expect(globals.getInt('Key1')).toBe(10);
    });

    /** Test RBAC filtering. */
    test('getKeys correctly filters results by permission level', () => {
        // Guest level: Key2 (President) should be missing
        const res = globals.getKeys(['Key1', 'Key2'], 'Guest');
        expect(res).toHaveProperty('Key1');
        expect(res).not.toHaveProperty('Key2');

        // President level: everything visible
        const res2 = globals.getKeys(['Key1', 'Key2'], 'President');
        expect(res2).toHaveProperty('Key1');
        expect(res2).toHaveProperty('Key2');
    });

    test('set correctly updates value and writes to persistent storage', () => {
        globals.set('Key1', 20);
        
        const fileContent = JSON.parse(fs.readFileSync(TEST_GLOBALS_PATH, 'utf-8'));
        expect(fileContent.Key1.data).toBe(20);
    });

    /** Test regex validation failure. */
    test('set correctly throws an error upon regex validation failure', () => {
        // Key1 expects a digit string
        expect(() => globals.set('Key1', 'invalid-string')).toThrow();
    });
});
