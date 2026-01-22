/**
 * status.js
 * 
 * Standardizes operation results across the application.
 * Encapsulates HTTP status codes, human-readable messages, and response data.
 * Provides a uniform way to send responses from API controllers.
 */

/**
 * Encapsulation of a business logic result and its corresponding HTTP response data.
 * @module statusObject
 */
class statusObject {
    /**
     * @param {number} status - HTTP status code (e.g. 200, 404, 500).
     * @param {string} [message=null] - Success or error message.
     * @param {any} [data=null] - Payload data to be returned.
     */
    constructor(status, message = null, data = null) {
        this.status = status;
        this.message = message;
        this.data = data;
    }

    /**
     * Retrieve the numerical HTTP status.
     * @returns {number}
     */
    getStatus() {
        return this.status;
    }

    /**
     * Retrieve the descriptive message.
     * @returns {string|null}
     */
    getMessage() {
        return this.message;
    }

    /**
     * Sends the object state as a JSON response using an Express response object.
     * @param {object} res - Express response object.
     * @returns {object} - The response object.
     */
    getResponse(res) {
        if (this.isError()) {
            return res.status(this.getStatus()).json({ message: this.getMessage() });
        }

        return res.status(this.getStatus()).json({ message: this.getMessage(), data: this.getData() });
    }

    /**
     * Determine if the current state represents an error based on HTTP status code.
     * @returns {boolean} - True if status is 400 or greater.
     */
    isError() {
        return this.status >= 400;
    }

    /**
     * Retrieve the attached payload data.
     * @returns {any}
     */
    getData() {
        return this.data;
    }
}

module.exports = { statusObject };