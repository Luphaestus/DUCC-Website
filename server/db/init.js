const { use } = require('passport');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const bcrypt = require('bcrypt');



require('dotenv').config();

const env = process.env.NODE_ENV || 'development';
console.log(`Running in ${env} mode`);

async function createAdminUser(db) {
  const email = 'a@a';
  const password = 'a';
  const hashedPassword = await bcrypt.hash(password, 10);
  await db.run(
    `INSERT INTO users (email, hashed_password, first_name, last_name)
              VALUES (?, ?, ?, ?)`,
    [email, hashedPassword, 'Admin', 'User']
  );
  console.log('Admin user created successfully with pre-filled credentials.');
}

(async () => {
  try {
    console.log('Opening database connection...');

    const db = await open({
      filename: 'database.db',
      driver: sqlite3.Database
    });

    user_table_exists = await db.get(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='users';
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        hashed_password TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        difficulty_level INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    if (!user_table_exists) {
      console.log('Inserting admin user...');
      await createAdminUser(db);
    }

    event_table_exists = await db.get(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='events';
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        location TEXT,
        start DATETIME NOT NULL,
        end DATETIME NOT NULL,
        difficulty_level INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    if (env === 'dev' && !event_table_exists) {
      console.log('Inserting sample data for development environment...');

      date = new Date();

      const generateSampleEvents = (count) => {
        const sampleEvents = [];
        const now = new Date();

        for (let i = 0; i < count; i++) {
          const eventDate = new Date(now);
          const offsetDays = Math.floor(Math.random() * 14) - 7;
          eventDate.setDate(eventDate.getDate() + offsetDays);

          const startHour = Math.floor(Math.random() * 12) + 8;
          eventDate.setHours(startHour, 0, 0, 0);

          const endDate = new Date(eventDate);
          endDate.setHours(endDate.getHours() + 2);

          sampleEvents.push({
            title: `Sample Event ${i + 1}`,
            description: `This is sample event ${i + 1} for testing.`,
            location: i % 2 === 0 ? 'Online' : 'Community Center',
            start: eventDate.toISOString().slice(0, 19).replace('T', ' '),
            end: endDate.toISOString().slice(0, 19).replace('T', ' '),
            difficulty_level: Math.floor(Math.random() * 5) + 1
          });
        }

        return sampleEvents;
      };

      const sampleEvents = generateSampleEvents(100);

      for (const event of sampleEvents) {
        await db.run(
          `INSERT INTO events (title, description, location, start, end, difficulty_level)
                 VALUES (?, ?, ?, ?, ?, ?)`,
          [event.title, event.description, event.location, event.start, event.end, event.difficulty_level]
        );
      }
    }



    console.log('Database initialized successfully.');

    await db.close();
  } catch (error) {
    console.error('Error initializing database:', error);
  }
})();