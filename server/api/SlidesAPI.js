/**
 * SlidesAPI.js
 * 
 * This file scans the public/images/slides directory and serves image paths for the home page slideshow.
 * It features an automated directory watcher to update the file list when images are added or removed.
 * 
 * Routes:
 * - GET /api/slides/count: Fetch the total number of slide images.
 * - GET /api/slides/images: Fetch an array of all slide image paths.
 * - GET /api/slides/random: Fetch a random slide image path.
 * - GET /api/slides/:index: Fetch a slide image path by its index.
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const multer = require('multer');
const check = require('../misc/authentication.js');
const FilesDB = require('../db/filesDB.js');

/**
 * API for scanning and serving slideshow images.
 * @module SlidesAPI
 */
class SlidesAPI {

  /**
   * Initialize and start initial scan.
   * @param {object} app - The Express application instance.
   * @param {object} db - Database connection.
   */
  constructor(app, db) {
    this.app = app;
    this.db = db;
    this.dirParts = ['images', 'slides'];
    this.fullDir = path.join(__dirname, '..', '..', 'public', ...this.dirParts);
    this.allowedExt = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
    this.files = [];
    this.paths = [];
    this._scanTimer = null;
    this._watcher = null;

    // Ensure slides directory exists
    if (!fs.existsSync(this.fullDir)) {
      fs.mkdirSync(this.fullDir, { recursive: true });
    }

    // Configure multer for uploads
    const storage = multer.diskStorage({
      destination: (req, file, cb) => cb(null, this.fullDir),
      filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^a-z0-9.]/gi, '_'))
    });

    this.upload = multer({
      storage: storage,
      fileFilter: (req, file, cb) => {
        if (this.allowedExt.has(path.extname(file.originalname).toLowerCase())) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type'), false);
        }
      },
      limits: { fileSize: 10 * 1024 * 1024 }
    });

    // Start initial scan and watcher
    this._init().catch(err => {
      console.error('Slides init error:', err);
    });
  }

  /**
   * Start initial scan and setup watcher.
   * @private
   */
  async _init() {
    await this.scan();
    this._setupWatcher();
  }

  /**
   * Scan directory for valid images and update internal path lists.
   */
  async scan() {
    let entries = [];
    try {
      entries = await fsp.readdir(this.fullDir, { withFileTypes: true });
    } catch (err) {
      if (err.code !== 'ENOENT') console.error('Failed to read slides directory:', err);
      this.files = [];
      this.paths = [];
      return;
    }

    const files = entries
      .filter(d => d.isFile() && this.allowedExt.has(path.extname(d.name).toLowerCase()))
      .map(d => d.name)
      .sort();

    this.files = files;
    // Map to public paths accessible by the browser
    this.paths = files.map(f => path.posix.join('/', ...this.dirParts, f));
  }

  /**
   * Schedule a directory scan with debouncing.
   * @private
   */
  _scheduleScan() {
    if (this._scanTimer) clearTimeout(this._scanTimer);
    this._scanTimer = setTimeout(() => {
      this.scan().catch(err => console.error('Rescan error:', err));
      this._scanTimer = null;
    }, 250);
  }

  /**
   * Watch the slides directory for changes.
   * @private
   */
  _setupWatcher() {
    try {
      this._watcher = fs.watch(this.fullDir, { persistent: true }, (eventType, filename) => {
        this._scheduleScan();
      });

      this._watcher.on('error', (err) => {
        console.warn('Slides watcher error:', err.message);
        try { this._watcher.close(); } catch { }
        this._watcher = null;
      });
    } catch (err) {
      this._watcher = null;
    }
  }

  /**
   * Get all slide URLs.
   * @returns {string[]}
   */
  getFiles() {
    return Array.from(this.paths);
  }

  /**
   * Get total count of slide images.
   * @returns {number}
   */
  getFileCount() {
    return this.files.length;
  }

  /**
   * Get slide URL by index.
   * @param {number} index - Index of the file.
   * @returns {string|null}
   */
  getFileAt(index) {
    if (index >= 0 && index < this.paths.length) return this.paths[index];
    return null;
  }

  /**
   * Get random slide URL.
   * @returns {string|null}
   */
  getRandomFile() {
    if (this.paths.length === 0) return null;
    return this.paths[Math.floor(Math.random() * this.paths.length)];
  }

  /**
   * Register slides-related routes.
   */
  registerRoutes() {

    this.app.get('/api/slides/count', (req, res) => {
      res.json({ count: this.getFileCount() });
    });

    this.app.get('/api/slides/images', (req, res) => {
      const paths = this.getFiles();
      res.json({ images: paths });
    });

    this.app.get('/api/slides/random', (req, res) => {
      const image = this.getRandomFile();
      if (!image) return res.status(404).json({ message: 'No slides found' });
      res.json({ image });
    });

    this.app.get('/api/slides/:index', (req, res) => {
      const index = parseInt(req.params.index, 10);
      if (Number.isNaN(index) || index < 0) {
        return res.status(400).json({ message: 'Invalid index' });
      }
      const image = this.getFileAt(index);
      if (!image) return res.status(404).json({ message: 'Image not found' });
      res.json({ image });
    });

    // --- Management Routes ---

    // Upload new slide
    this.app.post('/api/slides/upload', check('file.write'), this.upload.single('file'), (req, res) => {
      if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
      res.json({ message: 'Slide uploaded', filename: req.file.filename });
    });

    // Import from library
    this.app.post('/api/slides/import', check('file.write'), async (req, res) => {
      const { fileId } = req.body;
      if (!fileId) return res.status(400).json({ message: 'Missing fileId' });

      try {
        const fileStatus = await FilesDB.getFileById(this.db, fileId);
        if (fileStatus.isError()) return fileStatus.getResponse(res);
        const file = fileStatus.getData();

        const filesDir = path.join(__dirname, '../../data/files');
        const srcPath = path.join(filesDir, file.filename);

        if (!fs.existsSync(srcPath)) return res.status(404).json({ message: 'Source file not found' });

        const destFilename = Date.now() + '-' + file.filename.replace(/[^a-z0-9.]/gi, '_');
        const destPath = path.join(this.fullDir, destFilename);

        await fsp.copyFile(srcPath, destPath);
        res.json({ message: 'Slide imported', filename: destFilename });
      } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Import failed' });
      }
    });

    // Delete slide
    this.app.delete('/api/slides', check('file.write'), async (req, res) => {
      const { filename } = req.body;
      if (!filename) return res.status(400).json({message: 'Missing filename'});

      const cleanName = path.basename(filename); // Simple path traversal protection
      if (!this.files.includes(cleanName)) return res.status(404).json({message: 'Slide not found'});
      
      const filePath = path.join(this.fullDir, cleanName);
      
      try {
        await fsp.unlink(filePath);
        // Manually trigger rescan just in case
        await this.scan();
        res.json({ message: 'Slide deleted' });
      } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Delete failed' });
      }
    });
  }

  /**
   * Cleanup file watcher and scan timers.
   */
  close() {
    if (this._watcher) {
      try { this._watcher.close(); } catch { }
      this._watcher = null;
    }
    if (this._scanTimer) {
      clearTimeout(this._scanTimer);
      this._scanTimer = null;
    }
  }
}

module.exports = SlidesAPI;