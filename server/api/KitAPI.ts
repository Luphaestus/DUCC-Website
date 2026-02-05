import { Router } from 'express';
import { DatabaseWrapper } from '../db/db.js';
import { statusObject } from '../misc/status.js';
import KitDB from '../db/kitDB.js';
import check from '../misc/authentication.js';
import passport from 'passport';

export default class KitAPI {
    app: any;
    db: DatabaseWrapper;
    passport: any;

    constructor(app: any, db: DatabaseWrapper, passport: any) {
        this.app = app;
        this.db = db;
        this.passport = passport;
    }

    registerRoutes() {
        const router = Router();

        // Get all kit items
        router.get('/', async (req, res) => {
            if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
            const result = await KitDB.getAllItems(this.db);
            res.status(result.status).json(result);
        });

        // Admin: Create Item
        router.post('/', check('perm:kit.manage'), async (req, res) => {
            const result = await KitDB.createItem(this.db, req.body);
            res.status(result.status).json(result);
        });

        // Admin: Update Item
        router.put('/:id', check('perm:kit.manage'), async (req, res) => {
            const result = await KitDB.updateItem(this.db, parseInt(req.params.id), req.body);
            res.status(result.status).json(result);
        });

        // Admin: Delete Item
        router.delete('/:id', check('perm:kit.manage'), async (req, res) => {
            const result = await KitDB.deleteItem(this.db, parseInt(req.params.id));
            res.status(result.status).json(result);
        });

        // Get requests for event (Admin or Event Manager)
        router.get('/event/:id', async (req, res) => {
            if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
            
            const user = req.user as any;
            if (!user.permissions.includes('event.manage.all') && !user.permissions.includes('kit.manage') && !user.permissions.includes('event.manage.scoped')) {
                 return res.status(403).json({ error: 'Forbidden' });
            }

            const result = await KitDB.getRequestsForEvent(this.db, parseInt(req.params.id));
            res.status(result.status).json(result);
        });

        // Request Kit (User)
        router.post('/request', async (req, res) => {
            if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
            const { event_id, kit_item_id } = req.body;
            const result = await KitDB.requestKit(this.db, (req.user as any).id, event_id, kit_item_id);
            res.status(result.status).json(result);
        });

        // Delete Request (User/Admin)
        router.delete('/request/:id', async (req, res) => {
            if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
            const result = await KitDB.deleteRequest(this.db, parseInt(req.params.id), (req.user as any).id);
            res.status(result.status).json(result);
        });

        // Toggle Fulfillment (Admin)
        router.post('/request/:id/fulfill', check('perm:kit.manage'), async (req, res) => {
            const result = await KitDB.toggleFulfillment(this.db, parseInt(req.params.id));
            res.status(result.status).json(result);
        });

        this.app.use('/api/kit', router);
    }
}