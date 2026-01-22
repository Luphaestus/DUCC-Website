/**
 * utils.test.js
 * 
 * Unit tests for general server-side utility functions.
 */

const Utils = require('../../server/misc/utils');

describe('misc/utils', () => {
    /**
     * Requirement: Academic year always starts on September 1st.
     */
    test('getAcademicYearStart always returns September 1st of the relevant year', () => {
        const start = Utils.getAcademicYearStart();
        const date = new Date(start);
        
        expect(date.getUTCMonth()).toBe(8); // September (0-indexed)
        expect(date.getUTCDate()).toBe(1);
    });

    /**
     * Requirement: Correctly identifies protocol and host from Express request.
     */
    test('getBaseUrl correctly reconstructs the root URL from an Express request object', () => {
        const req = {
            protocol: 'https',
            get: vi.fn().mockReturnValue('example.com')
        };
        expect(Utils.getBaseUrl(req)).toBe('https://example.com');
    });
});