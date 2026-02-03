/**
 * development.ts
 * 
 * Generates dummy data for development and testing.
 */

import bcrypt from 'bcrypt';
import cliProgress from 'cli-progress';
import colors from 'ansi-colors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Logger from '../../../misc/Logger.js';
import { DatabaseWrapper } from '../../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Main development seeding function.
 */
export async function seedDevelopment(db: DatabaseWrapper, newlyCreatedTables: string[] = []) {
    let adminId = 1;
    try {
        const adminUser = await db.get("SELECT id FROM users WHERE email = ?", ['admin@durham.ac.uk']);
        if (adminUser && adminUser.id) {
            adminId = adminUser.id;
        } else {
            // If not found, try to find ANY user with instructor status as a fallback
            const fallbackUser = await db.get("SELECT id FROM users WHERE is_instructor = 1 LIMIT 1");
            if (fallbackUser) adminId = fallbackUser.id;
        }
    } catch (e) {
        Logger.error("Failed to fetch admin user for development seeding:", e);
    }

    const userCount = await db.get('SELECT COUNT(*) as count FROM users');

    const slidesDir = path.join(__dirname, '..', '..', '..', '..', 'public', 'images', 'slides');
    let slideFiles: string[] = [];
    try {
        if (fs.existsSync(slidesDir)) {
            slideFiles = fs.readdirSync(slidesDir).filter(f => ['.png', '.jpg', '.jpeg'].includes(path.extname(f).toLowerCase()));
        }
    } catch (e) { } // Ignore errors reading slides directory

    const seedFile = async (filename: string) => {
        const title = filename.split('.')[0];
        await db.run(
            'INSERT IGNORE INTO files (title, filename, visibility, hash) VALUES (?, ?, ?, ?)',
            [title, filename, 'public', filename]
        );
        const row = await db.get('SELECT id FROM files WHERE filename = ?', [filename]);
        return row ? row.id : null;
    };

    const seededFileIds: number[] = [];
    for (const file of slideFiles) {
        const id = await seedFile(file);
        if (id) seededFileIds.push(id);
    }

    if (newlyCreatedTables.includes('slides')) {
        await db.run('DELETE FROM slides');
        for (let i = 0; i < seededFileIds.length; i++) {
            await db.run('INSERT INTO slides (file_id, display_order) VALUES (?, ?)', [seededFileIds[i], i]);
        }
    }

    if (userCount.count < 5 || newlyCreatedTables.includes('users')) {
        if (process.env.NODE_ENV !== 'test') Logger.info('Inserting random users for development...');
        const password = 'password';
        const hashedPassword = await bcrypt.hash(password, 10);

        const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Taylor', 'Moore', 'Jackson', 'Martin'];

        let userProgressBar: cliProgress.SingleBar | undefined;
        if (process.env.NODE_ENV !== 'test') {
            userProgressBar = new cliProgress.SingleBar({
                format: colors.cyan('Users |') + colors.cyan('{bar}') + '| {percentage}% || {value}/{total} Users',
                barCompleteChar: '\u2588',
                barIncompleteChar: '\u2591',
                hideCursor: true
            });
            userProgressBar.start(50, 0);
        }

        await db.exec('START TRANSACTION');
        for (let i = 0; i < 50; i++) {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@durham.ac.uk`;
            const collegeId = Math.floor(Math.random() * 17) + 1;
            const isMember = Math.random() > 0.5;
            const filledLegal = Math.random() > 0.2;
            const isInstructor = Math.random() > 0.9;
            const profilePictureId = seededFileIds.length > 0 ? seededFileIds[Math.floor(Math.random() * seededFileIds.length)] : null;

            let firstAidExpiry = null;
            if (Math.random() > 0.7) {
                const d = new Date();
                d.setDate(d.getDate() + Math.floor(Math.random() * 1095) - 365);
                firstAidExpiry = d.toISOString().split('T')[0];
            }

            const result = await db.run(
                `INSERT INTO users (email, hashed_password, first_name, last_name, college_id, is_member, filled_legal_info, is_instructor, first_aid_expiry, profile_picture_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [email, hashedPassword, firstName, lastName, collegeId, isMember, filledLegal, isInstructor, firstAidExpiry, profilePictureId]
            );

            const userId = result.lastID;
            for (let j = 0; j < Math.floor(Math.random() * 4); j++) {
                const amount = (Math.random() * 100 - 50).toFixed(2);
                await db.run(`INSERT INTO transactions (user_id, amount, description) VALUES (?, ?, ?)`, [userId, amount, `Random transaction ${j + 1}`]);
            }

            const numSwims = Math.floor(Math.random() * 15);
            let totalSwims = 0;
            for (let j = 0; j < numSwims; j++) {
                const count = Math.floor(Math.random() * 3) + 1;
                totalSwims += count;
                const swimDate = new Date();
                swimDate.setSeconds(swimDate.getSeconds() - Math.floor(Math.random() * 4 * 365 * 24 * 60 * 60));
                await db.run(
                    `INSERT INTO swim_history (user_id, added_by, count, created_at) VALUES (?, ?, ?, ?)`,
                    [userId, adminId, count, swimDate.toISOString().slice(0, 19).replace('T', ' ')]
                );
            }
            await db.run(`UPDATE users SET swims = ? WHERE id = ?`, [totalSwims, userId]);

            const numBooties = Math.floor(Math.random() * (totalSwims + 1));
            await db.run(`UPDATE users SET booties = ? WHERE id = ?`, [numBooties, userId]);

            if (userProgressBar) userProgressBar.update(i + 1);
        }
        await db.exec('COMMIT');
        if (userProgressBar) userProgressBar.stop();
    }

    const swimHistoryCount = await db.get('SELECT COUNT(*) as count FROM swim_history');
    if (newlyCreatedTables.includes('swim_history') || swimHistoryCount.count === 0) {
        if (process.env.NODE_ENV !== 'test') Logger.info('Seeding swim history for existing users...');
        const users = await db.all('SELECT id FROM users');

        let swimProgressBar: cliProgress.SingleBar | undefined;
        if (process.env.NODE_ENV !== 'test') {
            swimProgressBar = new cliProgress.SingleBar({
                format: colors.cyan('Swims |') + colors.cyan('{bar}') + '| {percentage}% || {value}/{total} Users',
                barCompleteChar: '\u2588',
                barIncompleteChar: '\u2591',
                hideCursor: true
            });
            swimProgressBar.start(users.length, 0);
        }

        await db.exec('START TRANSACTION');
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            const numSwims = Math.floor(Math.random() * 12);
            let totalSwims = 0;
            for (let j = 0; j < numSwims; j++) {
                const count = Math.floor(Math.random() * 2) + 1;
                totalSwims += count;
                const swimDate = new Date();
                swimDate.setSeconds(swimDate.getSeconds() - Math.floor(Math.random() * 4 * 365 * 24 * 60 * 60));
                await db.run(
                    `INSERT INTO swim_history (user_id, added_by, count, created_at) VALUES (?, ?, ?, ?)`,
                    [user.id, adminId, count, swimDate.toISOString().slice(0, 19).replace('T', ' ')]
                );
            }
            const numBooties = Math.floor(Math.random() * (totalSwims + 1));
            await db.run(`UPDATE users SET swims = ?, booties = ? WHERE id = ?`, [totalSwims, numBooties, user.id]);
            if (swimProgressBar) swimProgressBar.update(i + 1);
        }
        await db.exec('COMMIT');
        if (swimProgressBar) swimProgressBar.stop();
    }

    const tags = [
        { name: 'slalom', color: '#e6194b', priority: 3 },
        { name: 'polo', color: '#3cb44b', priority: 3 },
        { name: 'white water', color: '#ffe119', priority: 2 },
        { name: 'chill', color: '#4363d8', priority: 4 },
        { name: 'ergs', color: '#f58231', priority: 5 },
        { name: 'socials', color: '#911eb4', priority: 6 },
        { name: 'slalom-team', color: '#800000', priority: 1, join_policy: 'whitelist' },
        { name: 'polo-team', color: '#000075', priority: 1, join_policy: 'whitelist' }
    ];

    const tagIds: Record<string, number> = {};
    for (let i = 0; i < tags.length; i++) {
        const t = tags[i];
        let imageId = seededFileIds.length > 0 ? seededFileIds[i % seededFileIds.length] : null;

        let row = await db.get('SELECT id FROM tags WHERE name = ?', [t.name]);
        if (!row) {
            const res = await db.run('INSERT INTO tags (name, color, priority, join_policy, image_id) VALUES (?, ?, ?, ?, ?)', [t.name, t.color, t.priority, t.join_policy || 'open', imageId]);
            tagIds[t.name] = res.lastID;
        } else {
            await db.run('UPDATE tags SET image_id = ? WHERE id = ?', [imageId, row.id]);
            tagIds[t.name] = row.id;
        }
    }

    const permRows = await db.all('SELECT id, slug FROM permissions');
    const permIds: Record<string, number> = {};
    for (const row of permRows) {
        permIds[row.slug] = row.id;
    }

    const roles = [
        { name: 'Vice Captain (Durham)', ranking: 2, perms: ['user.manage', 'event.manage.all', 'swims.manage', 'file.write', 'exec.publish'] },
        { name: 'Club Coach', ranking: 3, perms: ['event.manage.all', 'swims.manage', 'exec.publish'] },
        { name: 'Treasurer', ranking: 3, perms: ['transaction.manage', 'exec.publish'] },
        { name: 'Trip Officer', ranking: 3, perms: ['event.manage.all', 'swims.manage', 'file.write', 'exec.publish'] },
        { name: 'Kit and Safety Officer', ranking: 3, perms: ['exec.publish'] },
        { name: 'Media Secretary', ranking: 4, perms: ['file.write', 'file.edit', 'exec.publish'] },
        { name: 'Social Secretary (Durham)', ranking: 4, perms: ['event.manage.scoped', 'exec.publish'], scopedTags: ['socials'] },
        { name: 'Polo Captain', ranking: 3, perms: ['event.manage.scoped', 'swims.manage', 'exec.publish'], scopedTags: ['polo', 'polo-team'] },
        { name: 'Slalom Captain', ranking: 3, perms: ['event.manage.scoped', 'swims.manage', 'exec.publish'], scopedTags: ['slalom', 'slalom-team'] },
        { name: 'Welfare Officer', ranking: 4, perms: ['exec.publish'] }
    ];

    const ExecDB = (await import('../../execDB.js')).default;
    const allUsers = await db.all('SELECT id FROM users');
    let adminUser = await db.get("SELECT id FROM users WHERE email = ?", ['admin@durham.ac.uk']);
    
    // Create a pool of users to ensure we don't double-assign roles if possible
    let availableUsers = [...allUsers].filter(u => u.id !== adminUser?.id).sort(() => 0.5 - Math.random());
    
    // Seed Current Committee
    for (const r of roles) {
        try {
            await db.run('INSERT IGNORE INTO roles (name, exec_ranking) VALUES (?, ?)', [r.name, r.ranking || 4]);
            const roleRow = await db.get('SELECT id FROM roles WHERE name = ?', [r.name]);
            if (!roleRow) continue;

            for (const permSlug of r.perms) {
                if (permIds[permSlug]) {
                    await db.run('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleRow.id, permIds[permSlug]]);
                }
            }

            if (r.scopedTags) {
                for (const tagName of r.scopedTags) {
                    if (tagIds[tagName]) {
                        await db.run('INSERT IGNORE INTO role_managed_tags (role_id, tag_id) VALUES (?, ?)', [roleRow.id, tagIds[tagName]]);
                    }
                }
            }

            // Assign this role to a random user from the pool
            if (availableUsers.length > 0) {
                const targetUser = availableUsers.shift();
                await db.run('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)', [targetUser.id, roleRow.id]);
                
                // If it's an exec role (has exec.publish), sync them
                if (r.perms.includes('exec.publish')) {
                    await ExecDB.syncExecMember(db, targetUser.id);
                }
            }
        } catch (err) {
            Logger.error(`Error seeding role ${r.name}:`, err);
        }
    }

    // Seed Past Committees (Last 2 years)
    if (newlyCreatedTables.includes('exec_committee')) {
        const pastRolePool = [
            { name: 'President', rank: 1 },
            { name: 'Treasurer', rank: 2 },
            { name: 'Secretary', rank: 2 },
            { name: 'Social Secretary', rank: 4 },
            { name: 'Welfare Officer', rank: 4 }
        ];

        const years = [2025, 2024]; // Academic years ending in these
        for (const year of years) {
            for (const role of pastRolePool) {
                if (availableUsers.length > 0) {
                    const user = availableUsers.shift();
                    await db.run(
                        `INSERT INTO exec_committee (user_id, role_name, display_order, is_current, term_start, term_end)
                         VALUES (?, ?, ?, 0, ?, ?)`,
                        [
                            user.id,
                            role.name,
                            role.rank,
                            `${year - 1}-10-01`,
                            `${year}-06-30`
                        ]
                    );
                }
            }
        }
    }

    // Seed Global Cars
    const carCount = await db.get('SELECT COUNT(*) as count FROM cars');
    if (carCount.count === 0 || newlyCreatedTables.includes('cars')) {
        await db.run('INSERT INTO cars (name, seats, boats, is_global) VALUES (?, ?, ?, 1)', ['Club Bus', 17, 0]);
        await db.run('INSERT INTO cars (name, seats, boats, is_global) VALUES (?, ?, ?, 1)', ['Kit Van', 2, 12]);
    }

    // Seed Quotes
    const quoteCount = await db.get('SELECT COUNT(*) as count FROM quotes');
    if (quoteCount.count === 0 || newlyCreatedTables.includes('quotes')) {
        if (process.env.NODE_ENV !== 'test') Logger.info('Seeding 40 random quotes...');
        const quoteTexts = [
            "I didn't actually swim, I just wanted to inspect the riverbed.",
            "Who needs a spraydeck when you have sheer determination?",
            "I'm not lost, I'm just exploring an alternative route to the pub.",
            "Paddle harder! The boat can sense your fear.",
            "Is it really a club trip if nobody loses a shoe?",
            "I think my roll is improving... I can now stay underwater for 10 seconds longer.",
            "That rock wasn't there during the inspection, I swear.",
            "My kayak is like a magnet for low-hanging branches.",
            "I'm not wet, I'm just liquid-cooled.",
            "The river was definitely higher this morning.",
            "I've decided to specialize in 'tactical swims'.",
            "Does anyone know if this water is actually potable?",
            "I'm pretty sure my boat is built for submarine operations.",
            "I don't sink, I just find the bottom really quickly.",
            "My roll is like a fine wine; it doesn't exist yet but I'm working on it.",
            "I didn't hit the rock, the rock hit me.",
            "Polo is just water-based bumper cars with more splashing.",
            "I'm not shouting, I'm just projecting my enthusiasm for safety.",
            "Why use an eddy when you can just use a large rock?",
            "I've mastered the art of the 360-degree involuntary spin."
        ];

        const users = await db.all('SELECT id FROM users');
        for (let i = 0; i < 40; i++) {
            const text = quoteTexts[i % quoteTexts.length] + (i > 20 ? ` (Part ${Math.floor(i/20) + 1})` : '');
            const quotedUser = users[Math.floor(Math.random() * users.length)];
            const submitter = users[Math.floor(Math.random() * users.length)];
            await db.run(
                'INSERT INTO quotes (text, quoted_user_id, submitted_by_id, visibility) VALUES (?, ?, ?, ?)',
                [text, quotedUser.id, submitter.id, Math.random() > 0.3 ? 'public' : 'private']
            );
        }
    }

    adminUser = await db.get("SELECT id FROM users WHERE email = 'admin@durham.ac.uk'");
    if (adminUser) {
        await db.run('UPDATE users SET is_instructor = 1 WHERE id = ?', [adminUser.id]);
        const coachRole = await db.get("SELECT id FROM roles WHERE name = 'Club Coach'");
        if (coachRole) {
            await db.run('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)', [adminUser.id, coachRole.id]);
        }

        await db.run('INSERT IGNORE INTO tag_whitelists (tag_id, user_id) VALUES (?, ?)', [tagIds['slalom-team'], adminUser.id]);
        await db.run('INSERT IGNORE INTO tag_whitelists (tag_id, user_id) VALUES (?, ?)', [tagIds['polo-team'], adminUser.id]);
    }

    if (newlyCreatedTables.includes('events')) {
        await db.run('DELETE FROM events');
        await db.run('DELETE FROM event_tags');

        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(now.getDate() - (6 * 7));
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + (12 * 7));

        const topicalNames = ["Pub Night", "Board Games", "Quiz Night", "Karaoke", "Bar Crawl"];
        let currentDate = new Date(startDate);

        const formatDate = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ');
        const setTime = (date: Date, h: number, m: number) => {
            const d = new Date(date);
            d.setHours(h, m, 0, 0);
            return formatDate(d);
        };
        const createEvent = async (data: any) => {
            const res = await db.run(
                `INSERT INTO events (title, description, location, start, end, difficulty_level, max_attendees, upfront_cost, upfront_refund_cutoff, image_id, is_canceled, enable_waitlist) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    data.title,
                    data.description,
                    data.location,
                    data.start,
                    data.end,
                    data.difficulty_level || 1,
                    data.max_attendees !== undefined ? data.max_attendees : 20,
                    data.upfront_cost,
                    data.upfront_refund_cutoff || null,
                    data.image_id || null,
                    data.is_canceled !== undefined ? (data.is_canceled ? 1 : 0) : 0,
                    data.enable_waitlist !== undefined ? (data.enable_waitlist ? 1 : 0) : 1
                ]
            );
            if (data.tags) {
                for (const tagId of data.tags) {
                    await db.run('INSERT INTO event_tags (event_id, tag_id) VALUES (?, ?)', [res.lastID, tagId]);
                }
            }
            return res.lastID;
        };

        const joinEvent = async (eventId: number, userId: number, upfrontCost: number, title: string) => {
            let transactionId = null;
            if (upfrontCost > 0) {
                const txRes = await db.run(
                    'INSERT INTO transactions (user_id, amount, description, created_at, event_id) VALUES (?, ?, ?, ?, ?)',
                    [userId, -upfrontCost, `Joined Event: ${title}`, new Date().toISOString().slice(0, 19).replace('T', ' '), eventId]
                );
                transactionId = txRes.lastID;
            }
            await db.run(
                'INSERT IGNORE INTO event_attendees (event_id, user_id, is_attending, payment_transaction_id) VALUES (?, ?, 1, ?)',
                [eventId, userId, transactionId]
            );
        };

        const allUsers = await db.all('SELECT id FROM users');
        const instructors = await db.all('SELECT id FROM users WHERE is_instructor = 1');

        if (process.env.NODE_ENV !== 'test') Logger.info('Generating development events...');

        const specialDate = new Date(now);
        specialDate.setDate(now.getDate() + 3);

        const refundTestDate = new Date(now);
        refundTestDate.setDate(now.getDate() + 2);

        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);

        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        let eventProgressBar: cliProgress.SingleBar | undefined;
        if (process.env.NODE_ENV !== 'test') {
            eventProgressBar = new cliProgress.SingleBar({
                format: colors.cyan('Events |') + colors.cyan('{bar}') + '| {percentage}% || {value}/{total} Days',
                barCompleteChar: '\u2588',
                barIncompleteChar: '\u2591',
                hideCursor: true
            });
            eventProgressBar.start(totalDays, 0);
        }

        let dayCount = 0;
        await db.exec('START TRANSACTION');
        while (currentDate <= endDate) {
            const day = currentDate.getDay();
            let eventId = null;
            let maxAttendees = 20;
            let imageId = seededFileIds.length > 0 ? seededFileIds[Math.floor(Math.random() * seededFileIds.length)] : null;

            const isTomorrow = currentDate.getDate() === tomorrow.getDate() &&
                currentDate.getMonth() === tomorrow.getMonth() &&
                currentDate.getFullYear() === tomorrow.getFullYear();

            if (isTomorrow) {
                const ev1 = await createEvent({
                    title: "Pub Social",
                    description: "A social at the pub.",
                    location: "The Swan",
                    start: setTime(currentDate, 19, 0),
                    end: setTime(currentDate, 22, 0),
                    upfront_cost: 0,
                    tags: [tagIds['socials']],
                    image_id: imageId
                });

                const ev2 = await createEvent({
                    title: "Morning Ergs",
                    description: "Morning ergs session.",
                    location: "Boathouse Gym",
                    start: setTime(currentDate, 7, 0),
                    end: setTime(currentDate, 8, 30),
                    upfront_cost: 0,
                    tags: [tagIds['ergs']],
                    image_id: imageId
                });

                const ev3 = await createEvent({
                    title: "Chill Paddle",
                    description: "Chill paddle session.",
                    location: "Boathouse",
                    start: setTime(currentDate, 12, 0),
                    end: setTime(currentDate, 13, 30),
                    upfront_cost: 0,
                    tags: [tagIds['chill']],
                    image_id: imageId
                });

                if (instructors.length > 0) {
                    await joinEvent(ev1, instructors[0].id, 0, "Pub Social");
                    await joinEvent(ev2, instructors[0].id, 0, "Morning Ergs");
                    await joinEvent(ev3, instructors[0].id, 0, "Chill Paddle");
                }

                currentDate.setDate(currentDate.getDate() + 1);
                dayCount++;
                if (eventProgressBar) eventProgressBar.update(dayCount);
                continue;
            }

            const isRefundTestDay = currentDate.getDate() === refundTestDate.getDate() &&
                currentDate.getMonth() === refundTestDate.getMonth() &&
                currentDate.getFullYear() === refundTestDate.getFullYear();

            if (isRefundTestDay) {
                const ev1 = await createEvent({
                    title: "Refund Test (No Deadline)",
                    description: "Event costing £5 with no refund deadline.",
                    location: "River Wear",
                    start: setTime(currentDate, 14, 0),
                    end: setTime(currentDate, 16, 0),
                    upfront_cost: 5,
                    upfront_refund_cutoff: null,
                    image_id: imageId
                });

                const passedDeadline = new Date(now);
                passedDeadline.setHours(now.getHours() - 1);

                const ev2 = await createEvent({
                    title: "Refund Test (Deadline Passed)",
                    description: "Event costing £6 with a deadline that has already passed.",
                    location: "River Wear",
                    start: setTime(currentDate, 16, 0),
                    end: setTime(currentDate, 18, 0),
                    upfront_cost: 6,
                    upfront_refund_cutoff: formatDate(passedDeadline),
                    image_id: imageId
                });

                if (instructors.length > 0) {
                    await joinEvent(ev1, instructors[0].id, 5, "Refund Test (No Deadline)");
                    await joinEvent(ev2, instructors[0].id, 6, "Refund Test (Deadline Passed)");
                }

                currentDate.setDate(currentDate.getDate() + 1);
                dayCount++;
                if (eventProgressBar) eventProgressBar.update(dayCount);
                continue;
            }

            const isSpecialDay = currentDate.getDate() === specialDate.getDate() &&
                currentDate.getMonth() === specialDate.getMonth() &&
                currentDate.getFullYear() === specialDate.getFullYear();

            if (isSpecialDay) {
                const ev1 = await createEvent({
                    title: "Elite Slalom Training",
                    description: "Advanced training for the team.",
                    location: "Tees Barrage",
                    start: setTime(currentDate, 10, 0),
                    end: setTime(currentDate, 13, 0),
                    difficulty_level: 3,
                    max_attendees: 10,
                    upfront_cost: 0,
                    tags: [tagIds['slalom-team']],
                    image_id: imageId
                });

                const ev2 = await createEvent({
                    title: "Canceled Social",
                    description: "This event has been canceled.",
                    location: "The Pub",
                    start: setTime(currentDate, 18, 0),
                    end: setTime(currentDate, 20, 0),
                    difficulty_level: 1,
                    max_attendees: 20,
                    upfront_cost: 0,
                    tags: [tagIds['socials']],
                    image_id: imageId,
                    is_canceled: true
                });

                const waitlistEventId = await createEvent({
                    title: "Popular Workshop (Waitlist)",
                    description: "This event is full, join the waitlist!",
                    location: "Classroom",
                    start: setTime(currentDate, 14, 0),
                    end: setTime(currentDate, 15, 0),
                    difficulty_level: 1,
                    max_attendees: 5,
                    upfront_cost: 5,
                    image_id: imageId
                });
                for (let k = 0; k < 5; k++) await joinEvent(waitlistEventId, allUsers[k].id, 5, "Popular Workshop (Waitlist)");
                for (let k = 5; k < 8; k++) await db.run('INSERT INTO event_waiting_list (event_id, user_id) VALUES (?, ?)', [waitlistEventId, allUsers[k].id]);

                const noWaitlistEventId = await createEvent({
                    title: "Exclusive Session (No Waitlist)",
                    description: "Full and no waitlist available.",
                    location: "Private Room",
                    start: setTime(currentDate, 16, 0),
                    end: setTime(currentDate, 17, 0),
                    difficulty_level: 2,
                    max_attendees: 5,
                    upfront_cost: 10,
                    image_id: imageId,
                    enable_waitlist: false
                });
                for (let k = 0; k < 5; k++) await joinEvent(noWaitlistEventId, allUsers[k + 10].id, 10, "Exclusive Session (No Waitlist)");

                await createEvent({
                    title: "No Coach Attending",
                    description: "An event with nobody attending.",
                    location: "River Wear",
                    start: setTime(currentDate, 8, 0),
                    end: setTime(currentDate, 9, 0),
                    difficulty_level: 1,
                    max_attendees: 10,
                    upfront_cost: 0,
                    image_id: imageId
                });

                if (instructors.length > 0) {
                    await joinEvent(ev1, instructors[0].id, 0, "Elite Slalom Training");
                    await joinEvent(ev2, instructors[0].id, 0, "Canceled Social");
                    await joinEvent(waitlistEventId, instructors[0].id, 5, "Popular Workshop (Waitlist)");
                    await joinEvent(noWaitlistEventId, instructors[0].id, 10, "Exclusive Session (No Waitlist)");
                }

                currentDate.setDate(currentDate.getDate() + 1);
                dayCount++;
                if (eventProgressBar) eventProgressBar.update(dayCount);
                continue;
            }

            const isToday = currentDate.getDate() === now.getDate() &&
                currentDate.getMonth() === now.getMonth() &&
                currentDate.getFullYear() === now.getFullYear();

            if (isToday) {
                if (process.env.NODE_ENV !== 'test') Logger.info('Seeding special "Today\'s Scenario" events...');

                const event1Start = new Date(now);
                event1Start.setHours(now.getHours() - 1);
                const event1End = new Date(now);
                event1End.setMinutes(now.getMinutes() + 30);

                const event2Start = new Date(now);
                event2Start.setHours(now.getHours() + 1);
                const event2End = new Date(now);
                event2End.setHours(now.getHours() + 2);

                const ev1Id = await createEvent({
                    title: "Ongoing Event",
                    description: "This event started an hour ago and ends in 30 minutes. It features transport and shared expenses.",
                    location: "Tees Barrage",
                    start: formatDate(event1Start),
                    end: formatDate(event1End),
                    upfront_cost: 5.00,
                    tags: [tagIds['white water']],
                    image_id: imageId
                });
                await db.run('UPDATE events SET is_offsite = 1 WHERE id = ?', [ev1Id]);

                const ev2Id = await createEvent({
                    title: "Upcoming Event",
                    description: "This event starts in an hour and lasts for an hour. It also has transport requirements.",
                    location: "Wear Weir",
                    start: formatDate(event2Start),
                    end: formatDate(event2End),
                    upfront_cost: 10.00,
                    tags: [tagIds['polo']],
                    image_id: imageId
                });
                await db.run('UPDATE events SET is_offsite = 1 WHERE id = ?', [ev2Id]);

                const admin = await db.get("SELECT id FROM users WHERE email = ?", ['admin@durham.ac.uk']);
                const otherUsers = allUsers.filter(u => u.id !== admin.id).slice(0, 10).map(u => u.id);
                const attendees = [admin.id, ...otherUsers];
                const clubBus = await db.get("SELECT id FROM cars WHERE name = 'Club Bus'");
                const mileagePhotoId = seededFileIds.length > 0 ? seededFileIds[0] : null;

                for (const ev of [{ id: ev1Id, title: "Ongoing Event", cost: 5.00 }, { id: ev2Id, title: "Upcoming Event", cost: 10.00 }]) {
                    for (const userId of attendees) {
                        await joinEvent(ev.id, userId, ev.cost, ev.title);
                    }

                    const tripOut = await db.run('INSERT INTO trips (event_id, name) VALUES (?, ?)', [ev.id, 'Outward Journey']);
                    const tripBack = await db.run('INSERT INTO trips (event_id, name) VALUES (?, ?)', [ev.id, 'Return Journey']);
                    const tripOutId = tripOut.lastID;
                    const tripBackId = tripBack.lastID;

                    const car1 = await db.run('INSERT INTO cars (user_id, name, seats, boats) VALUES (?, ?, ?, ?)', [attendees[1], "Subie", 5, 4]);
                    const car2 = await db.run('INSERT INTO cars (user_id, name, seats, boats) VALUES (?, ?, ?, ?)', [attendees[2], "Land Rover", 5, 2]);
                    const car1Id = car1.lastID;
                    const car2Id = car2.lastID;

                    // Drivers and Mileage
                    // Driver 1: Admin on Club Bus - NO mileage done
                    await db.run(
                        `INSERT INTO event_drivers (trip_id, user_id, car_id, status) VALUES (?, ?, ?, 'accepted')`,
                        [tripOutId, admin.id, clubBus.id]
                    );

                    // Driver 2: Car 1 (Out) - Complete mileage
                    await db.run(
                        `INSERT INTO event_drivers (trip_id, user_id, car_id, status, start_mileage, start_mileage_proof_id, end_mileage, end_mileage_proof_id) VALUES (?, ?, ?, 'accepted', ?, ?, ?, ?)`,
                        [tripOutId, attendees[1], car1Id, 50000, mileagePhotoId, 50020, mileagePhotoId]
                    );

                    // Driver 3: Car 2 (Back) - Complete mileage
                    await db.run(
                        `INSERT INTO event_drivers (trip_id, user_id, car_id, status, start_mileage, start_mileage_proof_id, end_mileage, end_mileage_proof_id) VALUES (?, ?, ?, 'accepted', ?, ?, ?, ?)`,
                        [tripBackId, attendees[2], car2Id, 85000, mileagePhotoId, 85025, mileagePhotoId]
                    );

                    // Trip Exclusions
                    await db.run('INSERT INTO trip_exclusions (trip_id, user_id) VALUES (?, ?)', [tripOutId, attendees[3]]);
                    await db.run('INSERT INTO trip_exclusions (trip_id, user_id) VALUES (?, ?)', [tripBackId, attendees[4]]);

                    // Expenses
                    const foodExpense = await db.run(
                        'INSERT INTO event_expenses (event_id, user_id, amount, description, receipt_file_id) VALUES (?, ?, ?, ?, ?)',
                        [ev.id, admin.id, 45.00, 'Post-paddle Pizza', mileagePhotoId]
                    );
                    const foodExpId = foodExpense.lastID;

                    // Expense Exclusions
                    await db.run('INSERT INTO expense_exclusions (expense_id, user_id) VALUES (?, ?)', [foodExpId, attendees[5]]);
                    await db.run('INSERT INTO expense_exclusions (expense_id, user_id) VALUES (?, ?)', [foodExpId, attendees[6]]);
                }

                currentDate.setDate(currentDate.getDate() + 1);
                dayCount++;
                if (eventProgressBar) eventProgressBar.update(dayCount);
                continue;
            }

            let currentTitle = '';
            let currentCost = 0;

            if (day === 3) {
                currentTitle = `Social: ${topicalNames[Math.floor(Math.random() * topicalNames.length)]}`;
                currentCost = 0;
                maxAttendees = 0;
                eventId = await createEvent({ title: currentTitle, description: "A fun social event.", location: "The Pub", start: setTime(currentDate, 19, 0), end: setTime(currentDate, 23, 0), upfront_cost: currentCost, max_attendees: 0, tags: [tagIds['socials']], image_id: imageId });
            } else if (day === 4) {
                currentTitle = "Slalom/White Water";
                currentCost = 12;
                const startT = new Date(currentDate); startT.setHours(14, 0, 0, 0);
                const cutoff = new Date(startT); cutoff.setHours(cutoff.getHours() - 48);
                eventId = await createEvent({ title: currentTitle, description: "Practice.", location: "Tees Barrage", start: formatDate(startT), end: setTime(currentDate, 16, 0), upfront_cost: currentCost, upfront_refund_cutoff: formatDate(cutoff), tags: [tagIds['slalom'], tagIds['white water']], image_id: imageId });
            } else if (day === 5) {
                currentTitle = "Polo Pool Session";
                currentCost = 6;
                const startT = new Date(currentDate); startT.setHours(19, 0, 0, 0);
                const cutoff = new Date(startT); cutoff.setHours(cutoff.getHours() - 24);
                eventId = await createEvent({ title: currentTitle, description: "Training.", location: "Freeman's Quay", start: formatDate(startT), end: setTime(currentDate, 20, 0), upfront_cost: currentCost, upfront_refund_cutoff: formatDate(cutoff), tags: [tagIds['polo']], image_id: imageId });
            } else if ([1, 2].includes(day) && Math.random() < 0.7) {
                const type = ['polo', 'white water', 'slalom'][Math.floor(Math.random() * 3)];
                currentTitle = `${type.toUpperCase()} Ergs`;
                currentCost = 0;
                maxAttendees = 5;
                eventId = await createEvent({ title: currentTitle, description: "Training.", location: "Boathouse Gym", start: setTime(currentDate, 7, 0), end: setTime(currentDate, 8, 0), upfront_cost: currentCost, max_attendees: 5, tags: [tagIds['ergs'], tagIds[type]], image_id: imageId });
            }

            if (eventId) {
                const isOffsite = [4, 6].includes(day) || Math.random() > 0.8;
                if (isOffsite) await db.run('UPDATE events SET is_offsite = 1 WHERE id = ?', [eventId]);

                let numAttendees = 0;
                const isPopular = Math.random() > 0.8;

                if (maxAttendees === 0) {
                    numAttendees = Math.floor(Math.random() * 15);
                    if (isPopular) numAttendees += 20;
                } else if (maxAttendees === 5) {
                    numAttendees = Math.floor(Math.random() * 4);
                    if (isPopular) numAttendees = 5 + Math.floor(Math.random() * 3);
                } else {
                    numAttendees = Math.floor(Math.random() * 10);
                    if (isPopular) numAttendees = 20 + Math.floor(Math.random() * 5);
                }

                const shuffledUsers = [...allUsers].sort(() => 0.5 - Math.random());

                if (instructors.length > 0 && Math.random() > 0.2) {
                    await joinEvent(eventId, instructors[0].id, currentCost, currentTitle);
                }

                let currentCount = 1;
                const attendeeIds: number[] = [];
                for (const user of shuffledUsers) {
                    if (user.id === (instructors[0] ? instructors[0].id : -1)) continue;

                    if (maxAttendees === 0 || currentCount < maxAttendees) {
                        if (currentCount < numAttendees) {
                            await joinEvent(eventId, user.id, currentCost, currentTitle);
                            attendeeIds.push(user.id);
                            currentCount++;
                        }
                    } else if (currentCount < numAttendees) {
                        await db.run('INSERT INTO event_waiting_list (event_id, user_id) VALUES (?, ?)', [eventId, user.id]);
                        currentCount++;
                    }
                }

                // If offsite, add trips, drivers and expenses
                if (isOffsite && attendeeIds.length > 0) {
                    const tripRes = await db.run('INSERT INTO trips (event_id, name) VALUES (?, ?)', [eventId, 'Trip to Venue']);
                    const tripId = tripRes.lastID;

                    // Add a random driver from attendees
                    const driverId = attendeeIds[Math.floor(Math.random() * attendeeIds.length)];
                    const carRes = await db.run('INSERT IGNORE INTO cars (user_id, name, seats, boats) VALUES (?, ?, ?, ?)', [driverId, 'Personal Car', 4, 2]);
                    const carRow = await db.get('SELECT id FROM cars WHERE user_id = ?', [driverId]);
                    
                    if (carRow) {
                        await db.run(
                            `INSERT INTO event_drivers (trip_id, user_id, car_id, status, start_mileage, end_mileage) VALUES (?, ?, ?, 'accepted', ?, ?)`,
                            [tripId, driverId, carRow.id, 0, Math.floor(Math.random() * 50) + 10]
                        );
                    }

                    // Add a random expense
                    const expensePayerId = attendeeIds[Math.floor(Math.random() * attendeeIds.length)];
                    await db.run(
                        'INSERT INTO event_expenses (event_id, user_id, amount, description) VALUES (?, ?, ?, ?)',
                        [eventId, expensePayerId, (Math.random() * 20 + 5).toFixed(2), 'Misc Group Expense']
                    );
                }
            }

            currentDate.setDate(currentDate.getDate() + 1);
            dayCount++;
            if (eventProgressBar) eventProgressBar.update(dayCount);
        }
        await db.exec('COMMIT');
        if (eventProgressBar) eventProgressBar.stop();
        if (process.env.NODE_ENV !== 'test') Logger.info('Sample events generated successfully.');
    }
}
