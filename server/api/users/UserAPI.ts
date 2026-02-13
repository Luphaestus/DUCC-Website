/**
 * UserAPI.ts
 * 
 * This file handles user profile management, membership status, and account settings.
 */

import { statusObject } from '../../misc/status.js';
import UserDB from '../../db/userDB.js';
import SwimsDB from '../../db/swimsDB.js';
import transactionsDB from '../../db/transactionDB.js';
import RolesDB from '../../db/rolesDB.js';
import CollegesDB from '../../db/collegesDB.js';
import Globals from '../../misc/globals.js';
import AuthDB from '../../db/authDB.js';
import check from '../../misc/authentication.js';
import { Permissions } from '../../misc/permissions.js';
import { EmailManager } from '../../emails/EmailManager.js';
import bcrypt from 'bcrypt';
import ValidationRules from '../../rules/ValidationRules.js';
import Logger from '../../misc/Logger.js';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileTypeFromFile } from 'file-type';
import config from '../../config.js';
import FilesDB from '../../db/filesDB.js';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseWrapper } from '../../db/db.js';
import { pipeline } from 'stream/promises';

export default class User {
    app: FastifyInstance;
    db: DatabaseWrapper;
    uploadDir: string;

    /**
     * @param {object} app - Fastify app.
     * @param {object} db - SQLite database.
     */
    constructor(app: FastifyInstance, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
        this.uploadDir = config.paths.files;
    }

