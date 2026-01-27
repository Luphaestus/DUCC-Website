/**
 * authentication.js
 * 
 * Provides middleware for verifying user sessions and enforcing RBAC.
 */

import { Permissions } from './permissions.js';

/**
 * Extracts the core permission name from a tagged permission string.
 */
const getPermissionName = (perm) => {
    const colonPos = perm.indexOf(':');
    if (colonPos !== -1) {
        return perm.slice(colonPos + 1);
    }
    return perm;
}

/**
 * Identifies the type of permission requirement.
 */
const getPermissionType = (perm) => {
    const colonPos = perm.indexOf(':');
    if (colonPos !== -1) {
        return perm.slice(0, colonPos);
    }
    return 'perm';
}


/**
 * Express middleware to verify authentication and complex permission requirements.
 */
const checkAuthentication = (...requirements) => {
    return async (req, res, next) => {
        if (!req.isAuthenticated || !req.isAuthenticated()) {
            return res.status(401).json({ message: 'Unauthorized: Please log in.' });
        }

        for (const requirement of requirements) {
            let hasPermission = false;

            for (const permDetails of requirement.split('|').map(p => p.trim())) {
                const perm = getPermissionName(permDetails);

                if (permDetails === 'perm:is_exec') {
                    if (await Permissions.hasAnyPermission(req.db, req.user.id)) {
                        hasPermission = true;
                        break;
                    }
                    continue;
                }

                if (await Permissions.hasPermission(req.db, req.user.id, perm)) {
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
