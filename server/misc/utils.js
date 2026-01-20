/**
 * General utility functions.
 */
class Utils {
    /**
     * Get academic year start date (Sept 1st).
     * @returns {string} ISO date string
     */
    static getAcademicYearStart() {
        const now = new Date();
        const year = now.getMonth() < 8 ? now.getFullYear() - 1 : now.getFullYear();
        return new Date(year, 8, 1).toISOString();
    }

    /**
     * Get the base URL from the request.
     * @param {object} req - Express request object.
     * @returns {string} Base URL (e.g., http://localhost:3000)
     */
    static getBaseUrl(req) {
        return `${req.protocol}://${req.get('host')}`;
    }
}

module.exports = Utils;
