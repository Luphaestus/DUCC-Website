/**
 * essential.ts
 * 
 * Seeds the database with mandatory system data.
 */

import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { generateRandomPassword } from '../utils.js';
import Logger from '../../../misc/Logger.js';
import config from '../../../config.js';
import Globals from '../../../misc/globals.js';
import { DatabaseWrapper } from '../../db.js';

/**
 * Seeds the database with the canonical list of Durham colleges.
 */
export async function seedColleges(db: DatabaseWrapper, newlyCreatedTables: string[] = []) {
    const collegesExist = await db.get('SELECT COUNT(*) as count FROM colleges');
    if (collegesExist.count === 0 || newlyCreatedTables.includes('colleges')) {
        if (process.env.NODE_ENV !== 'test') Logger.info('Inserting Durham colleges...');
        const colleges = [
            'castle', 'collingwood', 'grey', 'hatfield', 'johnsnow', 'jb',
            'south', 'aidans', 'stchads', 'stcuthberts', 'hildbede',
            'stjohns', 'stmarys', 'stephenson', 'trevelyan', 'ustinov', 'van-mildert'
        ];
        
        const placeholders = colleges.map(() => '(?)').join(', ');
        await db.run(`INSERT IGNORE INTO colleges (name) VALUES ${placeholders}`, colleges);
    }
}

/**
 * Seeds all essential system metadata and the default administrator.
 */
export async function seedEssential(db: DatabaseWrapper, newlyCreatedTables: string[] = []) {
    await seedColleges(db, newlyCreatedTables);

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
        { slug: 'globals.manage', desc: 'Manage global system settings' },
        { slug: 'quote.manage', desc: 'Moderate quotes' },
        { slug: 'quote.see_author', desc: 'See who submitted a quote' },
        { slug: 'car.manage_global', desc: 'Manage website-wide global cars' },
        { slug: 'kit.manage', desc: 'Manage club kit inventory' },
        { slug: 'exec.publish', desc: 'Automatically publish users with this role to the executive committee page' },
        { slug: 'exec.manage', desc: 'Manage the executive committee page members' },
        { slug: 'email.send', desc: 'Send club-wide announcement emails' }
    ];

    const permIds: Record<string, number> = {};
    for (const p of permissions) {
        await db.run('INSERT IGNORE INTO permissions (slug, description) VALUES (?, ?)', [p.slug, p.desc]);
        const row = await db.get('SELECT id FROM permissions WHERE slug = ?', [p.slug]);
        if (row) permIds[p.slug] = row.id;
    }

    const presidentPerms = ['user.manage', 'user.manage.advanced', 'event.manage.all', 'transaction.manage', 'site.admin', 'role.manage', 'swims.manage', 'tag.write', 'file.read', 'file.write', 'file.edit', 'file.category.manage', 'globals.manage', 'quote.manage', 'quote.see_author', 'car.manage_global', 'kit.manage', 'exec.publish', 'exec.manage', 'email.send'];
    await db.run('INSERT IGNORE INTO roles (name, description, exec_ranking) VALUES (?, ?, ?)', ['President', 'The Club President with full administrative access.', 1]);
    const presidentRole = await db.get("SELECT id FROM roles WHERE name = 'President'");
    for (const permSlug of presidentPerms) {
        if (permIds[permSlug]) {
            await db.run('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [presidentRole.id, permIds[permSlug]]);
        }
    }

    const categories = [
        { name: 'Minutes', visibility: 'members' },
        { name: 'Policies', visibility: 'public' },
        { name: 'Training', visibility: 'members' },
        { name: 'Systems', visibility: 'execs' },
        { name: 'Misc', visibility: 'members' }
    ];
    for (const cat of categories) {
        await db.run('INSERT IGNORE INTO file_categories (name, default_visibility) VALUES (?, ?)', [cat.name, cat.visibility]);
    }

    const systemsCategory = await db.get("SELECT id FROM file_categories WHERE name = 'Systems'");

    const presidentExists = await db.get("SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE r.name = ? LIMIT 1", ['President']);
    if (!presidentExists) {
        let adminId = null;

        const adminUser = await db.get("SELECT id FROM users WHERE email = ?", ['admin@durham.ac.uk']);
        if (!adminUser) {
            try {
                const sessionsExists = await db.get("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?", ['sessions']);
                if (sessionsExists) {
                    await db.run('DELETE FROM sessions');
                }
            } catch (e) { }

            if (process.env.NODE_ENV !== 'test') Logger.info('Inserting default admin user...');
            const email = 'admin@durham.ac.uk'.toLowerCase();
            const password = generateRandomPassword(12);
            const hashedPassword = await bcrypt.hash(password, config.auth.bcryptSaltRounds);
            const adminResult = await db.run(
                `INSERT INTO users (email, hashed_password, first_name, last_name, difficulty_level, is_member, filled_legal_info, legal_filled_at, is_verified) VALUES (?, ?, ?, ?, ?, 1, 1, ?, 1)`,
                [email, hashedPassword, 'Admin', 'User', 5, new Date().toISOString().slice(0, 19).replace('T', ' ')]
            );
            adminId = adminResult.lastID;
            if (process.env.NODE_ENV !== 'test') console.info(`========== Admin created. ==========\nEmail: ${email}\nPassword: ${password}\n====================================`);
        } else {
            adminId = adminUser.id;
            // Ensure existing admin is also a member and has legal info and is verified
            await db.run('UPDATE users SET is_member = 1, filled_legal_info = 1, is_verified = 1, legal_filled_at = ? WHERE id = ?', [new Date().toISOString().slice(0, 19).replace('T', ' '), adminId]);
        }
        if (presidentRole) {
            await db.run("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [adminId, presidentRole.id]);
            
            // Sync exec status so they appear on the page
            const ExecDB = (await import('../../execDB.js')).default;
            await ExecDB.syncExecMember(db, adminId!);
        }
    }

    // Seed Site Images
    const siteImages = [
        { key: 'ClubLogo', filename: 'ducc.png', title: 'Club Logo' },
        { key: 'MaidenCastleImage', filename: 'maiden-castle-outside.jpg', title: 'Maiden Castle' },
        { key: 'BoathouseImage', filename: 'boathouse-outside.jpg', title: 'Club Boathouse' }
    ];

    const globals = new Globals();
    const uploadDir = config.paths.files;
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    for (const img of siteImages) {
        const sourcePath = path.join(path.dirname(new URL(import.meta.url).pathname), 'assets', img.filename);
        if (!fs.existsSync(sourcePath)) {
            Logger.warn(`Seed asset not found at ${sourcePath}`);
            continue;
        }

        const fileBuffer = fs.readFileSync(sourcePath);
        const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        // Check if already in DB
        let fileId: number | null = null;
        const existing = await db.get('SELECT id FROM files WHERE hash = ? LIMIT 1', [hash]);
        
        if (existing) {
            fileId = existing.id;
        } else {
            const finalFilename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(img.filename)}`;
            fs.copyFileSync(sourcePath, path.join(uploadDir, finalFilename));
            
            const stats = fs.statSync(path.join(uploadDir, finalFilename));
            const result = await db.run(
                'INSERT INTO files (title, author, date, size, filename, hash, visibility, category_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [img.title, 'System', new Date().toISOString().slice(0, 19).replace('T', ' '), stats.size, finalFilename, hash, 'execs', systemsCategory?.id || null]
            );
            fileId = result.lastID;
        }

        if (fileId) {
            try {
                globals.set(img.key, `/api/files/${fileId}/download?view=true`);
            } catch (e) {
                // If regex fails (e.g. key doesn't exist yet), we might need to handle it
            }
        }
    }
}
