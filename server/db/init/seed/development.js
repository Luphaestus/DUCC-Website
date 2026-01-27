/**
 * development.js
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Main development seeding function.
 */
export async function seedDevelopment(db) {
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');

    const slidesDir = path.join(__dirname, '..', '..', '..', 'public', 'images', 'slides');
    let slideFiles = [];
    try {
        if (fs.existsSync(slidesDir)) {
            slideFiles = fs.readdirSync(slidesDir).filter(f => ['.png', '.jpg', '.jpeg'].includes(path.extname(f).toLowerCase()));
        }
    } catch (e) { }

    const seedFile = async (filename) => {
        const title = filename.split('.')[0];
        await db.run(
            'INSERT OR IGNORE INTO files (title, filename, visibility, hash) VALUES (?, ?, ?, ?)',
            [title, filename, 'public', filename]
        );
        const row = await db.get('SELECT id FROM files WHERE filename = ?', [filename]);
        return row ? row.id : null;
    };

    const seededFileIds = [];
    for (const file of slideFiles) {
        const id = await seedFile(file);
        if (id) seededFileIds.push(id);
    }

    await db.run('DELETE FROM slides');
    for (let i = 0; i < seededFileIds.length; i++) {
        await db.run('INSERT INTO slides (file_id, display_order) VALUES (?, ?)', [seededFileIds[i], i]);
    }

    if (userCount.count < 5) {
        if (process.env.NODE_ENV !== 'test') Logger.info('Inserting random users for development...');
        const password = 'password';
        const hashedPassword = await bcrypt.hash(password, 10);

        const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Taylor', 'Moore', 'Jackson', 'Martin'];

        let userProgressBar;
        if (process.env.NODE_ENV !== 'test') {
            userProgressBar = new cliProgress.SingleBar({
                format: colors.cyan('Users |') + colors.cyan('{bar}') + '| {percentage}% || {value}/{total} Users',
                barCompleteChar: '\u2588',
                barIncompleteChar: '\u2591',
                hideCursor: true
            });
            userProgressBar.start(50, 0);
        }

        await db.run('BEGIN TRANSACTION');
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
                    [userId, 1, count, swimDate.toISOString()]
                );
            }
            await db.run(`UPDATE users SET swims = ? WHERE id = ?`, [totalSwims, userId]);

            const numBooties = Math.floor(Math.random() * (totalSwims + 1));
            await db.run(`UPDATE users SET booties = ? WHERE id = ?`, [numBooties, userId]);

            if (userProgressBar) userProgressBar.update(i + 1);
        }
        await db.run('COMMIT');
        if (userProgressBar) userProgressBar.stop();
    }

    const swimHistoryCount = await db.get('SELECT COUNT(*) as count FROM swim_history');
    if (swimHistoryCount.count === 0) {
        if (process.env.NODE_ENV !== 'test') Logger.info('Seeding swim history for existing users...');
        const users = await db.all('SELECT id FROM users');

        let swimProgressBar;
        if (process.env.NODE_ENV !== 'test') {
            swimProgressBar = new cliProgress.SingleBar({
                format: colors.cyan('Swims |') + colors.cyan('{bar}') + '| {percentage}% || {value}/{total} Users',
                barCompleteChar: '\u2588',
                barIncompleteChar: '\u2591',
                hideCursor: true
            });
            swimProgressBar.start(users.length, 0);
        }

        await db.run('BEGIN TRANSACTION');
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
                    [user.id, 1, count, swimDate.toISOString()]
                );
            }
            const numBooties = Math.floor(Math.random() * (totalSwims + 1));
            await db.run(`UPDATE users SET swims = ?, booties = ? WHERE id = ?`, [totalSwims, numBooties, user.id]);
            if (swimProgressBar) swimProgressBar.update(i + 1);
        }
        await db.run('COMMIT');
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

    const tagIds = {};
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
    const permIds = {};
    for (const row of permRows) {
        permIds[row.slug] = row.id;
    }

    const roles = [
        { name: 'Vice Captain (Durham)', perms: ['user.manage', 'event.manage.all', 'swims.manage', 'file.write'] },
        { name: 'Club Coach', perms: ['event.manage.all', 'swims.manage'] },
        { name: 'Treasurer', perms: ['transaction.manage'] },
        { name: 'Trip Officer', perms: ['event.manage.all', 'swims.manage', 'file.write'] },
        { name: 'Kit and Safety Officer', perms: [] },
        { name: 'Media Secretary', perms: ['file.write', 'file.edit'] },
        { name: 'Social Secretary (Durham)', perms: ['event.manage.scoped'], scopedTags: ['socials'] },
        { name: 'Polo Captain', perms: ['event.manage.scoped', 'swims.manage'], scopedTags: ['polo', 'polo-team'] },
        { name: 'Slalom Captain', perms: ['event.manage.scoped', 'swims.manage'], scopedTags: ['slalom', 'slalom-team'] },
        { name: 'Welfare Officer', perms: [] }
    ];

    for (const r of roles) {
        try {
            await db.run('INSERT OR IGNORE INTO roles (name) VALUES (?)', [r.name]);
            const roleRow = await db.get('SELECT id FROM roles WHERE name = ?', [r.name]);
            if (!roleRow) continue;

            for (const permSlug of r.perms) {
                if (permIds[permSlug]) {
                    await db.run('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleRow.id, permIds[permSlug]]);
                }
            }

            if (r.scopedTags) {
                for (const tagName of r.scopedTags) {
                    if (tagIds[tagName]) {
                        await db.run('INSERT OR IGNORE INTO role_managed_tags (role_id, tag_id) VALUES (?, ?)', [roleRow.id, tagIds[tagName]]);
                    }
                }
            }
        } catch (err) {
            Logger.error(`Error seeding role ${r.name}:`, err);
        }
    }

    const adminUser = await db.get("SELECT id FROM users WHERE email = 'admin@durham.ac.uk'");
    if (adminUser) {
        await db.run('INSERT OR IGNORE INTO tag_whitelists (tag_id, user_id) VALUES (?, ?)', [tagIds['slalom-team'], adminUser.id]);
        await db.run('INSERT OR IGNORE INTO tag_whitelists (tag_id, user_id) VALUES (?, ?)', [tagIds['polo-team'], adminUser.id]);
    }

    await db.run('DELETE FROM events');
    await db.run('DELETE FROM event_tags');

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - (6 * 7));
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + (12 * 7));

    const topicalNames = ["Pub Night", "Board Games", "Quiz Night", "Karaoke", "Bar Crawl"];
    let currentDate = new Date(startDate);

    const formatDate = (d) => d.toISOString().slice(0, 19).replace('T', ' ');
    const setTime = (date, h, m) => {
        const d = new Date(date);
        d.setHours(h, m, 0, 0);
        return formatDate(d);
    };
    const createEvent = async (data) => {
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

    const allUsers = await db.all('SELECT id FROM users');
    const instructors = await db.all('SELECT id FROM users WHERE is_instructor = 1');

    if (process.env.NODE_ENV !== 'test') console.info('Generating development events...');

    const specialDate = new Date(now);
    specialDate.setDate(now.getDate() + 3);

    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    let eventProgressBar;
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
    await db.run('BEGIN TRANSACTION');
    while (currentDate <= endDate) {
        const day = currentDate.getDay();
        let eventId = null;
        let maxAttendees = 20;
        let imageId = seededFileIds.length > 0 ? seededFileIds[Math.floor(Math.random() * seededFileIds.length)] : null;

        const isSpecialDay = currentDate.getDate() === specialDate.getDate() &&
            currentDate.getMonth() === specialDate.getMonth() &&
            currentDate.getFullYear() === specialDate.getFullYear();

        if (isSpecialDay) {
            await createEvent({
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

            await createEvent({
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
            for (let k = 0; k < 5; k++) await db.run('INSERT INTO event_attendees (event_id, user_id, is_attending) VALUES (?, ?, ?)', [waitlistEventId, allUsers[k].id, 1]);
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
            for (let k = 0; k < 5; k++) await db.run('INSERT INTO event_attendees (event_id, user_id, is_attending) VALUES (?, ?, ?)', [noWaitlistEventId, allUsers[k + 10].id, 1]);

            currentDate.setDate(currentDate.getDate() + 1);
            dayCount++;
            if (eventProgressBar) eventProgressBar.update(dayCount);
            continue;
        }

        if (day === 3) {
            maxAttendees = 0;
            eventId = await createEvent({ title: `Social: ${topicalNames[Math.floor(Math.random() * topicalNames.length)]}`, description: "A fun social event.", location: "The Pub", start: setTime(currentDate, 19, 0), end: setTime(currentDate, 23, 0), upfront_cost: 0, max_attendees: 0, tags: [tagIds['socials']], image_id: imageId });
        } else if (day === 4) {
            const startT = new Date(currentDate); startT.setHours(14, 0, 0, 0);
            const cutoff = new Date(startT); cutoff.setHours(cutoff.getHours() - 48);
            eventId = await createEvent({ title: "Slalom/White Water", description: "Practice.", location: "Tees Barrage", start: formatDate(startT), end: setTime(currentDate, 16, 0), upfront_cost: 12, upfront_refund_cutoff: formatDate(cutoff), tags: [tagIds['slalom'], tagIds['white water']], image_id: imageId });
        } else if (day === 5) {
            const startT = new Date(currentDate); startT.setHours(19, 0, 0, 0);
            const cutoff = new Date(startT); cutoff.setHours(cutoff.getHours() - 24);
            eventId = await createEvent({ title: "Polo Pool Session", description: "Training.", location: "Freeman's Quay", start: formatDate(startT), end: setTime(currentDate, 20, 0), upfront_cost: 6, upfront_refund_cutoff: formatDate(cutoff), tags: [tagIds['polo']], image_id: imageId });
        } else if ([1, 2].includes(day) && Math.random() < 0.7) {
            const type = ['polo', 'white water', 'slalom'][Math.floor(Math.random() * 3)];
            maxAttendees = 5;
            eventId = await createEvent({ title: `${type.toUpperCase()} Ergs`, description: "Training.", location: "Boathouse Gym", start: setTime(currentDate, 7, 0), end: setTime(currentDate, 8, 0), upfront_cost: 0, max_attendees: 5, tags: [tagIds['ergs'], tagIds[type]], image_id: imageId });
        }

        if (eventId) {
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

            const shuffledUsers = allUsers.sort(() => 0.5 - Math.random());

            if (instructors.length > 0 && Math.random() > 0.2) {
                await db.run('INSERT INTO event_attendees (event_id, user_id, is_attending) VALUES (?, ?, ?)', [eventId, instructors[0].id, 1]);
            }

            let currentCount = 1;
            for (const user of shuffledUsers) {
                if (user.id === (instructors[0] ? instructors[0].id : -1)) continue;

                if (maxAttendees === 0 || currentCount < maxAttendees) {
                    if (currentCount < numAttendees) {
                        await db.run('INSERT INTO event_attendees (event_id, user_id, is_attending) VALUES (?, ?, ?)', [eventId, user.id, 1]);
                        currentCount++;
                    }
                } else if (currentCount < numAttendees) {
                    await db.run('INSERT INTO event_waiting_list (event_id, user_id) VALUES (?, ?)', [eventId, user.id]);
                    currentCount++;
                }
            }
        }

        currentDate.setDate(currentDate.getDate() + 1);
        dayCount++;
        if (eventProgressBar) eventProgressBar.update(dayCount);
    }
    await db.run('COMMIT');
    if (eventProgressBar) eventProgressBar.stop();
    if (process.env.NODE_ENV !== 'test') console.info('Sample events generated successfully.');
}
