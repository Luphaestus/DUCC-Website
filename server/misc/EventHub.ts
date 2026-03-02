import { ServerResponse } from 'http';
import Logger from './Logger.js';

/**
 * EventHub.ts
 * 
 * Manages Server-Sent Events (SSE) connections for live updates.
 */

type Client = {
    id: number;
    res: ServerResponse;
    userId?: number;
    sessionId?: string;
};

class EventHub {
    private clients: Client[] = [];
    private nextId = 0;

    /**
     * Subscribe a client to the event stream.
     */
    addClient(res: ServerResponse, userId?: number, sessionId?: string) {
        const id = this.nextId++;
        const client: Client = { id, res, userId, sessionId };

        this.clients.push(client);

        res.on('close', () => {
            this.clients = this.clients.filter(c => c.id !== id);
        });

        return id;
    }

    /**
     * Returns the number of currently connected clients.
     */
    getClientCount() {
        return this.clients.length;
    }

    /**
     * Returns number of unique active sessions represented by connected clients.
     */
    getUniqueSessionCount() {
        const sessions = new Set<string>();
        this.clients.forEach((client) => {
            if (client.sessionId) sessions.add(client.sessionId);
            else sessions.add(`anon:${client.id}`);
        });
        return sessions.size;
    }

    /**
     * Broadcast an update to all connected clients.
     */
    broadcast(type: string, data: any) {
        const payload = JSON.stringify({ type, data, timestamp: Date.now() });
        this.clients.forEach(c => {
            try {
                c.res.write(`data: ${payload}\n\n`);
            } catch (e) {
                // Ignore failed writes
            }
        });
    }

    /**
     * Send an update to a specific user.
     */
    sendToUser(userId: number, type: string, data: any) {
        const payload = JSON.stringify({ type, data, timestamp: Date.now() });
        this.clients.forEach(c => {
            if (c.userId === userId) {
                try {
                    c.res.write(`data: ${payload}\n\n`);
                } catch (e) {
                    // Ignore failed writes
                }
            }
        });
    }
}

const eventHub = new EventHub();
export default eventHub;
