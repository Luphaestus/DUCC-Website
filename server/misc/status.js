/**
 * Represents a standardized response object for API operations.
 * Includes HTTP status code, message, and optional data payload.
 * @module statusObject
 */
class statusObject {
    /**
     * @param {number} status - The HTTP status code.
     * @param {string} [message=null] - A descriptive message.
     * @param {any} [data=null] - The data payload.
     */
    constructor(status, message = null, data = null) {
        this.status = status;
        this.message = message;
        this.data = data;
    }

    /**
     * Returns the HTTP status code.
     * @returns {number} The status code.
     */
    getStatus() {
        return this.status;
    }

    /**
     * Returns the descriptive message.
     * @returns {string|null} The message.
     */
    getMessage() {
        return this.message;
    }

    /**
     * Sends the response using the provided Express response object.
     * @param {object} res - The Express response object.
     * @returns {object} The Express response.
     */
    getResponse(res) {
        if (this.isError()) {
            return res.status(this.getStatus()).json({ message: this.getMessage() });
        }

        return res.status(this.getStatus()).json({ message: this.getMessage(), data: this.getData() });
    }

    /**
     * Checks if the status indicates an error (status code >= 400).
     * @returns {boolean} True if it is an error, false otherwise.
     */
    isError() {
        return this.status >= 400;
    }

    /**
     * Returns the data payload.
     * @returns {any} The data payload.
     */
    getData() {
        return this.data;
    }
}

module.exports = { statusObject };