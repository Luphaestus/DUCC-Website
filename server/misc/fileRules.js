const { statusObject } = require('./status.js');

class FileRules {
    /**
     * Determine if a user can access a file based on visibility.
     * @param {object} file - File object.
     * @param {string} userRole - 'public', 'member', or 'exec'.
     * @returns {boolean}
     */
    static canAccessFile(file, userRole) {
        if (file.visibility === 'public') return true;
        if (file.visibility === 'members' && (userRole === 'member' || userRole === 'exec')) return true;
        if (file.visibility === 'execs' && userRole === 'exec') return true;
        return false;
    }
}

module.exports = FileRules;