const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

/**
 * Routes:
 *   GET  /api/slides/count    -> { count: number }
 *   GET  /api/slides/images   -> { images: string[] }
 *   GET  /api/slides/random   -> { image: string }
 *   GET  /api/slides/:index   -> { image: string }
 *
 * @module SlidesAPI
 */
class SlidesAPI {

  /**
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

    this._init().catch(err => {
      console.error('Slides init error:', err);
    });
  }

  /**
   * Initializes the Slides instance by scanning for files and setting up a watcher.
   * @private
   */
  async _init() {
    await this.scan();
    this._setupWatcher();
  }

  /**
   * Scans the slides directory for image files and updates the internal file lists.
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
    this.paths = files.map(f => path.posix.join('/', ...this.dirParts, f));
  }

  /**
   * Schedules a scan of the slides directory after a short delay.
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
   * Sets up a file system watcher for the slides directory to detect changes.
   * @private
   */
  _setupWatcher() {
    try {
      this._watcher = fs.watch(this.fullDir, { persistent: false }, (eventType, filename) => {
        this._scheduleScan();
      });

      this._watcher.on('error', (err) => {
        console.warn('Slides watcher error, watcher stopped:', err.message);
        try { this._watcher.close(); } catch { }
        this._watcher = null;
      });
    } catch (err) {
      this._watcher = null;
    }
  }

  /**
   * Returns an array of all slide image paths.
   * @returns {string[]} An array of slide image paths.
   */
  getFiles() {
    return Array.from(this.paths);
  }

  /**
   * Returns the total count of slide images.
   * @returns {number} The number of slide images.
   */
  getFileCount() {
    return this.files.length;
  }

  /**
   * Returns the path of the slide image at the specified index.
   * @param {number} index - The index of the image to retrieve.
   * @returns {string|null} The image path if found, otherwise null.
   */
  getFileAt(index) {
    if (index >= 0 && index < this.paths.length) return this.paths[index];
    return null;
  }

  /**
   * Returns a random slide image path.
   * @returns {string|null} A random image path if available, otherwise null.
   */
  getRandomFile() {
    if (this.paths.length === 0) return null;
    return this.paths[Math.floor(Math.random() * this.paths.length)];
  }

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
   * Closes the file system watcher and clears any pending scan timers.
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