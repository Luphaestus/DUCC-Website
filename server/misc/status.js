class statusObject {
    constructor(status, message = null, data = null) {
        this.status = status;
        this.message = message;
        this.data = data;
    }
    getStatus() {
        return this.status;
    }
    getMessage() {
        return this.message;
    }
    getResponse(res) {
        if (this.isError()) {
            return res.status(this.getStatus()).json({ message: this.getMessage() });
        }

        return res.status(this.getStatus()).json({ message: this.getMessage(), data: this.getData() });
    }
    isError() {
        return this.status >= 400;
    }
    getData() {
        return this.data;
    }
}

module.exports = { statusObject };