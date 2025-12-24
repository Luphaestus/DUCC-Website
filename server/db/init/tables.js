const { createTable, generateRandomPassword } = require('./utils');
const bcrypt = require('bcrypt');

async function createTables(db) {
  await createTable('colleges', `
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    `, db);

  await createTable('users', `
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

  await createTable('events', `
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

  await createTable('event_attendees', `
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

  await createTable('transactions', `
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      amount REAL NOT NULL,
      description TEXT,
      event_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
    `, db);

  await createTable('tags', `
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#808080',
      description TEXT,
      min_difficulty INTEGER,
      priority INTEGER DEFAULT 0
    `, db);

  await createTable('event_tags', `
      event_id INTEGER,
      tag_id INTEGER,
      PRIMARY KEY (event_id, tag_id),
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    `, db);

  await createTable('tag_whitelists', `
      tag_id INTEGER,
      user_id INTEGER,
      PRIMARY KEY (tag_id, user_id),
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `, db);
}

module.exports = { createTables };
