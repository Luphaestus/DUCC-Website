const PORT = process.env.PORT || 3000;

const express = require('express');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

let db;
(async () => {
  try {
    db = await open({
      filename: 'database.db',
      driver: sqlite3.Database
    });

    console.log('Connected to the SQLite database.');

    const slides = require('./api/slides.js');
    new slides(app).registerRoutes();
    
    const events = require('./api/events.js');
    new events(app, db).registerRoutes();

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log('Press Ctrl+C to stop the server.');
    });

  } catch (err) {
    console.error(err.message);
  }
})();

