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
        
        vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(defaultData));
        vi.spyOn(fs, 'existsSync').mockReturnValue(true);
        vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
        
        globals = new Globals();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('get retrieves value', () => {
        expect(globals.get('Key1')).toEqual(defaultData.Key1);
    });

    test('getInt retrieves integer', () => {
        expect(globals.getInt('Key1')).toBe(10);
    });

    test('getKeys filters by permission', () => {
        const res = globals.getKeys(['Key1', 'Key2'], 'Guest');
        expect(res).toHaveProperty('Key1');
        expect(res).not.toHaveProperty('Key2');

        const res2 = globals.getKeys(['Key1', 'Key2'], 'President');
        expect(res2).toHaveProperty('Key1');
        expect(res2).toHaveProperty('Key2');
    });

    test('set updates value and writes to file', () => {
        globals.set('Key1', 20);
        expect(fs.writeFileSync).toHaveBeenCalled();
        const callArg = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
        expect(callArg.Key1.data).toBe(20);
    });

    test('set throws on validation error', () => {
        expect(() => globals.set('Key1', 'invalid')).toThrow();
    });
});