    /**
     * Calculate file hash (SHA-256).
     */
    async calculateHash(filePath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            const stream = fs.createReadStream(filePath);
            stream.on('data', (data) => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }

    static legalElements = [
        "date_of_birth", "college_id", "emergency_contact_name", "emergency_contact_phone",
        "home_address", "phone_number", "has_medical_conditions", "medical_conditions_details",
        "takes_medication", "medication_details", "has_dietary_info", "dietary_info_details", "agrees_to_fitness_statement",
        "agrees_to_club_rules", "agrees_to_pay_debts", "agrees_to_data_storage", "agrees_to_keep_health_data"
    ];

    /**
     * Fetch whitelisted profile elements for current user.
     */
    static async getAccessibleElements(request: any, db: DatabaseWrapper, elements: string | string[]): Promise<statusObject> {
        function isElementAccessibleByNormalUser(element: string): [boolean, boolean] {
            const accessibleUserDB = [
                "id", "email", "first_name", "last_name", "date_of_birth", "college_id",
                "emergency_contact_name", "emergency_contact_phone", "home_address",
                "phone_number", "has_medical_conditions", "medical_conditions_details",
                "takes_medication", "medication_details", "dietary_info_details", "has_dietary_info", "free_sessions", "is_member",
                "agrees_to_fitness_statement", "agrees_to_club_rules", "agrees_to_pay_debts",
                "agrees_to_data_storage", "agrees_to_keep_health_data", "filled_legal_info", "legal_filled_at",
                "is_instructor", "first_aid_expiry", "profile_picture_path", "profile_picture_id",
                "profile_picture_color", "profile_picture_font", "profile_picture_initials",
                "created_at", "swims", "booties", "swimmer_rank", "swimmer_stats", "permissions", "roles", 'totp_enabled', 'email_2fa_enabled'
            ];
            const accessibleTransactionsDB = ['balance', 'transactions'];
            return [accessibleUserDB.includes(element), accessibleTransactionsDB.includes(element)];
        }

        if (typeof elements === 'string') elements = [elements];

        const userElements: string[] = [];
        const transactionElements: string[] = [];

        for (const element of elements) {
            const [accessibleUserDB, accessibleTransactionsDB] = isElementAccessibleByNormalUser(element);
            if (!accessibleUserDB && !accessibleTransactionsDB) return new statusObject(403, 'Forbidden element: ' + element);
            if (accessibleUserDB) userElements.push(element);
            if (accessibleTransactionsDB) transactionElements.push(element);
        }

        let userResultData: any = {};
        if (userElements.length > 0) {
            const needsRank = userElements.includes('swimmer_rank') || userElements.includes('swimmer_stats');
            const needsPerms = userElements.includes('permissions');
            const needsRoles = userElements.includes('roles');
            const cleanElements = userElements.filter(e => !['swimmer_rank', 'swimmer_stats', 'permissions', 'roles'].includes(e));

            let userResult;
            if (cleanElements.length > 0) {
                userResult = await UserDB.getElements(db, request.user.id, cleanElements);
                if (userResult.isError()) return userResult;
                userResultData = userResult.getData();
            }

            if (needsRank) {
                const [allTimeRes, yearlyRes] = await Promise.all([
                    SwimsDB.getUserSwimmerRank(db, request.user.id, false),
                    SwimsDB.getUserSwimmerRank(db, request.user.id, true)
                ]);
                let allTimeData = allTimeRes.getData() || { rank: -1, swims: 0 };
                allTimeData.rank = allTimeData.swims === 0 ? -1 : allTimeData.rank;

                let yearlyData = yearlyRes.getData() || { rank: -1, swims: 0 };
                yearlyData.rank = yearlyData.swims === 0 ? -1 : yearlyData.rank;

                userResultData.swimmer_stats = { allTime: allTimeData, yearly: yearlyData };
                userResultData.swimmer_rank = allTimeData.rank;
            }

            if (needsPerms || needsRoles) {
                if (needsRoles) {
                    const rolesRes = await RolesDB.getUserRoles(db, request.user.id);
                    if (rolesRes.isError()) return rolesRes;
                    userResultData.roles = rolesRes.getData();
                }

                if (needsPerms) {
                    const permsRes = await RolesDB.getAllUserPermissions(db, request.user.id);
                    if (permsRes.isError()) return permsRes;
                    userResultData.permissions = permsRes.getData();
                }
            }
        }

        let transactionResultData: any = {};
        if (transactionElements.length > 0) {
            const transactionResult = await transactionsDB.getElements(db, request.user.id, transactionElements);
            if (transactionResult.isError()) return transactionResult;
            transactionResultData = transactionResult.getData();
        }

        return new statusObject(200, null, { ...userResultData, ...transactionResultData });
    }

    /**
     * Validate and write profile updates.
     */
    static async writeNormalElements(request: any, db: DatabaseWrapper, inputData: any): Promise<statusObject> {
        const ALLOWED_FIELDS = [
            "email", "first_name", "last_name", "date_of_birth", "college_id",
            "emergency_contact_name", "emergency_contact_phone", "home_address",
            "phone_number", "has_medical_conditions", "medical_conditions_details",
            "takes_medication", "medication_details", "has_dietary_info", "dietary_info_details", "agrees_to_fitness_statement",
            "agrees_to_club_rules", "agrees_to_pay_debts", "agrees_to_data_storage",
            "agrees_to_keep_health_data", "first_aid_expiry", "is_instructor"
        ];

        const data: any = {};
        for (const key of ALLOWED_FIELDS) {
            if (inputData[key] !== undefined) {
                data[key] = inputData[key];
            }
        }

        async function getElement(element: string, data: any, db: DatabaseWrapper) {
            if (element in data) return new statusObject(200, null, data[element]);
            return await User.getAccessibleElements(request, db, element);
        }

        const errors: any = {};
        let legalUpdateNeeded = false;

        for (const element in data) {
            const value = data[element];
            let error: string | null = null;

            switch (element) {
                case "email":
                    error = ValidationRules.validate('email', value);
                    break;
                case "first_name":
                case "last_name":
                case "emergency_contact_name":
                    error = ValidationRules.validate('name', value);
                    break;
                case "date_of_birth":
                    error = ValidationRules.validate('date_of_birth', value);
                    break;
                case "college_id":
                    error = ValidationRules.validate('presence', value);
                    if (!error) {
                        const college = await (CollegesDB as any).getCollegeById(db, value);
                        if (!college) error = "Invalid college.";
                    }
                    break;
                case "emergency_contact_phone":
                case "phone_number":
                    error = ValidationRules.validate('phone', value);
                    break;
                case "home_address":
                    error = ValidationRules.validate('presence', value);
                    break;
                case "has_medical_conditions":
                case "takes_medication":
                case "agrees_to_keep_health_data":
                case "is_instructor":
                case "has_dietary_info":
                    error = ValidationRules.validate('boolean', value);
                    break;
                case "medical_conditions_details":
                    if ((await getElement("has_medical_conditions", data, db)).getData()) {
                        error = ValidationRules.validate('presence', value);
                        if (error) error = "Description required if conditions exist.";
                    }
                    break;
                case "medication_details":
                    if ((await getElement("takes_medication", data, db)).getData()) {
                        error = ValidationRules.validate('presence', value);
                        if (error) error = "Description required if taking medication.";
                    }
                    break;
                case "dietary_info_details":
                    if ((await getElement("has_dietary_info", data, db)).getData()) {
                        error = ValidationRules.validate('presence', value);
                        if (error) error = "Description required if dietary information exists.";
                    }
                    break;
                case "agrees_to_fitness_statement":
                case "agrees_to_club_rules":
                case "agrees_to_pay_debts":
                case "agrees_to_data_storage":
                    if (value !== true) error = "Agreement required.";
                    break;
                case "first_aid_expiry":
                    if (value === null) break;
                    const expiry = new Date(value);
                    const now = new Date();
                    const limit = new Date(); limit.setFullYear(now.getFullYear() + 20);
                    if (expiry <= now || expiry > limit) error = "Expiry must be in the future (max 20 years).";
                    break;
            }

            if (error) {
                errors[element] = error;
            }

            if (User.legalElements.includes(element)) {
                legalUpdateNeeded = true;
            }
        }

        if (Object.keys(errors).length > 0) {
            return new statusObject(400, 'Validation failed', { errors });
        }

        if (legalUpdateNeeded) {
            let allFilled = true;
            for (const element of User.legalElements) {
                const val = await getElement(element, data, db);
                if (val.isError() || val.getData() === null || val.getData() === undefined) {
                    allFilled = false;
                    break;
                }
            }
            if (allFilled) {
                data["filled_legal_info"] = 1;
                data["legal_filled_at"] = new Date().toISOString();
            }
        }

        if (data.email) data.email = data.email.replace(/\s/g, '').toLowerCase();

        const writeStatus = await UserDB.writeElements(db, request.user.id, data);
        if (writeStatus.isError()) return writeStatus;
        return new statusObject(200);
    }

    /**
     * Internal helper to preprocess input data before database operations.
     */
    static preprocessData(data: any) {
        if (data.email) data.email = data.email.replace(/\s/g, '').toLowerCase();
    }

    /**
     * Register user-related Express routes.
     */
    registerRoutes() {
        /**
         * Fetch profile elements for current user.
         */
        this.app.get('/api/user/elements/*', { preHandler: [check()] }, async (request: any, reply: FastifyReply) => {
            const elementsStr = request.params['*'];
            const elements = elementsStr.split(',').map((e: string) => e.trim());
            const status = await User.getAccessibleElements(request, this.db, elements);
            if (status.isError()) return status.getResponse(reply);
            return reply.send(status.getData());
        });

        /**
         * Fetch profile elements for a specific user.
         */
        this.app.get('/api/user/:id/elements/*', { preHandler: [check('perm:user.read')] }, async (request: any, reply: FastifyReply) => {
            const userId = parseInt(request.params.id);
            if (isNaN(userId)) return reply.status(400).send({ message: 'Invalid user ID' });

            const elementsStr = request.params['*'];
            const elements = elementsStr.split(',').map((e: string) => e.trim());
            const targetRequest = { ...request, user: { ...request.user, id: userId } };
            const status = await User.getAccessibleElements(targetRequest, this.db, elements);
            if (status.isError()) return status.getResponse(reply);
            return reply.send(status.getData());
        });

        /**
         * Update current user's profile elements.
         */
        this.app.post('/api/user/elements', { preHandler: [check()] }, async (request: any, reply: FastifyReply) => {
            User.preprocessData(request.body);
            const status = await User.writeNormalElements(request, this.db, request.body);
            if (status.isError()) {
                if (status.status === 400 && status.data && status.data.errors) {
                    return reply.status(400).send({ message: status.message, errors: status.data.errors });
                }
                return status.getResponse(reply);
            }
            return reply.send({ success: true });
        });

        /**
         * Process membership joining.
         */
        this.app.post('/api/user/join', { preHandler: [check()] }, async (request: any, reply: FastifyReply) => {
            try {
                const status = await UserDB.getElements(this.db, request.user.id, 'is_member');
                if (status.isError()) return status.getResponse(reply);
                if (status.getData().is_member) return reply.status(400).send({ message: 'Already a member.' });

                const globals = new Globals();
                const cost = globals.getFloat('MembershipCost') || 50;

                const tx = await transactionsDB.add_transaction(this.db, request.user.id, -cost, 'Membership Fee');
                if (tx.isError()) return tx.getResponse(reply);

                const update = await UserDB.setMembershipStatus(this.db, request.user.id, true);
                if (update.isError()) return update.getResponse(reply);
                return reply.send({ success: true });
            } catch (err) {
                Logger.error(err);
                return reply.status(500).send({ message: 'Internal error' });
            }
        });

        /**
         * Permanently delete current user account.
         */
        this.app.post('/api/user/deleteAccount', { preHandler: [check()] }, async (request: any, reply: FastifyReply) => {
            const { password } = request.body as any;
            if (!password) return reply.status(400).send({ message: 'Password is required to delete account.' });

            try {
                const user = await AuthDB.getUserById(this.db, request.user.id);
                if (!user || !user.hashed_password) return reply.status(400).send({ message: 'User not found or invalid state.' });

                const isMatch = await bcrypt.compare(password, user.hashed_password);
                if (!isMatch) return reply.status(403).send({ message: 'Incorrect password.' });

                const balance = await transactionsDB.get_balance(this.db, request.user.id);
                if (balance.isError()) return balance.getResponse(reply);
                if (balance.getData() !== 0) return reply.status(400).send({ message: 'Balance must be zero to delete account.' });

                const status = await UserDB.removeUser(this.db, request.user.id);
                if (status.isError()) return status.getResponse(reply);

                await request.logOut();
                return reply.send({ success: true });
            } catch (err) {
                Logger.error(err);
                return reply.status(500).send({ message: 'Internal server error.' });
            }
        });

        /**
         * Submit a top-up request.
         */
        this.app.post('/api/user/topup-request', { preHandler: [check()] }, async (request: any, reply: FastifyReply) => {
            const { amount, description } = request.body as any;
            const numericAmount = parseFloat(amount);

            if (isNaN(numericAmount) || numericAmount <= 0) {
                return reply.status(400).send({ message: 'Invalid amount. Must be greater than 0.' });
            }

            try {
                // Add pending transaction
                const status = await transactionsDB.add_transaction(
                    this.db, 
                    request.user.id, 
                    numericAmount, 
                    description || 'Bank Transfer Top-Up', 
                    null, 
                    'pending'
                );

                if (status.isError()) return status.getResponse(reply);

                // Notify admins with transaction.manage permission
                const admins = await Permissions.getUsersWithPermission(this.db, 'transaction.manage');
                const emailManager = EmailManager.getInstance();

                const userName = `${request.user.first_name} ${request.user.last_name}`;
                const userEmail = request.user.email;

                for (const admin of admins) {
                    emailManager.sendTemplatedEmail(
                        admin.email,
                        'New Top-Up Request - DUCC',
                        'topup_request',
                        {
                            user_name: userName,
                            user_email: userEmail,
                            user_id: request.user.id.toString(),
                            amount: numericAmount.toFixed(2),
                            description: description || 'Bank Transfer'
                        }
                    ).catch(err => Logger.error(`Failed to notify admin ${admin.email} of top-up`, err));
                }

                return reply.send({ success: true, message: 'Top-up request submitted for verification.' });
            } catch (err) {
                Logger.error('Top-up request error:', err);
                return reply.status(500).send({ message: 'Failed to submit request.' });
            }
        });

        /**
         * Upload and set profile picture.
         */
        this.app.post('/api/user/profile-picture', { preHandler: [check()] }, async (request: any, reply: FastifyReply) => {
            try {
                let fileId = null;
                let body: any = {};

                if (request.isMultipart && request.isMultipart()) {
                    const parts = request.files();
                    for await (const part of parts) {
                        if (part.type === 'file') {
                            const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                            const tempFilename = Date.now() + '-' + Math.round(Math.random() * 1E9);
                            const tempPath = path.join(this.uploadDir, tempFilename);
                            
                            await pipeline(part.file, fs.createWriteStream(tempPath));

                            const fileTypeResult = await fileTypeFromFile(tempPath);
                            if (!fileTypeResult || !allowedMimes.includes(fileTypeResult.mime)) {
                                await fs.promises.unlink(tempPath);
                                return reply.status(400).send({ message: 'Invalid image type.' });
                            }

                            const ext = `.${fileTypeResult.ext}`;
                            const finalFilename = tempFilename + ext;
                            const finalPath = tempPath + ext;
                            await fs.promises.rename(tempPath, finalPath);

                            const fileHash = await this.calculateHash(finalPath);
                            const existingFileStatus = await FilesDB.getFileByHash(this.db, fileHash);

                            if (!existingFileStatus.isError()) {
                                fileId = existingFileStatus.getData().id;
                                await fs.promises.unlink(finalPath);
                            } else {
                                const stats = await fs.promises.stat(finalPath);
                                const data = {
                                    title: `Profile Picture - ${request.user.first_name} ${request.user.last_name}`,
                                    author: `${request.user.first_name} ${request.user.last_name}`,
                                    size: stats.size,
                                    filename: finalFilename,
                                    hash: fileHash,
                                    visibility: 'public'
                                };
                                const createStatus = await FilesDB.createFile(this.db, data);
                                if (createStatus.isError()) return createStatus.getResponse(reply);
                                fileId = createStatus.getData().id;
                            }
                        } else {
                            body[part.fieldname] = part.value;
                        }
                    }
                } else {
                    body = request.body || {};
                }

                if (body.fileId !== undefined) {
                    fileId = body.fileId;
                }

                // Fetch current values to preserve them if not provided
                const currentUser = await UserDB.getElements(this.db, request.user.id, ['profile_picture_color', 'profile_picture_font', 'profile_picture_initials']);
                const currentData = currentUser.getData() || {};

                const color = body.color !== undefined ? body.color : currentData.profile_picture_color;
                const font = body.font !== undefined ? body.font : currentData.profile_picture_font;
                const initials = body.initials !== undefined ? body.initials : currentData.profile_picture_initials;
                
                const status = await UserDB.setProfilePicture(this.db, request.user.id, fileId, color, font, initials);
                return status.getResponse(reply);
            } catch (err) {
                Logger.error('Profile picture upload error:', err);
                return reply.status(500).send({ message: 'Upload failed.' });
            }
        });
    }
}