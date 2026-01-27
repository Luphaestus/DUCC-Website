/**
 * status.js
 * 
 * Standardizes operation results across the application.
 */

export class statusObject {
    /**
     * @param {number} status - HTTP status code.
     * @param {string} [message=null] - Success or error message.
     * @param {any} [data=null] - Payload data.
     */
    constructor(status, message = null, data = null) {
        this.status = status;
        this.message = message;
        this.data = data;
    }

    /**
     * Retrieve the numerical HTTP status.
     */
    getStatus() {
        return this.status;
    }

    /**
     * Retrieve the descriptive message.
     */
    getMessage() {
        return this.message;
    }

    /**
     * Sends the object state as a JSON response using an Express response object.
     */
    getResponse(res) {
        if (this.isError()) {
            return res.status(this.getStatus()).json({ message: this.getMessage() });
        }

        return res.status(this.getStatus()).json({ message: this.getMessage(), data: this.getData() });
    }

    /**
     * Determine if the current state represents an error.
     */
    isError() {
        return this.status >= 400;
    }

    /**
     * Retrieve the attached payload data.
     */
    getData() {
        return this.data;
    }
}
