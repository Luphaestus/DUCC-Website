/**
 * authentication.test.js
 * 
 * Unit tests for the authentication and RBAC middleware.
 * Verifies standard session checks, single and multi-permission evaluation, 
 * and special meta-permissions (perm:is_exec).
 */

const checkAuthentication = require('../../server/misc/authentication');
const { Permissions } = require('../../server/misc/permissions');

describe('misc/authentication', () => {
    let req, res, next;

    beforeEach(() => {
        // Mock Express Request and Response objects
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

    test('Allow access if authenticated and no permissions are required', async () => {
        const middleware = checkAuthentication();
        await middleware(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    test('Denied (401) if session is not authenticated', async () => {
        req.isAuthenticated.mockReturnValue(false);
        const middleware = checkAuthentication();
        await middleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('Check single permission slug', async () => {
        vi.spyOn(Permissions, 'hasPermission').mockResolvedValue(true);
        const middleware = checkAuthentication('user.manage');
        await middleware(req, res, next);
        
        expect(Permissions.hasPermission).toHaveBeenCalledWith(req.db, 1, 'user.manage');
        expect(next).toHaveBeenCalled();
    });

    test('Denied (403) if user is missing the required permission', async () => {
        vi.spyOn(Permissions, 'hasPermission').mockResolvedValue(false);
        const middleware = checkAuthentication('user.manage');
        await middleware(req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    /**
     * Test logic for requirement strings like 'user.read | user.manage'.
     */
    test('Check OR permission logic (| pipe symbol)', async () => {
        // user.read OR user.manage
        // Mocking: fail first check, pass second
        vi.spyOn(Permissions, 'hasPermission')
            .mockImplementation(async (db, id, perm) => perm === 'user.manage');
        
        const middleware = checkAuthentication('user.read | user.manage');
        await middleware(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    /**
     * 'perm:is_exec' is a special meta-permission that returns true if the user has ANY assigned role.
     */
    test('Check special meta-permission: perm:is_exec', async () => {
        vi.spyOn(Permissions, 'hasAnyPermission').mockResolvedValue(true);
        const middleware = checkAuthentication('perm:is_exec');
        await middleware(req, res, next);
        
        expect(Permissions.hasAnyPermission).toHaveBeenCalledWith(req.db, 1);
        expect(next).toHaveBeenCalled();
    });
});