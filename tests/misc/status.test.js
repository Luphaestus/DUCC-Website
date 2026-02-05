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
    test('getResponse correctly formats the JSON payload for Fastify', () => {
        const reply = {
            status: vi.fn().mockReturnThis(),
            send: vi.fn().mockReturnThis()
        };

        // Success case
        const success = new statusObject(200, 'Ok', { foo: 'bar' });
        success.getResponse(reply);
        expect(reply.status).toHaveBeenCalledWith(200);
        expect(reply.send).toHaveBeenCalledWith({ message: 'Ok', data: { foo: 'bar' } });

        // Error case (omits data payload)
        const error = new statusObject(404, 'Not Found');
        error.getResponse(reply);
        expect(reply.status).toHaveBeenCalledWith(404);
        expect(reply.send).toHaveBeenCalledWith({ message: 'Not Found' });
    });
});
