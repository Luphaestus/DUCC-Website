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

    await db.exec('PRAGMA foreign_keys = ON;');

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
      hashed_password TEXT,
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

      free_sessions INTEGER NOT NULL DEFAULT 3,
      is_member BOOLEAN NOT NULL DEFAULT 0,

      agrees_to_fitness_statement BOOLEAN,
      agrees_to_club_rules BOOLEAN,
      agrees_to_pay_debts BOOLEAN,
      agrees_to_data_storage BOOLEAN,
      agrees_to_keep_health_data BOOLEAN,
      filled_legal_info BOOLEAN NOT NULL DEFAULT 0,
      
      difficulty_level INTEGER not NULL DEFAULT 1,
      can_manage_events BOOLEAN NOT NULL DEFAULT 0,
      can_manage_users BOOLEAN NOT NULL DEFAULT 0,
      can_manage_transactions BOOLEAN NOT NULL DEFAULT 0,
      is_instructor BOOLEAN NOT NULL DEFAULT 0,
      is_exec BOOLEAN NOT NULL DEFAULT 0,
      first_aid_expiry DATE,

      profile_picture_path TEXT,

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (college_id) REFERENCES colleges(id)
    `, db);

    let event_table_exists = await createTable('events', `
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      location TEXT,
      start DATETIME NOT NULL,
      end DATETIME NOT NULL,
      difficulty_level INTEGER NOT NULL,
      max_attendees INTEGER,
      upfront_cost REAL NOT NULL DEFAULT 0,
      upfront_refund_cutoff DATETIME,
      
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    `, db);

    let event_attendees_table_exists = await createTable('event_attendees', `
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER,
      user_id INTEGER,
      is_attending BOOLEAN NOT NULL DEFAULT 1,
      joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      left_at DATETIME,
      payment_transaction_id INTEGER,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (payment_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
    `, db);

    let transactions_table_exists = await createTable('transactions', `
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      amount REAL NOT NULL,
      description TEXT,
      event_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
    `, db);



    if (!user_table_exists) {
      console.log('Inserting admin user...');
      const email = 'a@a';
      const password = 'a';
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.run(
        `INSERT INTO users (email, hashed_password, first_name, last_name, difficulty_level, can_manage_users, can_manage_events, can_manage_transactions, is_exec)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [email, hashedPassword, 'Admin', 'User', 5, 1, 1, 1, 1]
      );

      if (env === 'dev') {
        const userCount = await db.get('SELECT COUNT(*) as count FROM users');
        console.log('Inserting random users for development...');
        const password = 'password';
        const hashedPassword = await bcrypt.hash(password, 10);

        const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

        for (let i = 0; i < 50; i++) {
          const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
          const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
          const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@durham.ac.uk`;
          const collegeId = Math.floor(Math.random() * 17) + 1;
          const isMember = Math.random() > 0.5;
          const filledLegal = Math.random() > 0.2;
          const isInstructor = Math.random() > 0.9;

          let firstAidExpiry = null;
          if (Math.random() > 0.7) {
            const d = new Date();
            // Random date between -1 year and +2 years
            const daysOffset = Math.floor(Math.random() * 1095) - 365;
            d.setDate(d.getDate() + daysOffset);
            firstAidExpiry = d.toISOString().split('T')[0];
          }

          const result = await db.run(
            `INSERT INTO users (email, hashed_password, first_name, last_name, college_id, is_member, filled_legal_info, is_instructor, first_aid_expiry)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [email, hashedPassword, firstName, lastName, collegeId, isMember, filledLegal, isInstructor, firstAidExpiry]
          );

          const userId = result.lastID;
          const numTx = Math.floor(Math.random() * 4);
          for (let j = 0; j < numTx; j++) {
            const amount = (Math.random() * 100 - 50).toFixed(2);
            await db.run(`INSERT INTO transactions (user_id, amount, description) VALUES (?, ?, ?)`, [userId, amount, `Random transaction ${j + 1}`]);
          }
          console.log('Random users inserted.');
        }
      }

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

          let upfrontRefundCutoff = null;
          if (Math.random() > 0.5) {
            const cutoffDate = new Date(eventDate);
            const cutoffOffsetDays = Math.floor(Math.random() * 3) + 1;
            cutoffDate.setDate(cutoffDate.getDate() - cutoffOffsetDays);
            upfrontRefundCutoff = cutoffDate.toISOString().slice(0, 19).replace('T', ' ');
          }

          sampleEvents.push({
            title: `Sample Event ${i + 1}`,
            description: `This is sample event ${i + 1} for testing.`,
            location: i % 2 === 0 ? 'Online' : 'Community Center',
            start: eventDate.toISOString().slice(0, 19).replace('T', ' '),
            end: endDate.toISOString().slice(0, 19).replace('T', ' '),
            difficulty_level: Math.floor(Math.random() * 5) + 1,
            max_attendees: Math.floor(Math.random() * 10) + 1,
            upfront_cost: (Math.floor(Math.random() * 20) + 1),
            upfront_refund_cutoff: upfrontRefundCutoff
          });
        }

        return sampleEvents;
      };

      const sampleEvents = generateSampleEvents(100);

      for (const event of sampleEvents) {
        await db.run(
          `INSERT INTO events (title, description, location, start, end, difficulty_level, max_attendees, upfront_cost, upfront_refund_cutoff)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [event.title, event.description, event.location, event.start, event.end, event.difficulty_level, event.max_attendees, event.upfront_cost, event.upfront_refund_cutoff]
        );
      }
    }

    if (!transactions_table_exists && env === 'dev') {
      console.log('Creating initial transaction records...');
      const adminUser = await db.get(`SELECT id FROM users WHERE email = ?`, ['a@a']);

      const initialTransactions = [
        { amount: 100.00, description: 'Initial membership fee' },
        { amount: -20.00, description: 'Refund for event cancellation' },
        { amount: -15.50, description: 'Purchase of club merchandise' }
      ];

      for (const tx of initialTransactions) {
        await db.run(
          `INSERT INTO transactions (user_id, amount, description)
                 VALUES (?, ?, ?)`,
          [adminUser.id, tx.amount, tx.description]
        );
      }
      console.log('Initial transactions created successfully.');
    }

    console.log('Database initialized successfully.');

    await db.close();
  } catch (error) {
    console.error('Error initializing database:', error);
  }
})();