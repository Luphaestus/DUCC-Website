/**
 * statusObject class.
 * Provides a standardized structure for internal operation results and API responses.
 * Unifies success/error handling across the application by encapsulating status codes,
 * messages, and data payloads.
 * 
 * @module statusObject
 */
class statusObject {
    /**
     * @param {number} status - The HTTP status code (e.g., 200, 404, 500).
     * @param {string} [message=null] - A human-readable message explaining the result.
     * @param {any} [data=null] - The actual data payload of the result.
     */
    constructor(status, message = null, data = null) {
        this.status = status;
        this.message = message;
        this.data = data;
    }

    /**
     * @returns {number} The HTTP status code.
     */
    getStatus() {
        return this.status;
    }

    /**
     * @returns {string|null} The descriptive message.
     */
    getMessage() {
        return this.message;
    }

    /**
     * Sends the encapsulated state as a JSON response via Express.
     * Handles formatting based on whether the object represents an error or success.
     * @param {object} res - The Express response object.
     * @returns {object} The Express response.
     */
    getResponse(res) {
        if (this.isError()) {
            // Error response format
            return res.status(this.getStatus()).json({ message: this.getMessage() });
        }

        // Success response format
        return res.status(this.getStatus()).json({ message: this.getMessage(), data: this.getData() });
    }

    /**
     * Helper to determine if the operation failed.
     * @returns {boolean} True if status code is 400 or above.
     */
    isError() {
        return this.status >= 400;
    }

    /**
     * @returns {any} The data payload.
     */
    getData() {
        return this.data;
    }
}

module.exports = { statusObject };