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
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseWrapper } from '../../db/db.js';

export default class AdminUsers {
    app: FastifyInstance;
    db: DatabaseWrapper;

    /**
     * @param {object} app - Fastify application instance.
     * @param {object} db - Database connection instance.
     */
    constructor(app: FastifyInstance, db: DatabaseWrapper) {
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
        this.app.get('/api/admin/users', { preHandler: [check('perm:is_exec')] }, async (request: any, reply: FastifyReply) => {
            const page = parseInt(request.query.page as string) || 1;
            const limit = parseInt(request.query.limit as string) || 10;
            const search = (request.query.search as string) || '';
            const sort = (request.query.sort as string) || 'last_name';
            const order = (request.query.order as 'asc' | 'desc') || 'asc';

            const inDebt = request.query.inDebt as string;
            const isMember = request.query.isMember as string;
            const difficulty = request.query.difficulty as string;
            const permissions = request.query.permissions as string;

            const userPerms = {
                canManageUsers: await Permissions.hasPermission(this.db, request.user.id, 'user.manage'),
                canManageTrans: await Permissions.hasPermission(this.db, request.user.id, 'transaction.manage'),
                canManageEvents: await Permissions.hasPermission(this.db, request.user.id, 'event.manage.all'),
                isScopedExec: await Permissions.hasPermission(this.db, request.user.id, 'event.manage.scoped')
            };

            const result = await UserDB.getUsers(this.db, userPerms, { page, limit, search, sort, order, inDebt, isMember, difficulty, permissions });
            if (result.isError()) return result.getResponse(reply);
            return reply.send(result.getData());
        });

        /**
         * Fetch full user profile, balance, and authorization details.
         */
        this.app.get('/api/admin/user/:id', { preHandler: [check('perm:user.read | perm:user.manage | perm:transaction.read | perm:transaction.manage | perm:is_exec')] }, async (request: any, reply: FastifyReply) => {
            const userId = parseInt(request.params.id);
            if (isNaN(userId)) return reply.status(400).send({ message: 'Invalid user ID' });

            const canManageUsers = await Permissions.hasPermission(this.db, request.user.id, 'user.manage') || await Permissions.hasPermission(this.db, request.user.id, 'user.read');
            const canManageTransactions = await Permissions.hasPermission(this.db, request.user.id, 'transaction.manage') || await Permissions.hasPermission(this.db, request.user.id, 'transaction.read');

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
            if (profileRes.isError()) return profileRes.getResponse(reply);

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

            return reply.send(filteredUser);
        });

        /**
         * Update profile elements for any user.
         */
        this.app.post('/api/admin/user/:id/elements', { preHandler: [check('perm:user.write | perm:user.manage')] }, async (request: FastifyRequest<{ Params: { id: string }, Body: any }>, reply: FastifyReply) => {
            const body = request.body as any;
            if (body.email) body.email = body.email.toLowerCase();
            const result = await UserDB.writeElements(this.db, parseInt(request.params.id), body);
            return result.getResponse(reply);
        });

        /**
         * Assign a role to a user.
         */
        this.app.post('/api/admin/user/:id/role', { preHandler: [check('perm:user.manage | perm:role.manage')] }, async (request: any, reply: FastifyReply) => {
            const roleId = request.body.roleId;
            const roleRes = await RolesDB.getRoleById(this.db, roleId);
            if (roleRes.isError()) return roleRes.getResponse(reply);
            
            const role = roleRes.getData();
            
            if (role.name === 'President') {
                const isPresident = await Permissions.hasRole(this.db, request.user.id, 'President');
                
                if (!isPresident) {
                    return reply.status(403).send({ message: 'Only the current President can transfer this role.' });
                }

                const { password } = request.body;
                if (!password) {
                    return reply.status(400).send({ message: 'Password is required to transfer the President role.' });
                }

                const isMatch = await bcrypt.compare(password, request.user.hashed_password);
                if (!isMatch) {
                    return reply.status(403).send({ message: 'Incorrect password.' });
                }

                const result = await UserDB.resetPermissions(this.db, parseInt(request.params.id));
                return result.getResponse(reply);
            }

       
            if (role.permissions) {
                for (const permSlug of role.permissions) {
                    if (!await Permissions.hasPermission(this.db, request.user.id, permSlug)) {
                        return reply.status(403).send({ 
                            message: `You cannot assign a role with permission '${permSlug}' because you do not have it.` 
                        });
                    }
                }
            }

            const result = await RolesDB.assignRole(this.db, request.params.id, roleId);
            return result.getResponse(reply);
        });

        /**
         * Remove a role from a user.
         */
        this.app.delete('/api/admin/user/:id/role/:roleId', { preHandler: [check('perm:user.manage | perm:role.manage')] }, async (request: FastifyRequest<{ Params: { id: string, roleId: string } }>, reply: FastifyReply) => {
            const result = await RolesDB.removeRole(this.db, request.params.id, request.params.roleId);
            return result.getResponse(reply);
        });

        /**
         * Add a direct permission override to a user.
         */
        this.app.post('/api/admin/user/:id/permission', { preHandler: [check('perm:user.manage | perm:role.manage')] }, async (request: FastifyRequest<{ Params: { id: string }, Body: { permissionId: string } }>, reply: FastifyReply) => {
            const result = await RolesDB.addUserPermission(this.db, request.params.id, request.body.permissionId);
            return result.getResponse(reply);
        });

        /**
         * Remove a direct permission override from a user.
         */
        this.app.delete('/api/admin/user/:id/permission/:permId', { preHandler: [check('perm:user.manage | perm:role.manage')] }, async (request: FastifyRequest<{ Params: { id: string, permId: string } }>, reply: FastifyReply) => {
            const result = await RolesDB.removeUserPermission(this.db, request.params.id, request.params.permId);
            return result.getResponse(reply);
        });

        /**
         * Grant an Exec direct management scope over events with a specific tag.
         */
        this.app.post('/api/admin/user/:id/managed_tag', { preHandler: [check('perm:user.manage | perm:role.manage')] }, async (request: FastifyRequest<{ Params: { id: string }, Body: { tagId: string } }>, reply: FastifyReply) => {
            const result = await RolesDB.addManagedTag(this.db, request.params.id, request.body.tagId);
            return result.getResponse(reply);
        });

        /**
         * Revoke an Exec's direct management scope over a specific tag.
         */
        this.app.delete('/api/admin/user/:id/managed_tag/:tagId', { preHandler: [check('perm:user.manage | perm:role.manage')] }, async (request: FastifyRequest<{ Params: { id: string, tagId: string } }>, reply: FastifyReply) => {
            const result = await RolesDB.removeManagedTag(this.db, request.params.id, request.params.tagId);
            return result.getResponse(reply);
        });
    }
}