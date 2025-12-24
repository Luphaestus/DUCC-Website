/**
 * Authentication and Permission checking middleware.
 * 
 * This middleware verifies if a user is logged in and possesses the required permissions.
 * It supports complex logic:
 * - Providing multiple arguments (requirements) acts as an "AND" condition.
 * - Using the pipe character "|" within a requirement string acts as an "OR" condition.
 * 
 * Example usage in a route:
 * checkAuthentication('can_manage_users | can_manage_transactions', 'is_exec')
 * This would require the user to have (can_manage_users OR can_manage_transactions) AND be an exec.
 * 
 * @param {...string} requirements - Permission strings to check against the user object.
 * @returns {function} Express middleware function.
 */
const checkAuthentication = (...requirements) => {
    return (req, res, next) => {
        // First, check if the user is even authenticated via Passport.js
        if (!req.isAuthenticated || !req.isAuthenticated()) {
            return res.status(401).json({ message: 'Unauthorized: Please log in.' });
        }

        const user = req.user;

        // Iterate through each requirement group (AND condition)
        for (const requirement of requirements) {
            // Split the group by pipe to get individual permissions (OR condition)
            const permissions = requirement.split('|').map(p => p.trim());

            // Check if user has AT LEAST ONE of the permissions in this group
            const hasPermission = permissions.some(permission => user[permission]);

            if (!hasPermission) {
                // If any group requirement is not met, deny access immediately
                return res.status(403).json({ message: 'Forbidden: Insufficient permissions.' });
            }
        }

        // All requirements met, proceed to the next handler
        next();
    };
};

module.exports = checkAuthentication;


