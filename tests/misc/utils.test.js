const Utils = require('../../server/misc/utils');

describe('misc/utils', () => {
    test('getAcademicYearStart returns Sept 1st', () => {
        const start = Utils.getAcademicYearStart();
        const date = new Date(start);
        expect(date.getMonth()).toBe(8); // Sept
        expect(date.getDate()).toBe(1);
    });

    test('getBaseUrl returns correct URL', () => {
        const req = {
            protocol: 'https',
            get: vi.fn().mockReturnValue('example.com')
        };
        expect(Utils.getBaseUrl(req)).toBe('https://example.com');
    });
});
