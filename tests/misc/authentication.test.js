/**
 * authentication.test.js
 * 
 * Authentication hook tests.
 */

import checkAuthentication from '../../server/misc/authentication.js';
import { Permissions } from '../../server/misc/permissions.js';

describe('misc/authentication', () => {
    let req, reply;

    beforeEach(() => {
        // Mock Fastify Request and Reply objects
        req = {
            isAuthenticated: vi.fn().mockReturnValue(true),
            user: { id: 1 },
            db: {}
        };
        reply = {
            status: vi.fn().mockReturnThis(),
            send: vi.fn().mockReturnThis()
        };
    });

    test('Allow access if authenticated and no permissions are required', async () => {
        const hook = checkAuthentication();
        const result = await hook(req, reply);
        expect(result).toBeUndefined(); // Fastify hooks return undefined on success
        expect(reply.status).not.toHaveBeenCalled();
    });

    test('Denied (401) if session is not authenticated', async () => {
        req.isAuthenticated.mockReturnValue(false);
        const hook = checkAuthentication();
        await hook(req, reply);
        expect(reply.status).toHaveBeenCalledWith(401);
        expect(reply.send).toHaveBeenCalled();
    });

    test('Check single permission slug', async () => {
        vi.spyOn(Permissions, 'hasPermission').mockResolvedValue(true);
        const hook = checkAuthentication('user.manage');
        const result = await hook(req, reply);
        
        expect(Permissions.hasPermission).toHaveBeenCalledWith(req.db, 1, 'user.manage');
        expect(result).toBeUndefined();
    });

    test('Denied (403) if user is missing the required permission', async () => {
        vi.spyOn(Permissions, 'hasPermission').mockResolvedValue(false);
        const hook = checkAuthentication('user.manage');
        await hook(req, reply);
        
        expect(reply.status).toHaveBeenCalledWith(403);
        expect(reply.send).toHaveBeenCalled();
    });

    /** Test OR permission logic. */
    test('Check OR permission logic (| pipe symbol)', async () => {
        // user.read OR user.manage
        vi.spyOn(Permissions, 'hasPermission')
            .mockImplementation(async (db, id, perm) => perm === 'user.manage');
        
        const hook = checkAuthentication('user.read | user.manage');
        const result = await hook(req, reply);
        expect(result).toBeUndefined();
    });

    /** Test special meta-permission: perm:is_exec. */
    test('Check special meta-permission: perm:is_exec', async () => {
        vi.spyOn(Permissions, 'hasAnyPermission').mockResolvedValue(true);
        const hook = checkAuthentication('perm:is_exec');
        const result = await hook(req, reply);
        
        expect(Permissions.hasAnyPermission).toHaveBeenCalledWith(req.db, 1);
        expect(result).toBeUndefined();
    });
});
