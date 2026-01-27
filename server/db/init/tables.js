/**
 * tables.js
 * 
 * Defines the entire SQLite schema for the application.
 */

import { createTable } from './utils.js';
import cliProgress from 'cli-progress';
import colors from 'ansi-colors';

/**
 * Executes the table creation sequence with a progress bar.
 */
export async function createTables(db) {
  const tableDefinitions = [
    {
      name: 'colleges',
      schema: `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      `
    },
    {
      name: 'users',
      schema: `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL COLLATE NOCASE,
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
        legal_filled_at DATETIME,
        difficulty_level INTEGER not NULL DEFAULT 1,
        is_instructor BOOLEAN NOT NULL DEFAULT 0,
        first_aid_expiry DATE,
        swims INTEGER NOT NULL DEFAULT 0,
        booties INTEGER NOT NULL DEFAULT 0,
        profile_picture_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (college_id) REFERENCES colleges(id),
        FOREIGN KEY (profile_picture_id) REFERENCES files(id) ON DELETE SET NULL
      `
    },
    {
      name: 'events',
      schema: `
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
        is_canceled BOOLEAN NOT NULL DEFAULT 0,
        enable_waitlist BOOLEAN NOT NULL DEFAULT 1,
        signup_required BOOLEAN NOT NULL DEFAULT 1,
        image_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (image_id) REFERENCES files(id) ON DELETE SET NULL
      `
    },
    {
      name: 'event_attendees',
      schema: `
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
      `
    },
    {
      name: 'transactions',
      schema: `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        amount REAL NOT NULL,
        description TEXT,
        event_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
      `
    },
    {
      name: 'tags',
      schema: `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#808080',
        description TEXT,
        min_difficulty INTEGER,
        priority INTEGER DEFAULT 0,
        join_policy TEXT CHECK(join_policy IN ('open', 'whitelist', 'role')) DEFAULT 'open',
        view_policy TEXT CHECK(view_policy IN ('open', 'whitelist', 'role')) DEFAULT 'open',
        image_id INTEGER,
        FOREIGN KEY (image_id) REFERENCES files(id) ON DELETE SET NULL
      `
    },
    {
      name: 'event_tags',
      schema: `
        event_id INTEGER,
        tag_id INTEGER,
        PRIMARY KEY (event_id, tag_id),
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      `
    },
    {
      name: 'tag_whitelists',
      schema: `
        tag_id INTEGER,
        user_id INTEGER,
        PRIMARY KEY (tag_id, user_id),
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `
    },
    {
      name: 'roles',
      schema: `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT
      `
    },
    {
      name: 'permissions',
      schema: `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT UNIQUE NOT NULL,
        description TEXT
      `
    },
    {
      name: 'role_permissions',
      schema: `
        role_id INTEGER,
        permission_id INTEGER,
        PRIMARY KEY (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      `
    },
    {
      name: 'user_roles',
      schema: `
        user_id INTEGER PRIMARY KEY,
        role_id INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
      `
    },
    {
      name: 'role_managed_tags',
      schema: `
        role_id INTEGER,
        tag_id INTEGER,
        PRIMARY KEY (role_id, tag_id),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      `
    },
    {
      name: 'user_permissions',
      schema: `
        user_id INTEGER,
        permission_id INTEGER,
        PRIMARY KEY (user_id, permission_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      `
    },
    {
      name: 'user_managed_tags',
      schema: `
        user_id INTEGER,
        tag_id INTEGER,
        PRIMARY KEY (user_id, tag_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      `
    },
    {
      name: 'swim_history',
      schema: `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        added_by INTEGER NOT NULL,
        count INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL
      `
    },
    {
      name: 'event_waiting_list',
      schema: `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER,
        user_id INTEGER,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `
    },
    {
      name: 'file_categories',
      schema: `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        default_visibility TEXT CHECK(default_visibility IN ('public', 'members', 'execs', 'events')) NOT NULL DEFAULT 'members'
      `
    },
    {
      name: 'files',
      schema: `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        size INTEGER,
        filename TEXT,
        hash TEXT,
        category_id INTEGER,
        visibility TEXT CHECK(visibility IN ('public', 'members', 'execs', 'events')) NOT NULL DEFAULT 'members',
        FOREIGN KEY (category_id) REFERENCES file_categories(id) ON DELETE SET NULL
      `
    },
    {
      name: 'password_resets',
      schema: `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `
    },
    {
      name: 'slides',
      schema: `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER NOT NULL,
        display_order INTEGER DEFAULT 0,
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
      `
    }
  ];

  if (process.env.NODE_ENV !== 'test') {
    console.log(colors.cyan('Creating database tables...'));
    const progressBar = new cliProgress.SingleBar({
      format: colors.cyan('Tables |') + colors.cyan('{bar}') + '| {percentage}% || {value}/{total} Tables || {table}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    progressBar.start(tableDefinitions.length, 0, { table: 'Initializing...' });

    for (let i = 0; i < tableDefinitions.length; i++) {
      const table = tableDefinitions[i];
      progressBar.update(i, { table: table.name });
      await createTable(table.name, table.schema, db);
      progressBar.update(i + 1, { table: table.name });
    }

    // Add partial unique index for event attendees to prevent duplicate active signups
    await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_event_attendees_unique_active ON event_attendees(event_id, user_id) WHERE is_attending = 1;');

    progressBar.stop();
  } else {
    for (const table of tableDefinitions) {
      await createTable(table.name, table.schema, db);
    }
    await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_event_attendees_unique_active ON event_attendees(event_id, user_id) WHERE is_attending = 1;');
  }
}
