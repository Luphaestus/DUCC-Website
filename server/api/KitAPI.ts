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

        // Set Event Kit (User) - Multiple items
        router.post('/event-request', async (req, res) => {
            if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
            const { event_id, itemIds } = req.body;
            const result = await KitDB.setUserEventKit(this.db, (req.user as any).id, parseInt(event_id), itemIds);
            res.status(result.status).json(result);
        });

        // Get Event Kit for User
        router.get('/event/:id/my-request', async (req, res) => {
            if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
            try {
                const requests = await this.db.all(`
                    SELECT k.* 
                    FROM event_kit_requests r
                    JOIN kit_items k ON r.kit_item_id = k.id
                    WHERE r.event_id = ? AND r.user_id = ?
                `, [parseInt(req.params.id), (req.user as any).id]);
                res.status(200).json({ data: requests });
            } catch (e) {
                res.status(500).json({ error: 'Database error' });
            }
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

        // Get user preferences
        router.get('/preferences', async (req, res) => {
            if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
            const result = await KitDB.getUserPreferences(this.db, (req.user as any).id);
            res.status(result.status).json(result);
        });

        // Get specific user preferences (Admin)
        router.get('/preferences/:userId', check('perm:user.read | perm:user.manage'), async (req, res) => {
            const result = await KitDB.getUserPreferences(this.db, parseInt(req.params.userId));
            res.status(result.status).json(result);
        });

        // Update user preferences
        router.post('/preferences', async (req, res) => {
            if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
            const { itemIds } = req.body;
            const result = await KitDB.setUserPreferences(this.db, (req.user as any).id, itemIds);
            res.status(result.status).json(result);
        });

        // Update specific user preferences (Admin)
        router.post('/preferences/:userId', check('perm:user.manage'), async (req, res) => {
            const { itemIds } = req.body;
            const result = await KitDB.setUserPreferences(this.db, parseInt(req.params.userId), itemIds);
            res.status(result.status).json(result);
        });

        this.app.use('/api/kit', router);
    }
}