const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function setupTestDb() {
    const db = await open({
        filename: ':memory:',
        driver: sqlite3.Database
    });

    await db.exec('PRAGMA journal_mode = WAL;');
    await db.exec('PRAGMA busy_timeout = 5000;');
    await db.exec('PRAGMA foreign_keys = ON;');

    await db.exec(`
        CREATE TABLE IF NOT EXISTS colleges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        );
    `);

    // Insert dummy colleges
    const colleges = ['castle', 'collingwood', 'grey'];
    const stmt = await db.prepare('INSERT INTO colleges (name) VALUES (?)');
    for (const college of colleges) {
        await stmt.run(college);
    }
    await stmt.finalize();

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
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

            profile_picture_path TEXT,

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (college_id) REFERENCES colleges(id)
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS events (
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
            image_url TEXT,
            
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS event_attendees (
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
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            amount REAL NOT NULL,
            description TEXT,
            event_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            color TEXT DEFAULT '#808080',
            description TEXT,
            min_difficulty INTEGER,
            priority INTEGER DEFAULT 0,
            join_policy TEXT CHECK(join_policy IN ('open', 'whitelist', 'role')) DEFAULT 'open',
            view_policy TEXT CHECK(view_policy IN ('open', 'whitelist', 'role')) DEFAULT 'open'
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS event_tags (
            event_id INTEGER,
            tag_id INTEGER,
            PRIMARY KEY (event_id, tag_id),
            FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS tag_whitelists (
            tag_id INTEGER,
            user_id INTEGER,
            PRIMARY KEY (tag_id, user_id),
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `);

    // RBAC Tables
    await db.exec(`
        CREATE TABLE IF NOT EXISTS roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            description TEXT
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT UNIQUE NOT NULL,
            description TEXT
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS role_permissions (
            role_id INTEGER,
            permission_id INTEGER,
            PRIMARY KEY (role_id, permission_id),
            FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
            FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS user_roles (
            user_id INTEGER,
            role_id INTEGER,
            PRIMARY KEY (user_id, role_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS user_permissions (
            user_id INTEGER,
            permission_id INTEGER,
            PRIMARY KEY (user_id, permission_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS user_managed_tags (
            user_id INTEGER,
            tag_id INTEGER,
            PRIMARY KEY (user_id, tag_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS role_managed_tags (
            role_id INTEGER,
            tag_id INTEGER,
            PRIMARY KEY (role_id, tag_id),
            FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS swim_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            added_by INTEGER NOT NULL,
            count INTEGER NOT NULL DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS event_waiting_list (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS file_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            default_visibility TEXT CHECK(default_visibility IN ('public', 'members', 'execs')) NOT NULL DEFAULT 'members'
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            author TEXT,
            date DATETIME DEFAULT CURRENT_TIMESTAMP,
            size INTEGER,
            filename TEXT,
            category_id INTEGER,
            visibility TEXT CHECK(visibility IN ('public', 'members', 'execs')) NOT NULL DEFAULT 'members',
            FOREIGN KEY (category_id) REFERENCES file_categories(id) ON DELETE SET NULL
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS password_resets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `);

    return db;
}

module.exports = { setupTestDb };
