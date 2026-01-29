/**
 * status.test.js
 * 
 * Status Object tests.
 */

import { statusObject } from '../../server/misc/status.js';

describe('misc/status', () => {
    /** Test error status codes. */
    test('isError correctly identifies error status codes (>= 400)', () => {
        expect(new statusObject(200).isError()).toBe(false);
        expect(new statusObject(201).isError()).toBe(false);
        expect(new statusObject(400).isError()).toBe(true);
        expect(new statusObject(401).isError()).toBe(true);
        expect(new statusObject(403).isError()).toBe(true);
        expect(new statusObject(404).isError()).toBe(true);
        expect(new statusObject(500).isError()).toBe(true);
    });

    /** Test JSON response formatting. */
    test('getResponse correctly formats the JSON payload for Express', () => {
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };

        // Success case
        const success = new statusObject(200, 'Ok', { foo: 'bar' });
        success.getResponse(res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: 'Ok', data: { foo: 'bar' } });

        // Error case (omits data payload)
        const error = new statusObject(404, 'Not Found');
        error.getResponse(res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Not Found' });
    });
});