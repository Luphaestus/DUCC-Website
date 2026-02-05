import { Response } from 'express';
import Logger from './Logger.js';

/**
 * EventHub.ts
 * 
 * Manages Server-Sent Events (SSE) connections for live updates.
 */

type Client = {
    id: number;
    res: Response;
    userId?: number;
};

class EventHub {
    private clients: Client[] = [];
    private nextId = 0;

    /**
     * Subscribe a client to the event stream.
     */
    addClient(res: Response, userId?: number) {
        const id = this.nextId++;
        const client: Client = { id, res, userId };
        
        this.clients.push(client);

        res.on('close', () => {
            this.clients = this.clients.filter(c => c.id !== id);
        });

        return id;
    }

    /**
     * Broadcast an update to all connected clients.
     */
    broadcast(type: string, data: any) {
        const payload = JSON.stringify({ type, data, timestamp: Date.now() });
        this.clients.forEach(c => {
            c.res.write(`data: ${payload}\n\n`);
        });
    }

    /**
     * Send an update to a specific user.
     */
    sendToUser(userId: number, type: string, data: any) {
        const payload = JSON.stringify({ type, data, timestamp: Date.now() });
        this.clients.forEach(c => {
            if (c.userId === userId) {
                c.res.write(`data: ${payload}\n\n`);
            }
        });
    }
}

export default new EventHub();
