const { statusObject } = require('../misc/status.js');
const FilesDB = require('../db/filesDB.js');
const check = require('../misc/authentication.js');
const { Permissions } = require('../misc/permissions.js');
const FileRules = require('../misc/fileRules.js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * API for file management and uploads.
 * @module FilesAPI
 */
class FilesAPI {
    constructor(app, db) {
        this.app = app;
        this.db = db;
        this.uploadDir = path.join(__dirname, '../../data/files');

        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }

        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, this.uploadDir);
            },
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                cb(null, uniqueSuffix + path.extname(file.originalname));
            }
        });

        this.upload = multer({ storage: storage });
    }

    /**
     * Get user role for visibility filtering.
     */
    async getUserRole(req) {
        if (!req.isAuthenticated || !req.isAuthenticated()) return 'public';
        if (await Permissions.hasAnyPermission(this.db, req.user.id)) return 'exec';
        return 'member';
    }

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
                categoryId: req.query.categoryId
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
            for (const file of req.files) {
                // If title is not provided, use originalname but strip extension
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
                    filename: file.filename,
                    category_id: req.body.categoryId,
                    visibility: req.body.visibility || 'members'
                };
                const status = await FilesDB.createFile(this.db, data);
                if (!status.isError()) results.push(status.getData().id);
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

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            const status = await FilesDB.deleteFile(this.db, id);
            status.getResponse(res);
        });

        /**
         * Download/View a file.
         */
        this.app.get('/api/files/:id/download', async (req, res) => {
            const id = req.params.id;
            const fileStatus = await FilesDB.getFileById(this.db, id);
            if (fileStatus.isError()) return fileStatus.getResponse(res);

            const file = fileStatus.getData();
            const role = await this.getUserRole(req);

            if (!FileRules.canAccessFile(file, role)) {
                return res.status(403).json({ message: 'Forbidden' });
            }

            const filePath = path.join(this.uploadDir, file.filename);
            if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found' });

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
        });

        // --- Category Routes ---

        this.app.get('/api/file-categories', async (req, res) => {
            const role = await this.getUserRole(req);
            const status = await FilesDB.getCategories(this.db, role);
            status.getResponse(res);
        });

        this.app.post('/api/file-categories', check('file.category.manage'), async (req, res) => {
            const status = await FilesDB.createCategory(this.db, req.body);
            status.getResponse(res);
        });

        this.app.put('/api/file-categories/:id', check('file.category.manage'), async (req, res) => {
            const status = await FilesDB.updateCategory(this.db, req.params.id, req.body);
            status.getResponse(res);
        });

        this.app.delete('/api/file-categories/:id', check('file.category.manage'), async (req, res) => {
            const status = await FilesDB.deleteCategory(this.db, req.params.id);
            status.getResponse(res);
        });
    }
}

module.exports = FilesAPI;