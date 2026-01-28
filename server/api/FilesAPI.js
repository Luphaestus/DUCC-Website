/**
 * FilesAPI.js
 * 
 * This file handles file management, uploads, and categories.
 */

import { statusObject } from '../misc/status.js';
import FilesDB from '../db/filesDB.js';
import check from '../misc/authentication.js';
import { Permissions } from '../misc/permissions.js';
import FileRules from '../rules/FileRules.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileTypeFromFile } from 'file-type';
import config from '../config.js';
import Logger from '../misc/Logger.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

export default class FilesAPI {
    /**
     * Initialize file upload directory and storage.
     */
    constructor(app, db, passport = null, uploadDir = null) {
        this.app = app;
        this.db = db;
        this.uploadDir = uploadDir || config.paths.files;

        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }

        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, this.uploadDir);
            },
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                cb(null, uniqueSuffix); // Save without extension first
            }
        });

        this.upload = multer({ 
            storage: storage
            // Removed fileFilter that trusted mimetype
        });
    }

    /**
     * Calculate file hash (SHA-256) to identify duplicate content.
     */
    async calculateHash(filePath) {
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
    async getUserRole(req) {
        if (!req.isAuthenticated || !req.isAuthenticated()) return 'public';
        if (await Permissions.hasAnyPermission(this.db, req.user.id)) return 'exec';
        return 'member';
    }

    /**
     * Registers all file and category related routes.
     */
    registerRoutes() {
        /**
         * List files with pagination, sorting, and category filtering.
         */
        this.app.get('/api/files', async (req, res) => {
            const role = await this.getUserRole(req);
            const options = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                search: req.query.search,
                sort: req.query.sort,
                order: req.query.order,
                categoryId: req.query.categoryId,
                includeUsed: req.query.includeUsed === 'true'
            };

            const status = await FilesDB.getFiles(this.db, options, role);
            status.getResponse(res);
        });

        /**
         * Upload multiple files.
         */
        this.app.post('/api/files', check('file.write'), this.upload.array('files'), async (req, res) => {
            if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'No files uploaded.' });

            const results = [];
            const allowedMimes = [
                'image/jpeg', 'image/png', 'image/gif', 'image/webp', 
                'application/pdf', 'text/plain',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];

            for (const file of req.files) {
                const filePath = file.path;
                let fileTypeResult;
                try {
                    fileTypeResult = await fileTypeFromFile(filePath);
                } catch (e) {
                    fileTypeResult = null;
                }

                if (!fileTypeResult && file.originalname.endsWith('.txt')) {
                    fileTypeResult = { mime: 'text/plain', ext: 'txt' };
                }

                if (!fileTypeResult || !allowedMimes.includes(fileTypeResult.mime)) {
                    try {
                        await fs.promises.unlink(filePath);
                    } catch (err) {
                        Logger.error('Failed to delete invalid file:', err);
                    }
                    return res.status(400).json({ message: 'Invalid file content or type not allowed.' });
                }

                // Rename file to include correct extension
                const ext = `.${fileTypeResult.ext}`;
                const newFilename = file.filename + ext;
                const newPath = filePath + ext;
                try {
                    await fs.promises.rename(filePath, newPath);
                } catch (err) {
                    Logger.error('Failed to rename uploaded file:', err);
                    return res.status(500).json({ message: 'File processing error.' });
                }
                
                // Update file object references
                file.filename = newFilename;
                file.path = newPath;

                const fileHash = await this.calculateHash(newPath);

                const existingFileStatus = await FilesDB.getFileByHash(this.db, fileHash);
                let finalFilename = file.filename;

                if (!existingFileStatus.isError()) {
                    const existingFile = existingFileStatus.getData();
                    try {
                        await fs.promises.unlink(newPath);
                    } catch (err) {
                        // Ignore if file doesn't exist, though it should
                    }
                    finalFilename = existingFile.filename;
                }

                let defaultTitle = file.originalname;
                const originalExt = path.extname(file.originalname);
                if (originalExt && defaultTitle.endsWith(originalExt)) {
                    defaultTitle = defaultTitle.slice(0, -originalExt.length);
                }

                let content = null;
                if (fileTypeResult.mime === 'text/plain') {
                    try {
                        content = await fs.promises.readFile(newPath, 'utf8');
                    } catch (err) {
                        Logger.error('Failed to read text file content:', err);
                    }
                } else if (fileTypeResult.mime === 'application/pdf') {
                    try {
                        const dataBuffer = await fs.promises.readFile(newPath);
                        const pdfData = await pdf(dataBuffer);
                        content = pdfData.text;
                    } catch (err) {
                        Logger.error('Failed to extract PDF content:', err);
                    }
                } else if (fileTypeResult.mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                    try {
                        const result = await mammoth.extractRawText({ path: newPath });
                        content = result.value;
                    } catch (err) {
                        Logger.error('Failed to extract DOCX content:', err);
                    }
                }

                const data = {
                    title: req.body.title || defaultTitle,
                    author: req.body.author || (req.user.first_name + ' ' + req.user.last_name),
                    date: req.body.date,
                    size: file.size,
                    filename: finalFilename,
                    hash: fileHash,
                    category_id: req.body.categoryId,
                    visibility: req.body.visibility || 'members',
                    content: content
                };
                const status = await FilesDB.createFile(this.db, data);
                if (status.isError()) {
                    return status.getResponse(res);
                }
                results.push(status.getData().id);
            }

            res.status(201).json({ success: true, ids: results });
        });

        /**
         * Edit file metadata.
         */
        this.app.put('/api/files/:id', check('file.edit'), async (req, res) => {
            const id = req.params.id;
            const data = {
                title: req.body.title,
                author: req.body.author,
                date: req.body.date,
                visibility: req.body.visibility,
                category_id: req.body.categoryId
            };

            const status = await FilesDB.updateFile(this.db, id, data);
            status.getResponse(res);
        });

        /**
         * Delete a file and its disk file.
         */
        this.app.delete('/api/files/:id', check('file.write'), async (req, res) => {
            const id = req.params.id;
            const fileStatus = await FilesDB.getFileById(this.db, id);

            if (fileStatus.isError()) return fileStatus.getResponse(res);

            const file = fileStatus.getData();
            const filePath = path.join(this.uploadDir, file.filename);

            try {
                await fs.promises.unlink(filePath);
            } catch (err) {
                // Ignore if file not found
            }

            const status = await FilesDB.deleteFile(this.db, id);
            status.getResponse(res);
        });

        /**
         * Download/View a file.
         */
        this.app.get('/api/files/:id/download', async (req, res) => {
            try {
                const id = req.params.id;
                const fileStatus = await FilesDB.getFileById(this.db, id);
                if (fileStatus.isError()) return fileStatus.getResponse(res);

                const file = fileStatus.getData();
                const role = await this.getUserRole(req);

                if (!await FileRules.canAccessFile(this.db, file, req.user, role)) {
                    return res.status(403).json({ message: 'Forbidden' });
                }

                const filePath = path.join(this.uploadDir, file.filename);

                
                try {
                    await fs.promises.access(filePath);
                } catch {
                     return res.status(404).json({ message: 'File not found' });
                }

                const ext = path.extname(file.filename);

                let downloadName = file.title;
                if (!downloadName.toLowerCase().endsWith(ext.toLowerCase())) {
                    downloadName += ext;
                }

                if (req.query.view === 'true') {
                    return res.sendFile(filePath, (err) => {
                        if (err && !res.headersSent) {
                            res.status(500).json({ message: 'Error sending file' });
                        }
                    });
                }

                return res.download(filePath, downloadName, (err) => {
                    if (err && !res.headersSent) {
                        res.status(500).json({ message: 'Error downloading file' });
                    }
                });
            } catch (error) {
                Logger.error('Error in download route:', error);
                res.status(500).json({ message: 'Internal Server Error', error: error.message });
            }
        });

        /**
         * List all file categories.
         */
        this.app.get('/api/file-categories', async (req, res) => {
            const role = await this.getUserRole(req);
            const status = await FilesDB.getCategories(this.db, role);
            status.getResponse(res);
        });

        /**
         * Create a new file category.
         */
        this.app.post('/api/file-categories', check('file.category.manage'), async (req, res) => {
            const status = await FilesDB.createCategory(this.db, req.body);
            status.getResponse(res);
        });

        /**
         * Update an existing category.
         */
        this.app.put('/api/file-categories/:id', check('file.category.manage'), async (req, res) => {
            const status = await FilesDB.updateCategory(this.db, req.params.id, req.body);
            status.getResponse(res);
        });

        /**
         * Delete a category.
         */
        this.app.delete('/api/file-categories/:id', check('file.category.manage'), async (req, res) => {
            const status = await FilesDB.deleteCategory(this.db, req.params.id);
            status.getResponse(res);
        });
    }
}
