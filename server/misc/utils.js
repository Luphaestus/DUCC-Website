/**
 * utils.js
 * 
 * General-purpose utility functions.
 */

class Utils {
    /**
     * Calculate the start of the current academic year (September 1st).
     */
    static getAcademicYearStart() {
        const now = new Date();
        const year = now.getUTCMonth() < 8 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
        return new Date(Date.UTC(year, 8, 1)).toISOString();
    }

    /**
     * Extract the base URL from an incoming Express request.
     */
    static getBaseUrl(req) {
        return `${req.protocol}://${req.get('host')}`;
    }
}

module.exports = Utils;