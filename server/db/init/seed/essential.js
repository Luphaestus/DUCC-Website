/**
 * essential.js
 * 
 * Seeds the database with mandatory system data.
 * This includes Durham colleges, the full list of system permissions, 
 * the default 'President' role, and the initial administrator account.
 */

const bcrypt = require('bcrypt');
const { generateRandomPassword } = require('../utils');
const colors = require('ansi-colors');

/**
 * Seeds the database with the canonical list of Durham colleges.
 * @param {object} db - SQLite instance.
 */
async function seedColleges(db) {
    const collegesExist = await db.get('SELECT COUNT(*) as count FROM colleges');
    if (collegesExist.count === 0) {
        if (process.env.NODE_ENV !== 'test') console.log(colors.cyan('Inserting Durham colleges...'));
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
    }
}

/**
 * Seeds all essential system metadata and the default administrator.
 * @param {object} db - SQLite instance.
 */
async function seedEssential(db) {
    await seedColleges(db);

    // Canonical list of system permissions
    const permissions = [
        { slug: 'user.read', desc: 'View users' },
        { slug: 'user.write', desc: 'Edit users' },
        { slug: 'user.manage', desc: 'Full user management' },
        { slug: 'event.read.all', desc: 'View all events' },
        { slug: 'event.write.all', desc: 'Edit all events' },
        { slug: 'event.manage.all', desc: 'Full event management' },
        { slug: 'event.read.scoped', desc: 'View scoped events' },
        { slug: 'event.write.scoped', desc: 'Edit scoped events' },
        { slug: 'event.manage.scoped', desc: 'Manage scoped events' },
        { slug: 'transaction.read', desc: 'View transactions' },
        { slug: 'transaction.write', desc: 'Edit transactions' },
        { slug: 'transaction.manage', desc: 'Manage transactions' },
        { slug: 'site.admin', desc: 'Manage global settings' },
        { slug: 'role.read', desc: 'View roles' },
        { slug: 'role.write', desc: 'Edit roles' },
        { slug: 'role.manage', desc: 'Manage roles' },
        { slug: 'swims.read', desc: 'View swims' },
        { slug: 'swims.write', desc: 'Edit swims' },
        { slug: 'swims.manage', desc: 'Manage swims' },
        { slug: 'user.manage.advanced', desc: 'Advanced user management (direct permissions, profile edits)' },
        { slug: 'tag.read', desc: 'View tags' },
        { slug: 'tag.write', desc: 'Edit tags' },
        { slug: 'file.read', desc: 'View and download files' },
        { slug: 'file.write', desc: 'Upload and delete files' },
        { slug: 'file.edit', desc: 'Edit file metadata' },
        { slug: 'file.category.manage', desc: 'Manage file categories' },
        { slug: 'globals.manage', desc: 'Manage global system settings' }
    ];

    const permIds = {};
    for (const p of permissions) {
        await db.run('INSERT OR IGNORE INTO permissions (slug, description) VALUES (?, ?)', [p.slug, p.desc]);
        const row = await db.get('SELECT id FROM permissions WHERE slug = ?', [p.slug]);
        permIds[p.slug] = row.id;
    }

    // Create the all-powerful President role
    const presidentPerms = ['user.manage', 'user.manage.advanced', 'event.manage.all', 'transaction.manage', 'site.admin', 'role.manage', 'swims.manage', 'tag.write', 'file.read', 'file.write', 'file.edit', 'file.category.manage', 'globals.manage'];
    await db.run('INSERT OR IGNORE INTO roles (name, description) VALUES (?, ?)', ['President', 'The Club President with full administrative access.']);
    const presidentRole = await db.get("SELECT id FROM roles WHERE name = 'President'");
    for (const permSlug of presidentPerms) {
        if (permIds[permSlug]) {
            await db.run('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [presidentRole.id, permIds[permSlug]]);
        }
    }

    // Seed default file categories
    const categories = [
        { name: 'Minutes', visibility: 'members' },
        { name: 'Policies', visibility: 'public' },
        { name: 'Training', visibility: 'members' },
        { name: 'Misc', visibility: 'members' }
    ];
    for (const cat of categories) {
        await db.run('INSERT OR IGNORE INTO file_categories (name, default_visibility) VALUES (?, ?)', [cat.name, cat.visibility]);
    }

    // Create the initial Admin account if no President exists
    const presidentExists = await db.get("SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE r.name = 'President' LIMIT 1");
    if (!presidentExists) {
        let adminId = null;

        const adminExists = await db.get("SELECT id FROM users WHERE email = 'admin@durham.ac.uk'");
        if (!adminExists) {
            // Safety: Clear existing sessions to force login if database was wiped
            try {
                const sessionsExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'");
                if (sessionsExists) {
                    await db.run('DELETE FROM sessions');
                }
            } catch (e) { }

            if (process.env.NODE_ENV !== 'test') console.log(colors.yellow('Inserting default admin user...'));
            const email = 'admin@durham.ac.uk'.toLowerCase();
            const password = generateRandomPassword(12);
            const hashedPassword = await bcrypt.hash(password, 10);
            const adminResult = await db.run(
                `INSERT INTO users (email, hashed_password, first_name, last_name, difficulty_level) VALUES (?, ?, ?, ?, ?)`,
                [email, hashedPassword, 'Admin', 'User', 5]
            );
            adminId = adminResult.lastID;
            // Crucial: Output the generated password to the console so the user can log in
            if (process.env.NODE_ENV !== 'test') console.log(colors.green(`Admin created. Email: ${email}, Password: ${password}`));
        } else {
            adminId = adminExists.id;
        }

        if (presidentRole) {
            await db.run("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [adminId, presidentRole.id]);
        }
    }
}

module.exports = { seedEssential, seedColleges };