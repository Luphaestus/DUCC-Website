const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

/**
 * Slides - manages slide image files and exposes API routes.
 *
 * Routes:
 *   GET  /api/slides/count    -> { count: number }
 *   GET  /api/slides/images   -> { images: string[] }
 *   GET  /api/slides/random   -> { image: string }
 *   GET  /api/slides/:index   -> { image: string }
 *
 * @module Slides
 */
class Slides {
  constructor(app) {
    this.app = app;
    this.dirParts = ['images', 'slides'];
    this.fullDir = path.join(__dirname, '..', 'public', ...this.dirParts);
    this.allowedExt = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
    this.files = []; 
    this.paths = []; 
    this._scanTimer = null;
    this._watcher = null;

    this._init().catch(err => {
      console.error('Slides init error:', err);
    });
  }

  async _init() {
    await this.scan();       
    this._setupWatcher();   
  }

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

  _scheduleScan() {
    if (this._scanTimer) clearTimeout(this._scanTimer);
    this._scanTimer = setTimeout(() => {
      this.scan().catch(err => console.error('Rescan error:', err));
      this._scanTimer = null;
    }, 250);
  }

  _setupWatcher() {
    try {
      this._watcher = fs.watch(this.fullDir, { persistent: false }, (eventType, filename) => {
        this._scheduleScan();
      });

      this._watcher.on('error', (err) => {
        console.warn('Slides watcher error, watcher stopped:', err.message);
        try { this._watcher.close(); } catch {}
        this._watcher = null;
      });
    } catch (err) {
      this._watcher = null;
    }
  }

  getFiles() {
    return Array.from(this.paths);
  }

  getFileCount() {
    return this.files.length;
  }

  getFileAt(index) {
    if (index >= 0 && index < this.paths.length) return this.paths[index];
    return null;
  }

  getRandomFile() {
    if (this.paths.length === 0) return null;
    return this.paths[Math.floor(Math.random() * this.paths.length)];
  }

  registerRoutes(app) {
    // GET /api/slides/count
    app.get('/api/slides/count', (req, res) => {
      res.json({ count: this.getFileCount() });
    });

    // GET /api/slides/images
    app.get('/api/slides/images', (req, res) => {
      const paths = this.getFiles();
      if (paths.length === 0) return res.status(404).json({ error: 'No slide images found' });
      res.json({ images: paths });
    });

    // GET /api/slides/random
    app.get('/api/slides/random', (req, res) => {
      const image = this.getRandomFile();
      if (!image) return res.status(404).json({ error: 'No slide images found' });
      res.json({ image });
    });

    // GET /api/slides/:index
    app.get('/api/slides/:index', (req, res) => {
      const index = parseInt(req.params.index, 10);
      if (Number.isNaN(index) || index < 0) {
        return res.status(400).json({ error: 'Index must be a non-negative integer' });
      }
      const image = this.getFileAt(index);
      if (!image) return res.status(404).json({ error: 'Image not found at the specified index' });
      res.json({ image });
    });
  }

  close() {
    if (this._watcher) {
      try { this._watcher.close(); } catch {}
      this._watcher = null;
    }
    if (this._scanTimer) {
      clearTimeout(this._scanTimer);
      this._scanTimer = null;
    }
  }
}

module.exports = Slides;