const { use } = require('passport');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function createTable(tableName, createStatement, db) {
  const tableExists = await db.get(`
    SELECT name FROM sqlite_master WHERE type='table' AND name=?;
  `, [tableName]);

  if (tableExists) return true;

  console.log(`Creating table: ${tableName}`);

  await db.exec(`CREATE TABLE IF NOT EXISTS ${tableName} (${createStatement});`);
  return false;
}

const env = process.env.NODE_ENV || 'development';
console.log(`Running in ${env} mode`);


(async () => {
  try {
    console.log('Opening database connection...');

    const db = await open({
      filename: 'database.db',
      driver: sqlite3.Database
    });

    console.log('Initializing database schema...');

    let college_table_exists = await createTable('colleges', `
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    `, db);

    if (!college_table_exists) {
      console.log('Inserting Durham colleges...');
      const colleges = [
        'castle', 'collingwood', 'grey', 'hatfield', 'johnsnow', 'jb',
        'south', 'aidans', 'stchads', 'stcuthberts', 'hildbede',
        'stjohns', 'stmarys', 'stephenson', 'trevelyan', 'ustinov', 'van-mildert'
      ];
      const stmt = await db.prepare('INSERT INTO colleges (name) VALUES (?)');
      for (const college of colleges) {
        await stmt.run(college);
      }
      await stmt.finalize();
      console.log('Colleges inserted successfully.');
    }

    let user_table_exists = await createTable('users', `
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      email TEXT UNIQUE NOT NULL,
      hashed_password TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,

      date_of_birth DATE,
      college_id INTEGER,
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      home_address TEXT,
      phone_number TEXT,
      
      has_medical_conditions BOOLEAN,
      medical_conditions_details TEXT,
      takes_medication BOOLEAN,
      medication_details TEXT,

      agrees_to_fitness_statement BOOLEAN,
      agrees_to_club_rules BOOLEAN,
      agrees_to_pay_debts BOOLEAN,
      agrees_to_data_storage BOOLEAN,
      agrees_to_keep_health_data BOOLEAN,
      filled_legal_info BOOLEAN NOT NULL DEFAULT 0,
      
      balance REAL NOT NULL DEFAULT 0.0,

      difficulty_level INTEGER not NULL DEFAULT 1,
      can_manage_events BOOLEAN NOT NULL DEFAULT 0,
      can_manage_users BOOLEAN NOT NULL DEFAULT 0,
      is_instructor BOOLEAN NOT NULL DEFAULT 0,
      is_exec BOOLEAN NOT NULL DEFAULT 0,
    
      profile_picture_path TEXT,

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (college_id) REFERENCES colleges(id)
    `, db);

    if (user_table_exists) {
      console.log('User table already exists. You may need to manually add the new columns or reset the database.');
      // NOTE: In a production environment, you would write a migration script here.
    }

    let event_table_exists = await createTable('events', `
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      location TEXT,
      start DATETIME NOT NULL,
      end DATETIME NOT NULL,
      difficulty_level INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    `, db);

    let event_attendees_table_exists = await createTable('event_attendees', `
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER,
      user_id INTEGER,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `, db);



    if (!user_table_exists) {
      console.log('Inserting admin user...');
      const email = 'a@a';
      const password = 'a';
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.run(
        `INSERT INTO users (email, hashed_password, first_name, last_name, difficulty_level, can_manage_users)
              VALUES (?, ?, ?, ?, ?, ?)`,
        [email, hashedPassword, 'Admin', 'User', 5, 1]
      );
      console.log('Admin user created successfully with pre-filled credentials.');
    }


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