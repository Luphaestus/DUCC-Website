import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseWrapper } from '../db/db.js';
import KitDB from '../db/kitDB.js';
import check from '../misc/authentication.js';

export default class KitAPI {
    app: FastifyInstance;
    db: DatabaseWrapper;
    passport: any;

    constructor(app: FastifyInstance, db: DatabaseWrapper, passport: any) {
        this.app = app;
        this.db = db;
        this.passport = passport;
    }

    registerRoutes() {
        // Kit routes
        this.app.get('/api/kit', async (request: any, reply: FastifyReply) => {
            if (!request.isAuthenticated()) return reply.status(401).send({ error: 'Unauthorized' });
            const result = await KitDB.getAllItems(this.db);
            if (result.isError()) return result.getResponse(reply);
            return reply.send(result.getData());
        });

        // Admin: Create Item
        this.app.post('/api/kit', { preHandler: [check('perm:kit.manage')] }, async (request: FastifyRequest, reply: FastifyReply) => {
            const result = await KitDB.createItem(this.db, request.body as any);
            return result.getResponse(reply);
        });

        // Admin: Update Item
        this.app.put('/api/kit/:id', { preHandler: [check('perm:kit.manage')] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const result = await KitDB.updateItem(this.db, parseInt(request.params.id), request.body as any);
            return result.getResponse(reply);
        });

        // Admin: Delete Item
        this.app.delete('/api/kit/:id', { preHandler: [check('perm:kit.manage')] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const result = await KitDB.deleteItem(this.db, parseInt(request.params.id));
            return result.getResponse(reply);
        });

        // Get requests for event (Admin or Event Manager)
        this.app.get('/api/kit/event/:id', { preHandler: [check('perm:event.manage.all | perm:kit.manage | perm:event.manage.scoped')] }, async (request: any, reply: FastifyReply) => {
            const result = await KitDB.getRequestsForEvent(this.db, parseInt(request.params.id));
            if (result.isError()) return result.getResponse(reply);
            return reply.send(result.getData());
        });

        // Request Kit (User)
        this.app.post('/api/kit/request', async (request: any, reply: FastifyReply) => {
            if (!request.isAuthenticated()) return reply.status(401).send({ error: 'Unauthorized' });
            const { event_id, kit_item_id } = request.body as any;
            const result = await KitDB.requestKit(this.db, request.user.id, event_id, kit_item_id);
            return result.getResponse(reply);
        });

        // Set Event Kit (User) - Multiple items
        this.app.post('/api/kit/event-request', async (request: any, reply: FastifyReply) => {
            if (!request.isAuthenticated()) return reply.status(401).send({ error: 'Unauthorized' });
            const { event_id, itemIds } = request.body as any;
            const result = await KitDB.setUserEventKit(this.db, request.user.id, parseInt(event_id), itemIds);
            return result.getResponse(reply);
        });

        // Get Event Kit for User
        this.app.get('/api/kit/event/:id/my-request', async (request: any, reply: FastifyReply) => {
            if (!request.isAuthenticated()) return reply.status(401).send({ error: 'Unauthorized' });
            try {
                const requests = await this.db.all(`
                    SELECT k.* 
                    FROM event_kit_requests r
                    JOIN kit_items k ON r.kit_item_id = k.id
                    WHERE r.event_id = ? AND r.user_id = ?
                `, [parseInt(request.params.id), request.user.id]);
                return reply.status(200).send(requests);
            } catch (e) {
                return reply.status(500).send({ error: 'Database error' });
            }
        });

        // Delete Request (User/Admin)
        this.app.delete('/api/kit/request/:id', async (request: any, reply: FastifyReply) => {
            if (!request.isAuthenticated()) return reply.status(401).send({ error: 'Unauthorized' });
            const result = await KitDB.deleteRequest(this.db, parseInt(request.params.id), request.user.id);
            return result.getResponse(reply);
        });

        // Toggle Fulfillment (Admin)
        this.app.post('/api/kit/request/:id/fulfill', { preHandler: [check('perm:kit.manage')] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const result = await KitDB.toggleFulfillment(this.db, parseInt(request.params.id));
            return result.getResponse(reply);
        });

        // Get user preferences
        this.app.get('/api/kit/preferences', async (request: any, reply: FastifyReply) => {
            if (!request.isAuthenticated()) return reply.status(401).send({ error: 'Unauthorized' });
            const result = await KitDB.getUserPreferences(this.db, request.user.id);
            if (result.isError()) return result.getResponse(reply);
            return reply.send(result.getData());
        });

        // Get specific user preferences (Admin)
        this.app.get('/api/kit/preferences/:userId', { preHandler: [check('perm:user.read | perm:user.manage')] }, async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
            const result = await KitDB.getUserPreferences(this.db, parseInt(request.params.userId));
            if (result.isError()) return result.getResponse(reply);
            return reply.send(result.getData());
        });

        // Update user preferences
        this.app.post('/api/kit/preferences', async (request: any, reply: FastifyReply) => {
            if (!request.isAuthenticated()) return reply.status(401).send({ error: 'Unauthorized' });
            const { itemIds } = request.body as any;
            const result = await KitDB.setUserPreferences(this.db, request.user.id, itemIds);
            return result.getResponse(reply);
        });

        // Update specific user preferences (Admin)
        this.app.post('/api/kit/preferences/:userId', { preHandler: [check('perm:user.manage')] }, async (request: FastifyRequest<{ Params: { userId: string }, Body: { itemIds: any } }>, reply: FastifyReply) => {
            const { itemIds } = request.body;
            const result = await KitDB.setUserPreferences(this.db, parseInt(request.params.userId), itemIds);
            return result.getResponse(reply);
        });
    }
}
