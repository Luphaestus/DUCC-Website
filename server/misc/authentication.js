/**
 * Middleware to verify authentication and permissions.
 * Supports AND logic (multiple arguments) and OR logic (pipe character).
 * Example: check('can_manage_users | is_exec', 'is_active')
 * @param {...string} requirements - Permission strings to verify.
 * @returns {function} Express middleware.
 */
const checkAuthentication = (...requirements) => {
    return (req, res, next) => {
        if (!req.isAuthenticated || !req.isAuthenticated()) {
            return res.status(401).json({ message: 'Unauthorized: Please log in.' });
        }

        const user = req.user;

        for (const requirement of requirements) {
            const permissions = requirement.split('|').map(p => p.trim());
            const hasPermission = permissions.some(permission => user[permission]);

            if (!hasPermission) {
                return res.status(403).json({ message: 'Forbidden: Insufficient permissions.' });
            }
        }

        next();
    };
};

module.exports = checkAuthentication;