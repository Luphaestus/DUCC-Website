/**
 * utils.js
 * 
 * General-purpose utility functions shared across the server.
 */

class Utils {
    /**
     * Calculate the start of the current academic year (September 1st).
     * @returns {string} - ISO date string of the most recent September 1st.
     */
    static getAcademicYearStart() {
        const now = new Date();
        // Academic year changes on September 1st (month 8 in JS)
        const year = now.getUTCMonth() < 8 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
        return new Date(Date.UTC(year, 8, 1)).toISOString();
    }

    /**
     * Extract the base URL (protocol + host) from an incoming Express request.
     * @param {object} req - Express request object.
     * @returns {string} - Base URL (e.g., http://localhost:3000).
     */
    static getBaseUrl(req) {
        return `${req.protocol}://${req.get('host')}`;
    }
}

module.exports = Utils;