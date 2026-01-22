/**
 * authentication.js
 * 
 * Provides middleware for verifying user sessions and enforcing 
 * Role-Based Access Control (RBAC). 
 */

const { Permissions } = require('./permissions.js');

/**
 * Extracts the core permission name from a tagged permission string.
 * e.g. "perm:user.manage" -> "user.manage"
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
 * e.g. "perm:user.manage" -> "perm"
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
 * 
 * Logic:
 * - Requirements provided as multiple arguments are combined with AND logic.
 * - Single requirement strings containing '|' are split and checked with OR logic.
 * 
 * Example: check('user.manage | event.manage.all', 'transaction.read')
 *   -> User must have (user.manage OR event.manage.all) AND transaction.read
 * 
 * @param {...string} requirements - Permission strings to verify.
 * @returns {function} - Express middleware function.
 */
const checkAuthentication = (...requirements) => {
    return async (req, res, next) => {
        // 1. Basic session verification
        if (!req.isAuthenticated || !req.isAuthenticated()) {
            return res.status(401).json({ message: 'Unauthorized: Please log in.' });
        }

        // 2. Permission evaluation
        for (const requirement of requirements) {
            let hasPermission = false;

            // Handle OR logic within a single requirement string
            for (const permDetails of requirement.split('|').map(p => p.trim())) {
                const perm = getPermissionName(permDetails);

                // Special meta-permission check
                if (permDetails === 'perm:is_exec') {
                    if (await Permissions.hasAnyPermission(req.db, req.user.id)) {
                        hasPermission = true;
                        break;
                    }
                    continue;
                }

                // Standard slug-based permission check
                if (await Permissions.hasPermission(req.db, req.user.id, perm)) {
                    hasPermission = true;
                    break;
                }
            }

            // Fail fast if an AND condition is not met
            if (!hasPermission) {
                return res.status(403).json({ message: 'Forbidden: Insufficient permissions.' });
            }
        }

        // All checks passed
        next();
    };
};

module.exports = checkAuthentication;