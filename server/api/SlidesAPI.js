const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

/**
 * Slides API module.
 * Automatically scans a directory for image files and provides endpoints for the frontend slideshow.
 * Includes a file system watcher to dynamically update the list of slides when files are added or removed.
 *
 * Routes:
 *   GET  /api/slides/count    -> Returns the total number of available slides.
 *   GET  /api/slides/images   -> Returns an array of all slide image URLs.
 *   GET  /api/slides/random   -> Returns a single random slide image URL.
 *   GET  /api/slides/:index   -> Returns the slide image URL at a specific index.
 *
 * @module SlidesAPI
 */
class SlidesAPI {

  /**
   * Initializes the SlidesAPI instance and starts the initial scan.
   * @param {object} app - The Express application instance.
   */
  constructor(app) {
    this.app = app;
    // Parts of the path relative to the public directory
    this.dirParts = ['images', 'slides'];
    // Absolute path to the slides directory
    this.fullDir = path.join(__dirname, '..', '..', 'public', ...this.dirParts);
    // Supported image extensions
    this.allowedExt = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
    this.files = []; // List of filenames
    this.paths = []; // List of URLs (relative to public root)
    this._scanTimer = null;
    this._watcher = null;

    // Start initialization
    this._init().catch(err => {
      console.error('Slides init error:', err);
    });
  }

  /**
   * Performs the initial scan and sets up the file system watcher.
   * @private
   */
  async _init() {
    await this.scan();
    this._setupWatcher();
  }

  /**
   * Scans the slides directory for valid image files.
   * Updates internal state with the found files and their web-accessible paths.
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

    // Filter for files with allowed extensions
    const files = entries
      .filter(d => d.isFile() && this.allowedExt.has(path.extname(d.name).toLowerCase()))
      .map(d => d.name)
      .sort(); // Sort alphabetically for consistency

    this.files = files;
    // Map to public URLs (e.g., /images/slides/banner.png)
    this.paths = files.map(f => path.posix.join('/', ...this.dirParts, f));
  }

  /**
   * Debounces the directory scan to avoid multiple rapid rescans during batch file operations.
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
   * Sets up a persistent watcher on the slides directory.
   * Rescans whenever a change (add, rename, delete) is detected.
   * @private
   */
  _setupWatcher() {
    try {
      this._watcher = fs.watch(this.fullDir, { persistent: true }, (eventType, filename) => {
        this._scheduleScan();
      });

      this._watcher.on('error', (err) => {
        console.warn('Slides watcher error, watcher stopped:', err.message);
        try { this._watcher.close(); } catch { }
        this._watcher = null;
      });
    } catch (err) {
      // Silently fail if watcher cannot be initialized (e.g., directory missing)
      this._watcher = null;
    }
  }

  /**
   * Returns a copy of the current list of slide paths.
   * @returns {string[]} Array of image URLs.
   */
  getFiles() {
    return Array.from(this.paths);
  }

  /**
   * Returns the number of available slide images.
   * @returns {number}
   */
  getFileCount() {
    return this.files.length;
  }

  /**
   * Retrieves a slide path by its index.
   * @param {number} index
   * @returns {string|null} The image URL or null if out of bounds.
   */
  getFileAt(index) {
    if (index >= 0 && index < this.paths.length) return this.paths[index];
    return null;
  }

  /**
   * Picks a random slide from the list.
   * @returns {string|null} A random image URL or null if no slides exist.
   */
  getRandomFile() {
    if (this.paths.length === 0) return null;
    return this.paths[Math.floor(Math.random() * this.paths.length)];
  }

  /**
   * Registers Express routes for the Slides API.
   */
  registerRoutes() {

    this.app.get('/api/slides/count', (req, res) => {
      res.json({ count: this.getFileCount() });
    });

    this.app.get('/api/slides/images', (req, res) => {
      const paths = this.getFiles();
      if (paths.length === 0) return res.status(404).json({ message: 'No slide images found' });
      res.json({ images: paths });
    });

    this.app.get('/api/slides/random', (req, res) => {
      const image = this.getRandomFile();
      if (!image) return res.status(404).json({ message: 'No slide images found' });
      res.json({ image });
    });

    this.app.get('/api/slides/:index', (req, res) => {
      const index = parseInt(req.params.index, 10);
      if (Number.isNaN(index) || index < 0) {
        return res.status(400).json({ message: 'Index must be a non-negative integer' });
      }
      const image = this.getFileAt(index);
      if (!image) return res.status(404).json({ message: 'Image not found at the specified index' });
      res.json({ image });
    });
  }

  /**
   * Cleans up resources (watcher and timers) when the instance is no longer needed.
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