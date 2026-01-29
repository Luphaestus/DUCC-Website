/**
 * utils.test.js
 * 
 * Server utility tests.
 */

import Utils from '../../server/misc/utils.js';

describe('misc/utils', () => {
    /** Test academic year start. */
    test('getAcademicYearStart always returns September 1st of the relevant year', () => {
        const start = Utils.getAcademicYearStart();
        const date = new Date(start);
        
        expect(date.getUTCMonth()).toBe(8); // September (0-indexed)
        expect(date.getUTCDate()).toBe(1);
    });

    /** Test base URL reconstruction. */
    test('getBaseUrl correctly reconstructs the root URL from an Express request object', () => {
        const req = {
            protocol: 'https',
            get: vi.fn().mockReturnValue('example.com')
        };
        expect(Utils.getBaseUrl(req)).toBe('https://example.com');
    });
});