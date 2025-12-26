/**
 * Standardizes operation results and API responses by encapsulating status, messages, and data.
 * @module statusObject
 */
class statusObject {
    /**
     * @param {number} status - HTTP status code.
     * @param {string} [message=null] - Description of the result.
     * @param {any} [data=null] - Result payload.
     */
    constructor(status, message = null, data = null) {
        this.status = status;
        this.message = message;
        this.data = data;
    }

    /**
     * @returns {number}
     */
    getStatus() {
        return this.status;
    }

    /**
     * @returns {string|null}
     */
    getMessage() {
        return this.message;
    }

    /**
     * Sends the state as a JSON response via Express.
     * @param {object} res - Express response object.
     * @returns {object}
     */
    getResponse(res) {
        if (this.isError()) {
            return res.status(this.getStatus()).json({ message: this.getMessage() });
        }

        return res.status(this.getStatus()).json({ message: this.getMessage(), data: this.getData() });
    }

    /**
     * Checks if the status indicates an error (>= 400).
     * @returns {boolean}
     */
    isError() {
        return this.status >= 400;
    }

    /**
     * @returns {any}
     */
    getData() {
        return this.data;
    }
}

module.exports = { statusObject };