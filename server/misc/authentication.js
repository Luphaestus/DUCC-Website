const { Permissions } = require('./permissions.js');


const getPermissionName = (perm) => {
    const colonPos = perm.indexOf(':');
    if (colonPos !== -1) {
        return perm.slice(colonPos + 1);
    }
    return perm;
}

const getPermissionType = (perm) => {
    const colonPos = perm.indexOf(':');
    if (colonPos !== -1) {
        return perm.slice(0, colonPos);
    }
    return 'perm';
}


/**
 * Middleware to verify authentication and permissions.
 * Supports AND logic (multiple arguments) and OR logic (pipe character).
 * Example: check('user.manage | event.manage.all')
 * @param {...string} requirements - Permission strings to verify.
 * @returns {function} Express middleware.
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

                // Special case: is_exec checks if user has ANY permission
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

module.exports = checkAuthentication;