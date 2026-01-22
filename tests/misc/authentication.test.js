const checkAuthentication = require('../../server/misc/authentication');
const { Permissions } = require('../../server/misc/permissions');

describe('misc/authentication', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            isAuthenticated: vi.fn().mockReturnValue(true),
            user: { id: 1 },
            db: {}
        };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        next = vi.fn();
    });

    test('Allow if authenticated and no permissions required', async () => {
        const middleware = checkAuthentication();
        await middleware(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    test('401 if not authenticated', async () => {
        req.isAuthenticated.mockReturnValue(false);
        const middleware = checkAuthentication();
        await middleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('Check single permission', async () => {
        vi.spyOn(Permissions, 'hasPermission').mockResolvedValue(true);
        const middleware = checkAuthentication('user.manage');
        await middleware(req, res, next);
        expect(Permissions.hasPermission).toHaveBeenCalledWith(req.db, 1, 'user.manage');
        expect(next).toHaveBeenCalled();
    });

    test('403 if missing permission', async () => {
        vi.spyOn(Permissions, 'hasPermission').mockResolvedValue(false);
        const middleware = checkAuthentication('user.manage');
        await middleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    test('Check OR permission logic', async () => {
        // user.read OR user.manage
        // Fail first, pass second
        vi.spyOn(Permissions, 'hasPermission')
            .mockImplementation(async (db, id, perm) => perm === 'user.manage');
        
        const middleware = checkAuthentication('user.read | user.manage');
        await middleware(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    test('Check special perm:is_exec', async () => {
        vi.spyOn(Permissions, 'hasAnyPermission').mockResolvedValue(true);
        const middleware = checkAuthentication('perm:is_exec');
        await middleware(req, res, next);
        expect(Permissions.hasAnyPermission).toHaveBeenCalledWith(req.db, 1);
        expect(next).toHaveBeenCalled();
    });
});
