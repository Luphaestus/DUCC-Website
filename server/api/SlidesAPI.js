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

/**
 * API for scanning and serving slideshow images.
 * @module SlidesAPI
 */
class SlidesAPI {

  /**
   * Initialize and start initial scan.
   * @param {object} app - The Express application instance.
   */
  constructor(app) {
    this.app = app;
    this.dirParts = ['images', 'slides'];
    this.fullDir = path.join(__dirname, '..', '..', 'public', ...this.dirParts);
    this.allowedExt = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
    this.files = [];
    this.paths = [];
    this._scanTimer = null;
    this._watcher = null;

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
      if (paths.length === 0) return res.status(404).json({ message: 'No slides found' });
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