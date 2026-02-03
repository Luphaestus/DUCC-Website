/**
 * tables.ts
 * 
 * Defines the entire MySQL schema for the application.
 */

import { createTable } from './utils.js';
import cliProgress from 'cli-progress';
import colors from 'ansi-colors';
import Logger from '../../misc/Logger.js';
import { DatabaseWrapper } from '../db.js';

/**
 * Executes the table creation sequence with a progress bar.
 */
export async function createTables(db: DatabaseWrapper): Promise<string[]> {
  const newlyCreatedTables: string[] = [];
  const tableDefinitions = [
    {
      name: 'colleges',
      schema: `
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL
      `
    },
    {
      name: 'file_categories',
      schema: `
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        default_visibility ENUM('public', 'members', 'execs', 'events') NOT NULL DEFAULT 'members'
      `
    },
    {
      name: 'files',
      schema: `
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255),
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        size INT,
        filename VARCHAR(255),
        hash VARCHAR(255),
        category_id INT,
        visibility ENUM('public', 'members', 'execs', 'events') NOT NULL DEFAULT 'members',
        content LONGTEXT,
        FULLTEXT KEY ft_index (title, filename, content),
        INDEX idx_visibility (visibility),
        INDEX idx_hash (hash),
        FOREIGN KEY (category_id) REFERENCES file_categories(id) ON DELETE SET NULL
      `
    },
    {
      name: 'users',
      schema: `
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        hashed_password VARCHAR(255),
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        date_of_birth DATE,
        college_id INT,
        emergency_contact_name VARCHAR(255),
        emergency_contact_phone VARCHAR(255),
        home_address TEXT,
        phone_number VARCHAR(255),
        has_medical_conditions TINYINT(1) DEFAULT 0,
        medical_conditions_details TEXT,
        takes_medication TINYINT(1) DEFAULT 0,
        medication_details TEXT,
        free_sessions INT NOT NULL DEFAULT 3,
        is_member TINYINT(1) NOT NULL DEFAULT 0,
        agrees_to_fitness_statement TINYINT(1) DEFAULT 0,
        agrees_to_club_rules TINYINT(1) DEFAULT 0,
        agrees_to_pay_debts TINYINT(1) DEFAULT 0,
        agrees_to_data_storage TINYINT(1) DEFAULT 0,
        agrees_to_keep_health_data TINYINT(1) DEFAULT 0,
        filled_legal_info TINYINT(1) NOT NULL DEFAULT 0,
        legal_filled_at DATETIME,
        difficulty_level INT NOT NULL DEFAULT 1,
        is_instructor TINYINT(1) NOT NULL DEFAULT 0,
        first_aid_expiry DATE,
        swims INT NOT NULL DEFAULT 0,
        booties INT NOT NULL DEFAULT 0,
        profile_picture_id INT,
        profile_picture_color VARCHAR(50) DEFAULT NULL,
        profile_picture_font VARCHAR(50) DEFAULT NULL,
        profile_picture_initials VARCHAR(50) DEFAULT NULL,
        totp_secret VARCHAR(255),
        totp_enabled TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_instructor (is_instructor),
        INDEX idx_member (is_member),
        INDEX idx_names (last_name, first_name),
        FULLTEXT KEY ft_user_search (first_name, last_name, email),
        FOREIGN KEY (college_id) REFERENCES colleges(id),
        FOREIGN KEY (profile_picture_id) REFERENCES files(id) ON DELETE SET NULL
      `
    },
    {
      name: 'authenticators',
      schema: `
        id VARCHAR(255) PRIMARY KEY,
        user_id INT NOT NULL,
        public_key BLOB NOT NULL,
        counter BIGINT NOT NULL,
        transports VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `
    },
    {
      name: 'exec_committee',
      schema: `
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        role_name VARCHAR(255) NOT NULL,
        first_name_override VARCHAR(255),
        last_name_override VARCHAR(255),
        email_override VARCHAR(255),
        profile_picture_override_id INT,
        profile_picture_color_override VARCHAR(7),
        profile_picture_font_override VARCHAR(50),
        profile_picture_initials_override VARCHAR(10),
        display_order INT DEFAULT 0,
        is_current TINYINT(1) NOT NULL DEFAULT 1,
        is_hidden TINYINT(1) NOT NULL DEFAULT 0,
        term_start DATE,
        term_end DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (profile_picture_override_id) REFERENCES files(id) ON DELETE SET NULL
      `
    },
    {
      name: 'events',
      schema: `
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        location VARCHAR(255),
        start DATETIME NOT NULL,
        end DATETIME NOT NULL,
        difficulty_level INT NOT NULL,
        max_attendees INT,
        upfront_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        upfront_refund_cutoff DATETIME,
        is_canceled TINYINT(1) NOT NULL DEFAULT 0,
        enable_waitlist TINYINT(1) NOT NULL DEFAULT 1,
        signup_required TINYINT(1) NOT NULL DEFAULT 1,
        is_offsite TINYINT(1) NOT NULL DEFAULT 0,
        costs_released TINYINT(1) NOT NULL DEFAULT 0,
        costs_released_at DATETIME,
        image_id INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_start_end (start, end),
        INDEX idx_canceled (is_canceled),
        FULLTEXT KEY ft_event_search (title, description, location),
        FOREIGN KEY (image_id) REFERENCES files(id) ON DELETE SET NULL
      `
    },
    {
      name: 'event_attendees',
      schema: `
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id INT NOT NULL,
        user_id INT NOT NULL,
        is_attending TINYINT(1) NOT NULL DEFAULT 1,
        joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        left_at DATETIME,
        payment_transaction_id INT,
        upfront_refunded TINYINT(1) NOT NULL DEFAULT 0,
        UNIQUE KEY idx_unique_active_attendance (event_id, user_id, (CASE WHEN is_attending = 1 THEN 1 ELSE NULL END)),
        INDEX idx_event_user (event_id, user_id),
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `
    },
    {
      name: 'transactions',
      schema: `
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        description TEXT,
        event_id INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_created (user_id, created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
      `
    },
    {
      name: 'tags',
      schema: `
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        color VARCHAR(50) DEFAULT '#808080',
        description TEXT,
        min_difficulty INT,
        priority INT DEFAULT 0,
        join_policy ENUM('open', 'whitelist', 'role') DEFAULT 'open',
        view_policy ENUM('open', 'whitelist', 'role') DEFAULT 'open',
        image_id INT,
        INDEX idx_priority (priority),
        FOREIGN KEY (image_id) REFERENCES files(id) ON DELETE SET NULL
      `
    },
    {
      name: 'event_tags',
      schema: `
        event_id INT NOT NULL,
        tag_id INT NOT NULL,
        PRIMARY KEY (event_id, tag_id),
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      `
    },
    {
      name: 'tag_whitelists',
      schema: `
        tag_id INT NOT NULL,
        user_id INT NOT NULL,
        PRIMARY KEY (tag_id, user_id),
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `
    },
    {
      name: 'roles',
      schema: `
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        exec_ranking INT DEFAULT 4
      `
    },
    {
      name: 'permissions',
      schema: `
        id INT AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT
      `
    },
    {
      name: 'role_permissions',
      schema: `
        role_id INT NOT NULL,
        permission_id INT NOT NULL,
        PRIMARY KEY (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      `
    },
    {
      name: 'user_roles',
      schema: `
        user_id INT NOT NULL PRIMARY KEY,
        role_id INT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
      `
    },
    {
      name: 'role_managed_tags',
      schema: `
        role_id INT NOT NULL,
        tag_id INT NOT NULL,
        PRIMARY KEY (role_id, tag_id),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      `
    },
    {
      name: 'user_permissions',
      schema: `
        user_id INT NOT NULL,
        permission_id INT NOT NULL,
        PRIMARY KEY (user_id, permission_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      `
    },
    {
      name: 'user_managed_tags',
      schema: `
        user_id INT NOT NULL,
        tag_id INT NOT NULL,
        PRIMARY KEY (user_id, tag_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      `
    },
    {
      name: 'swim_history',
      schema: `
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        added_by INT,
        count INT NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL
      `
    },
    {
      name: 'event_waiting_list',
      schema: `
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id INT NOT NULL,
        user_id INT NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `
    },
    {
      name: 'password_resets',
      schema: `
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_token (token),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `
    },
    {
      name: 'slides',
      schema: `
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_id INT NOT NULL,
        display_order INT DEFAULT 0,
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
      `
    },
    {
      name: 'quotes',
      schema: `
        id INT AUTO_INCREMENT PRIMARY KEY,
        text TEXT NOT NULL,
        quoted_user_id INT,
        submitted_by_id INT,
        visibility ENUM('public', 'private', 'hidden') NOT NULL DEFAULT 'private',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_visibility (visibility),
        FULLTEXT KEY ft_quote_search (text),
        FOREIGN KEY (quoted_user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (submitted_by_id) REFERENCES users(id) ON DELETE SET NULL
      `
    },
    {
      name: 'cars',
      schema: `
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        name VARCHAR(255) NOT NULL,
        seats INT NOT NULL,
        boats INT NOT NULL DEFAULT 0,
        is_global TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `
    },
    {
      name: 'trips',
      schema: `
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      `
    },
    {
      name: 'event_drivers',
      schema: `
        id INT AUTO_INCREMENT PRIMARY KEY,
        trip_id INT NOT NULL,
        user_id INT NOT NULL,
        car_id INT NOT NULL,
        status ENUM('pending', 'accepted', 'declined') NOT NULL DEFAULT 'pending',
        start_mileage DECIMAL(10, 2),
        start_mileage_proof_id INT,
        end_mileage DECIMAL(10, 2),
        end_mileage_proof_id INT,
        start_mileage_submitted_at DATETIME,
        end_mileage_submitted_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE,
        FOREIGN KEY (start_mileage_proof_id) REFERENCES files(id) ON DELETE SET NULL,
        FOREIGN KEY (end_mileage_proof_id) REFERENCES files(id) ON DELETE SET NULL
      `
    },
    {
      name: 'event_expenses',
      schema: `
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id INT NOT NULL,
        user_id INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        description TEXT NOT NULL,
        receipt_file_id INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receipt_file_id) REFERENCES files(id) ON DELETE SET NULL
      `
    },
    {
      name: 'trip_exclusions',
      schema: `
        trip_id INT NOT NULL,
        user_id INT NOT NULL,
        PRIMARY KEY (trip_id, user_id),
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `
    },
    {
      name: 'expense_exclusions',
      schema: `
        expense_id INT NOT NULL,
        user_id INT NOT NULL,
        PRIMARY KEY (expense_id, user_id),
        FOREIGN KEY (expense_id) REFERENCES event_expenses(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `
    }
  ];

  if (process.env.NODE_ENV !== 'test') {
    Logger.info('Creating database tables...');
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
      const existed = await createTable(table.name, table.schema, db);
      if (!existed) newlyCreatedTables.push(table.name);
      progressBar.update(i + 1, { table: table.name });
    }

    progressBar.stop();
  } else {
    for (const table of tableDefinitions) {
      const existed = await createTable(table.name, table.schema, db);
      if (!existed) newlyCreatedTables.push(table.name);
    }
  }

  return newlyCreatedTables;
}
