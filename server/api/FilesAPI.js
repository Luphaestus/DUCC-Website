/**
 * FilesAPI.js
 * 
 * This file handles file management, uploads, and category organization.
 * 
 * Routes:
 * - GET /api/files: List files with pagination and filtering.
 * - POST /api/files: Upload one or more files.
 * - PUT /api/files/:id: Update file metadata.
 * - DELETE /api/files/:id: Delete a file and its physical data.
 * - GET /api/files/:id/download: Download or view a file.
 * 
 * Category Routes:
 * - GET /api/file-categories: Fetch all file categories.
 * - POST /api/file-categories: Create a new category.
 * - PUT /api/file-categories/:id: Update a category.
 * - DELETE /api/file-categories/:id: Delete a category.
 */

const { statusObject } = require('../misc/status.js');
const FilesDB = require('../db/filesDB.js');
const check = require('../misc/authentication.js');
const { Permissions } = require('../misc/permissions.js');
const FileRules = require('../rules/FileRules.js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

/**
 * API for file management and uploads.
 * @module FilesAPI
 */
class FilesAPI {
    /**
     * @param {object} app - Express app.
     * @param {object} db - Database connection.
     * @param {object} [passport=null] - Passport instance (optional).
     * @param {string} [uploadDir=null] - Custom upload directory (optional).
     */
    constructor(app, db, passport = null, uploadDir = null) {
        this.app = app;
        this.db = db;
        this.uploadDir = uploadDir || path.join(__dirname, '../../data/files');

        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }

        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, this.uploadDir);
            },
            filename: (req, file, cb) => {
                // Generate a unique filename to prevent collisions
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                cb(null, uniqueSuffix + path.extname(file.originalname));
            }
        });

        this.upload = multer({ 
            storage: storage,
            fileFilter: (req, file, cb) => {
                const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
                if (allowedTypes.includes(file.mimetype)) {
                    cb(null, true);
                } else {
                    cb(new Error('Invalid file type.'), false);
                }
            }
        });
    }

    /**
     * Calculate file hash (SHA-256) to identify duplicate content.
     * @param {string} filePath - Path to the file.
     * @returns {Promise<string>} - The file hash.
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
     * @param {object} req - Express request object.
     * @returns {Promise<string>} - 'public', 'member', or 'exec'.
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
         * Checks for existing files with the same hash to save storage.
         */
        this.app.post('/api/files', check('file.write'), this.upload.array('files'), async (req, res) => {
            if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'No files uploaded.' });

            const results = [];
            for (const file of req.files) {
                const filePath = file.path;
                const fileHash = await this.calculateHash(filePath);

                // Check for existing file with same hash to deduplicate
                const existingFileStatus = await FilesDB.getFileByHash(this.db, fileHash);
                let finalFilename = file.filename;

                if (!existingFileStatus.isError()) {
                    const existingFile = existingFileStatus.getData();
                    // If file exists, we delete the newly uploaded one and reuse the existing record
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                    finalFilename = existingFile.filename;
                }

                let defaultTitle = file.originalname;
                const ext = path.extname(file.originalname);
                if (ext && defaultTitle.endsWith(ext)) {
                    defaultTitle = defaultTitle.slice(0, -ext.length);
                }

                const data = {
                    title: req.body.title || defaultTitle,
                    author: req.body.author || (req.user.first_name + ' ' + req.user.last_name),
                    date: req.body.date,
                    size: file.size,
                    filename: finalFilename,
                    hash: fileHash,
                    category_id: req.body.categoryId,
                    visibility: req.body.visibility || 'members'
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

            // Physically delete the file from storage
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            const status = await FilesDB.deleteFile(this.db, id);
            status.getResponse(res);
        });

        /**
         * Download/View a file.
         * Enforces visibility rules based on the user's role and event participation.
         */
        this.app.get('/api/files/:id/download', async (req, res) => {
            try {
                const id = req.params.id;
                const fileStatus = await FilesDB.getFileById(this.db, id);
                if (fileStatus.isError()) return fileStatus.getResponse(res);

                const file = fileStatus.getData();
                const role = await this.getUserRole(req);

                // Check if the user has access based on the file's visibility settings
                if (!await FileRules.canAccessFile(this.db, file, req.user, role)) {
                    return res.status(403).json({ message: 'Forbidden' });
                }

                const filePath = path.join(this.uploadDir, file.filename);
                if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found' });

                const ext = path.extname(file.filename);

                let downloadName = file.title;
                if (!downloadName.toLowerCase().endsWith(ext.toLowerCase())) {
                    downloadName += ext;
                }

                // 'view=true' query param triggers inline display instead of force download
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
                console.error('Error in download route:', error);
                res.status(500).json({ message: 'Internal Server Error', error: error.message });
            }
        });

        // --- Category Routes ---

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

module.exports = FilesAPI;