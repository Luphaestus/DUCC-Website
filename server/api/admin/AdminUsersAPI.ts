/**
 * AdminUsersAPI.ts
 * 
 * This file handles administrative actions for user management.
 */

import UserDB from '../../db/userDB.js';
import RolesDB from '../../db/rolesDB.js';
import SwimsDB from '../../db/swimsDB.js';
import check from '../../misc/authentication.js';
import { Permissions } from '../../misc/permissions.js';
import bcrypt from 'bcrypt';
import { Express, Request, Response } from 'express';
import { DatabaseWrapper } from '../../db/db.js';

export default class AdminUsers {
    app: Express;
    db: DatabaseWrapper;

    /**
     * @param {object} app - Express application instance.
     * @param {object} db - Database connection instance.
     */
    constructor(app: Express, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers all admin routes for user oversight and authorization management.
     */
    registerRoutes() {
        /**
         * Fetch paginated users list for admin tables.
         */
        this.app.get('/api/admin/users', check('perm:is_exec'), async (req: any, res: Response) => {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = (req.query.search as string) || '';
            const sort = (req.query.sort as string) || 'last_name';
            const order = (req.query.order as 'asc' | 'desc') || 'asc';

            const inDebt = req.query.inDebt as string;
            const isMember = req.query.isMember as string;
            const difficulty = req.query.difficulty as string;
            const permissions = req.query.permissions as string;

            const userPerms = {
                canManageUsers: await Permissions.hasPermission(this.db, req.user.id, 'user.manage'),
                canManageTrans: await Permissions.hasPermission(this.db, req.user.id, 'transaction.manage'),
                canManageEvents: await Permissions.hasPermission(this.db, req.user.id, 'event.manage.all'),
                isScopedExec: await Permissions.hasPermission(this.db, req.user.id, 'event.manage.scoped')
            };

            const result = await UserDB.getUsers(this.db, userPerms, { page, limit, search, sort, order, inDebt, isMember, difficulty, permissions });
            if (result.isError()) return result.getResponse(res);
            res.json(result.getData());
        });

        /**
         * Fetch full user profile, balance, and authorization details.
         */
        this.app.get('/api/admin/user/:id', check('perm:user.read | perm:user.manage | perm:transaction.read | perm:transaction.manage | perm:is_exec'), async (req: any, res: Response) => {
            const userId = parseInt(req.params.id);
            if (isNaN(userId)) return res.status(400).json({ message: 'Invalid user ID' });

            const canManageUsers = await Permissions.hasPermission(this.db, req.user.id, 'user.manage') || await Permissions.hasPermission(this.db, req.user.id, 'user.read');
            const canManageTransactions = await Permissions.hasPermission(this.db, req.user.id, 'transaction.manage') || await Permissions.hasPermission(this.db, req.user.id, 'transaction.read');

            let elements: string[] = ["id"];
            if (canManageUsers) {
                elements.push(
                    "email", "first_name", "last_name", "date_of_birth", "college_id", "college_name",
                    "emergency_contact_name", "emergency_contact_phone", "home_address", "phone_number",
                    "has_medical_conditions", "medical_conditions_details", "takes_medication", "medication_details",
                    "free_sessions", "is_member", "filled_legal_info", "is_instructor", "first_aid_expiry",
                    "agrees_to_fitness_statement", "agrees_to_club_rules", "agrees_to_pay_debts", "agrees_to_data_storage", "agrees_to_keep_health_data",
                    "difficulty_level", "swims"
                );
            } else if (canManageTransactions) {
                elements.push("first_name", "last_name", "free_sessions", "is_member", "is_instructor", "difficulty_level", "swims");
            } else {
                elements.push("first_name", "last_name", "swims");
            }

            const includeBalance = canManageUsers || canManageTransactions;
            const profileRes = await UserDB.getUserProfile(this.db, userId, elements, includeBalance);
            if (profileRes.isError()) return profileRes.getResponse(res);

            const filteredUser = profileRes.getData();

            const [allTimeRes, yearlyRes] = await Promise.all([
                SwimsDB.getUserSwimmerRank(this.db, userId, false),
                SwimsDB.getUserSwimmerRank(this.db, userId, true)
            ]);
            let allTimeData = allTimeRes.getData() || { rank: -1, swims: 0 };
            allTimeData.rank = allTimeData.swims === 0 ? -1 : allTimeData.rank;
            
            let yearlyData = yearlyRes.getData() || { rank: -1, swims: 0 };
            yearlyData.rank = yearlyData.swims === 0 ? -1 : yearlyData.rank;

            filteredUser.swimmer_stats = { allTime: allTimeData, yearly: yearlyData };

            const rolesRes = await RolesDB.getUserRoles(this.db, userId);
            if (!rolesRes.isError()) filteredUser.roles = rolesRes.getData();

            const permsRes = await RolesDB.getUserPermissions(this.db, userId);
            if (!permsRes.isError()) filteredUser.direct_permissions = permsRes.getData();

            const tagsRes = await RolesDB.getUserManagedTags(this.db, userId);
            if (!tagsRes.isError()) filteredUser.direct_managed_tags = tagsRes.getData();

            res.json(filteredUser);
        });

        /**
         * Update profile elements for any user.
         */
        this.app.post('/api/admin/user/:id/elements', check('perm:user.write | perm:user.manage'), async (req: Request, res: Response) => {
            if (req.body.email) req.body.email = req.body.email.toLowerCase();
            const result = await UserDB.writeElements(this.db, parseInt(req.params.id), req.body);
            result.getResponse(res);
        });

        /**
         * Assign a role to a user.
         */
        this.app.post('/api/admin/user/:id/role', check('perm:user.manage | perm:role.manage'), async (req: any, res: Response) => {
            const roleId = req.body.roleId;
            const roleRes = await RolesDB.getRoleById(this.db, roleId);
            if (roleRes.isError()) return roleRes.getResponse(res);
            
            const role = roleRes.getData();
            
            if (role.name === 'President') {
                const isPresident = await Permissions.hasRole(this.db, req.user.id, 'President');
                
                if (!isPresident) {
                    return res.status(403).json({ message: 'Only the current President can transfer this role.' });
                }

                const { password } = req.body;
                if (!password) {
                    return res.status(400).json({ message: 'Password is required to transfer the President role.' });
                }

                const isMatch = await bcrypt.compare(password, req.user.hashed_password);
                if (!isMatch) {
                    return res.status(403).json({ message: 'Incorrect password.' });
                }

                const result = await UserDB.resetPermissions(this.db, parseInt(req.params.id));
                return result.getResponse(res);
            }

       
            if (role.permissions) {
                for (const permSlug of role.permissions) {
                    if (!await Permissions.hasPermission(this.db, req.user.id, permSlug)) {
                        return res.status(403).json({ 
                            message: `You cannot assign a role with permission '${permSlug}' because you do not have it.` 
                        });
                    }
                }
            }

            const result = await RolesDB.assignRole(this.db, req.params.id, roleId);
            result.getResponse(res);
        });

        /**
         * Remove a role from a user.
         */
        this.app.delete('/api/admin/user/:id/role/:roleId', check('perm:user.manage | perm:role.manage'), async (req: Request, res: Response) => {
            const result = await RolesDB.removeRole(this.db, req.params.id, req.params.roleId);
            result.getResponse(res);
        });

        /**
         * Add a direct permission override to a user.
         */
        this.app.post('/api/admin/user/:id/permission', check('perm:user.manage | perm:role.manage'), async (req: Request, res: Response) => {
            const result = await RolesDB.addUserPermission(this.db, req.params.id, req.body.permissionId);
            result.getResponse(res);
        });

        /**
         * Remove a direct permission override from a user.
         */
        this.app.delete('/api/admin/user/:id/permission/:permId', check('perm:user.manage | perm:role.manage'), async (req: Request, res: Response) => {
            const result = await RolesDB.removeUserPermission(this.db, req.params.id, req.params.permId);
            result.getResponse(res);
        });

        /**
         * Grant an Exec direct management scope over events with a specific tag.
         */
        this.app.post('/api/admin/user/:id/managed_tag', check('perm:user.manage | perm:role.manage'), async (req: Request, res: Response) => {
            const result = await RolesDB.addManagedTag(this.db, req.params.id, req.body.tagId);
            result.getResponse(res);
        });

        /**
         * Revoke an Exec's direct management scope over a specific tag.
         */
        this.app.delete('/api/admin/user/:id/managed_tag/:tagId', check('perm:user.manage | perm:role.manage'), async (req: Request, res: Response) => {
            const result = await RolesDB.removeManagedTag(this.db, req.params.id, req.params.tagId);
            result.getResponse(res);
        });
    }
}
