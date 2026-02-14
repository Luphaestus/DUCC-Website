import { FastifyRequest, FastifyReply } from 'fastify';
import { Permissions } from './permissions.js';
import { DatabaseWrapper } from '../db.js';
import Logger from './Logger.js';

interface AuthenticatedRequest extends FastifyRequest {
    user: any;
    db: DatabaseWrapper;
}

/**
 * authentication.ts
 * 
 * Provides middleware for verifying user sessions and enforcing RBAC.
 */

/**
 * Extracts the core permission name from a tagged permission string.
 */
const getPermissionName = (perm: string): string => {
    const colonPos = perm.indexOf(':');
    if (colonPos !== -1) {
        return perm.slice(colonPos + 1);
    }
    return perm;
}

/**
 * Identifies the type of permission requirement.
 */
// @ts-ignore
const getPermissionType = (perm: string): string => {
    const colonPos = perm.indexOf(':');
    if (colonPos !== -1) {
        return perm.slice(0, colonPos);
    }
    return 'perm';
}


/**
 * Fastify preHandler hook to verify authentication and complex permission requirements.
 */
const checkAuthentication = (...requirements: string[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const authReq = request as AuthenticatedRequest;
        if (!authReq.isAuthenticated || !authReq.isAuthenticated()) {
            return reply.status(401).send({ message: 'Unauthorized' });
        }

        for (const requirement of requirements) {
            let hasPermission = false;

            for (const permDetails of requirement.split('|').map(p => p.trim())) {
                const perm = getPermissionName(permDetails);

                if (permDetails === 'perm:is_exec') {
                    if (await Permissions.hasAnyPermission(authReq.db, authReq.user.id)) {
                        hasPermission = true;
                        break;
                    }
                    continue;
                }

                if (await Permissions.hasPermission(authReq.db, authReq.user.id, perm)) {
                    hasPermission = true;
                    break;
                }
            }

            if (!hasPermission) {
                return reply.status(403).send({ message: 'Forbidden: Insufficient permissions.' });
            }
        }
    };
};

export default checkAuthentication;
