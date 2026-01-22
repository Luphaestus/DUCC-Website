const { statusObject } = require('../../server/misc/status');

describe('misc/status', () => {
    test('isError returns true for >= 400', () => {
        expect(new statusObject(200).isError()).toBe(false);
        expect(new statusObject(201).isError()).toBe(false);
        expect(new statusObject(400).isError()).toBe(true);
        expect(new statusObject(401).isError()).toBe(true);
        expect(new statusObject(403).isError()).toBe(true);
        expect(new statusObject(404).isError()).toBe(true);
        expect(new statusObject(500).isError()).toBe(true);
    });

    test('getResponse returns correct format', () => {
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };

        const success = new statusObject(200, 'Ok', { foo: 'bar' });
        success.getResponse(res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: 'Ok', data: { foo: 'bar' } });

        const error = new statusObject(404, 'Not Found');
        error.getResponse(res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Not Found' });
    });
});
