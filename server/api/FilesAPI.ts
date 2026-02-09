/**
 * FilesAPI.ts
 * 
 * This file handles file management, uploads, and categories.
 */

import { statusObject } from '../misc/status.js';
import FilesDB from '../db/filesDB.js';
import check from '../misc/authentication.js';
import { Permissions } from '../misc/permissions.js';
import FileRules from '../rules/FileRules.js';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileTypeFromFile } from 'file-type';
import config from '../config.js';
import Logger from '../misc/Logger.js';
import { createRequire } from 'module';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseWrapper } from '../db/db.js';
import { pipeline } from 'stream/promises';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

export default class FilesAPI {
    app: FastifyInstance;
    db: DatabaseWrapper;
    uploadDir: string;

    /**
     * Initialize file upload directory.
     */
    constructor(app: FastifyInstance, db: DatabaseWrapper, passport = null, uploadDir: string | null = null) {
        this.app = app;
        this.db = db;
        this.uploadDir = uploadDir || config.paths.files;

        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    /**
     * Calculate file hash (SHA-256) to identify duplicate content.
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

    /**
     * Get user role for visibility filtering.
     */
    async getUserRole(request: any): Promise<string> {
        if (!request.isAuthenticated || !request.isAuthenticated()) return 'public';
        if (await Permissions.hasAnyPermission(this.db, request.user.id)) return 'exec';
        return 'member';
    }

    /**
     * Registers all file and category related routes.
     */
    registerRoutes() {
        /**
         * List files with pagination, sorting, and category filtering.
         */
        this.app.get<{ Querystring: any }>('/api/files', async (request, reply) => {
            const role = await this.getUserRole(request);
            const query = request.query as any;
            const options = {
                page: parseInt(query.page as string) || 1,
                limit: parseInt(query.limit as string) || 20,
                search: query.search as string,
                sort: query.sort as string,
                order: query.order as 'asc' | 'desc',
                categoryId: query.categoryId as string,
                includeUsed: query.includeUsed === 'true'
            };

            const status = await FilesDB.getFiles(this.db, options, role);
            return status.getResponse(reply);
        });

        /**
         * Upload multiple files.
         */
        this.app.post('/api/files', { preHandler: [check('file.write')] }, async (request: any, reply: FastifyReply) => {
            const parts = request.files();
            const results: number[] = [];
            const allowedMimes = [
                'image/jpeg', 'image/png', 'image/gif', 'image/webp', 
                'application/pdf', 'text/plain',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];

            let body: any = {};

            for await (const part of parts) {
                if (part.type === 'file') {
                    const tempFilename = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    const tempPath = path.join(this.uploadDir, tempFilename);
                    
                    await pipeline(part.file, fs.createWriteStream(tempPath));

                    let fileTypeResult: any;
                    try {
                        fileTypeResult = await fileTypeFromFile(tempPath);
                    } catch (e) {
                        fileTypeResult = null;
                    }

                    if (!fileTypeResult && part.filename.endsWith('.txt')) {
                        fileTypeResult = { mime: 'text/plain', ext: 'txt' };
                    }

                    if (!fileTypeResult || !allowedMimes.includes(fileTypeResult.mime)) {
                        try {
                            await fs.promises.unlink(tempPath);
                        } catch (err) {
                            Logger.error('Failed to delete invalid file:', err);
                        }
                        return reply.status(400).send({ message: 'Invalid file content or type not allowed.' });
                    }

                    // Rename file to include correct extension
                    const ext = `.${fileTypeResult.ext}`;
                    const finalFilename = tempFilename + ext;
                    const finalPath = tempPath + ext;
                    try {
                        await fs.promises.rename(tempPath, finalPath);
                    } catch (err) {
                        Logger.error('Failed to rename uploaded file:', err);
                        return reply.status(500).send({ message: 'File processing error.' });
                    }

                    const fileHash = await this.calculateHash(finalPath);
                    const existingFileStatus = await FilesDB.getFileByHash(this.db, fileHash);
                    let dbFilename = finalFilename;

                    if (!existingFileStatus.isError()) {
                        const existingFile = existingFileStatus.getData();
                        try {
                            await fs.promises.unlink(finalPath);
                        } catch (err) {}
                        dbFilename = existingFile.filename;
                    }

                    let defaultTitle = part.filename;
                    const originalExt = path.extname(part.filename);
                    if (originalExt && defaultTitle.endsWith(originalExt)) {
                        defaultTitle = defaultTitle.slice(0, -originalExt.length);
                    }

                    let content: string | null = null;
                    const stats = await fs.promises.stat(path.join(this.uploadDir, dbFilename));

                    if (fileTypeResult.mime === 'text/plain') {
                        try {
                            content = await fs.promises.readFile(path.join(this.uploadDir, dbFilename), 'utf8');
                        } catch (err) {
                            Logger.error('Failed to read text file content:', err);
                        }
                    } else if (fileTypeResult.mime === 'application/pdf') {
                        try {
                            const dataBuffer = await fs.promises.readFile(path.join(this.uploadDir, dbFilename));
                            const pdfData = await pdf(dataBuffer);
                            content = pdfData.text;
                        } catch (err) {
                            Logger.error('Failed to extract PDF content:', err);
                        }
                    } else if (fileTypeResult.mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                        try {
                            const result = await mammoth.extractRawText({ path: path.join(this.uploadDir, dbFilename) });
                            content = result.value;
                        } catch (err) {
                            Logger.error('Failed to extract DOCX content:', err);
                        }
                    }

                    const data = {
                        title: body.title || defaultTitle,
                        author: body.author || (request.user.first_name + ' ' + request.user.last_name),
                        date: body.date,
                        size: stats.size,
                        filename: dbFilename,
                        hash: fileHash,
                        category_id: body.categoryId,
                        visibility: body.visibility || 'members',
                        content: content
                    };
                    const status = await FilesDB.createFile(this.db, data);
                    if (status.isError()) {
                        return status.getResponse(reply);
                    }
                    results.push(status.getData().id);
                } else {
                    // It's a field
                    body[part.fieldname] = part.value;
                }
            }

            return reply.status(201).send({ success: true, ids: results });
        });

        /**
         * Edit file metadata.
         */
        this.app.put<{ Params: { id: string }, Body: any }>('/api/files/:id', { preHandler: [check('file.edit')] }, async (request, reply) => {
            const id = request.params.id;
            const body = request.body as any;
            const data = {
                title: body.title,
                author: body.author,
                date: body.date,
                visibility: body.visibility,
                category_id: body.categoryId
            };

            const status = await FilesDB.updateFile(this.db, id, data);
            return status.getResponse(reply);
        });

        /**
         * Delete a file and its disk file.
         */
        this.app.delete<{ Params: { id: string } }>('/api/files/:id', { preHandler: [check('file.write')] }, async (request, reply) => {
            const id = request.params.id;
            const fileStatus = await FilesDB.getFileById(this.db, id);

            if (fileStatus.isError()) return fileStatus.getResponse(reply);

            const file = fileStatus.getData();
            const filePath = path.join(this.uploadDir, file.filename);

            try {
                await fs.promises.unlink(filePath);
            } catch (err) {
                // Ignore if file not found
            }

            const status = await FilesDB.deleteFile(this.db, id);
            return status.getResponse(reply);
        });

        /**
         * Download/View a file.
         */
        this.app.get('/api/files/:id/download', async (request: any, reply: FastifyReply) => {
            try {
                const id = request.params.id;
                const fileStatus = await FilesDB.getFileById(this.db, id);
                if (fileStatus.isError()) return fileStatus.getResponse(reply);

                const file = fileStatus.getData();
                const role = await this.getUserRole(request);

                if (!await FileRules.canAccessFile(this.db, file, request.user, role)) {
                    return reply.status(403).send({ message: 'Forbidden' });
                }

                const filePath = path.join(this.uploadDir, file.filename);

                try {
                    await fs.promises.access(filePath);
                } catch {
                     return reply.status(404).send({ message: 'File not found' });
                }

                const ext = path.extname(file.filename);

                let downloadName = file.title;
                if (!downloadName.toLowerCase().endsWith(ext.toLowerCase())) {
                    downloadName += ext;
                }

                if (request.query.view === 'true') {
                    // Set ETag based on file hash for efficient caching
                    reply.header('ETag', `"${file.hash}"`);
                    
                    // If file is an image, allow long-term caching
                    if (file.filename.match(/\.(jpg|jpeg|png|gif|svg|ico|webp)$/i)) {
                        reply.header('Cache-Control', 'public, max-age=31536000, immutable');
                    } else {
                        reply.header('Cache-Control', 'public, max-age=3600'); // 1 hour for other viewable files
                    }

                    return reply.sendFile(file.filename, this.uploadDir);
                }

                // For download, we might need to set headers manually or use a plugin
                reply.header('ETag', `"${file.hash}"`);
                reply.header('Content-Disposition', `attachment; filename="${downloadName}"`);
                return reply.sendFile(file.filename, this.uploadDir);
            } catch (error: any) {
                Logger.error('Error in download route:', error);
                return reply.status(500).send({ message: 'Internal Server Error', error: error.message });
            }
        });

        /**
         * List all file categories.
         */
        this.app.get('/api/file-categories', async (request: FastifyRequest, reply: FastifyReply) => {
            const role = await this.getUserRole(request);
            const status = await FilesDB.getCategories(this.db, role);
            return status.getResponse(reply);
        });

        /**
         * Create a new file category.
         */
        this.app.post('/api/file-categories', { preHandler: [check('file.category.manage')] }, async (request: FastifyRequest, reply: FastifyReply) => {
            const status = await FilesDB.createCategory(this.db, request.body as any);
            return status.getResponse(reply);
        });

        /**
         * Update an existing category.
         */
        this.app.put<{ Params: { id: string } }>('/api/file-categories/:id', { preHandler: [check('file.category.manage')] }, async (request, reply) => {
            const status = await FilesDB.updateCategory(this.db, request.params.id, request.body as any);
            return status.getResponse(reply);
        });

        /**
         * Delete a category.
         */
        this.app.delete<{ Params: { id: string } }>('/api/file-categories/:id', { preHandler: [check('file.category.manage')] }, async (request, reply) => {
            const status = await FilesDB.deleteCategory(this.db, request.params.id);
            return status.getResponse(reply);
        });
    }
}