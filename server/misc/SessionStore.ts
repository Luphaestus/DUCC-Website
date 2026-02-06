import { DatabaseWrapper } from '../db/db.js';

/**
 * SessionStore.ts
 * 
 * Implements a MySQL-backed session store for @fastify/session.
 */
export default class MySQLStore {
    db: DatabaseWrapper;

    constructor(db: DatabaseWrapper) {
        this.db = db;
    }

    /**
     * Fetch a session by its ID.
     */
    get(sessionId: string, callback: (err: any, session?: any) => void) {
        this.db.get('SELECT data FROM sessions WHERE id = ? AND expires_at > NOW()', [sessionId])
            .then(row => {
                if (!row) return callback(null, null);
                try {
                    const session = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
                    callback(null, session);
                } catch (e) {
                    callback(e);
                }
            })
            .catch(err => callback(err));
    }

    /**
     * Create or update a session.
     */
    set(sessionId: string, session: any, callback: (err: any) => void) {
        const expires = session.cookie && session.cookie.expires 
            ? new Date(session.cookie.expires) 
            : new Date(Date.now() + 86400000); // Default 24h
            
        const data = JSON.stringify(session);
        
        this.db.run(
            'INSERT INTO sessions (id, data, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data), expires_at = VALUES(expires_at)',
            [sessionId, data, expires]
        )
            .then(() => callback(null))
            .catch(err => callback(err));
    }

    /**
     * Destroy a session by its ID.
     */
    destroy(sessionId: string, callback: (err: any) => void) {
        this.db.run('DELETE FROM sessions WHERE id = ?', [sessionId])
            .then(() => callback(null))
            .catch(err => callback(err));
    }

    /**
     * Remove expired sessions from the database.
     */
    clearExpiredSessions() {
        return this.db.run('DELETE FROM sessions WHERE expires_at < NOW()');
    }
}
