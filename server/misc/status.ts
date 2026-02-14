import { FastifyReply } from 'fastify';

/**
 * status.ts
 *
 * Standardizes operation results across the application.
 */

export class statusObject<T = any> {
    status: number;
    message: string | null;
    data: T | null;

    /**
     * @param {number} status - HTTP status code.
     * @param {string} [message=null] - Success or error message.
     * @param {any} [data=null] - Payload data.
     */
    constructor(status: number, message: string | null = null, data: T | null = null) {
        this.status = status;
        this.message = message;
        this.data = data;
    }

    /**
     * Retrieve the numerical HTTP status.
     */
    getStatus(): number {
        return this.status;
    }

    /**
     * Retrieve the descriptive message.
     */
    getMessage(): string | null {
        return this.message;
    }

    /**
     * Sends the object state as a JSON response using a Fastify reply object.
     */
    getResponse(reply: FastifyReply) {
        const response: any = {};
        if (this.message !== null && this.message !== undefined) response.message = this.message;
        if (this.data !== null && this.data !== undefined) response.data = this.data;

        return reply.status(this.status).send(response);
    }

    /**
     * Determine if the current state represents an error.
     */
    isError(): boolean {
        return this.status >= 400;
    }

    /**
     * Determine if the current state represents a success.
     */
    isSuccess(): boolean {
        return !this.isError();
    }

    /**
     * Retrieve the attached payload data.
     */
    getData(): T | null {
        return this.data;
    }
}
