import { Request, Response, NextFunction } from 'express';
import { Permissions } from './permissions.js';
import { DatabaseWrapper } from '../db/db.js';

interface AuthenticatedRequest extends Request {
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
const getPermissionType = (perm: string): string => {
    const colonPos = perm.indexOf(':');
    if (colonPos !== -1) {
        return perm.slice(0, colonPos);
    }
    return 'perm';
}


/**
 * Express middleware to verify authentication and complex permission requirements.
 */
const checkAuthentication = (...requirements: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const authReq = req as AuthenticatedRequest;
        if (!authReq.isAuthenticated || !authReq.isAuthenticated()) {
            return res.status(401).json({ message: 'Unauthorized: Please log in.' });
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
                return res.status(403).json({ message: 'Forbidden: Insufficient permissions.' });
            }
        }

        next();
    };
};

export default checkAuthentication;
