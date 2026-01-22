const bcrypt = require('bcrypt');
const cliProgress = require('cli-progress');
const colors = require('ansi-colors');

/**
 * Seeds the database with development/test data.
 * @param {object} db - Database instance.
 */
async function seedDevelopment(db) {
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');

    if (userCount.count < 5) {
        if (process.env.NODE_ENV !== 'test') console.log(colors.cyan('Inserting random users for development...'));
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

            let firstAidExpiry = null;
            if (Math.random() > 0.7) {
                const d = new Date();
                d.setDate(d.getDate() + Math.floor(Math.random() * 1095) - 365);
                firstAidExpiry = d.toISOString().split('T')[0];
            }

            const result = await db.run(
                `INSERT INTO users (email, hashed_password, first_name, last_name, college_id, is_member, filled_legal_info, is_instructor, first_aid_expiry) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [email, hashedPassword, firstName, lastName, collegeId, isMember, filledLegal, isInstructor, firstAidExpiry]
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
            if (userProgressBar) userProgressBar.update(i + 1);
        }
        await db.run('COMMIT');
        if (userProgressBar) userProgressBar.stop();
    }

    const swimHistoryCount = await db.get('SELECT COUNT(*) as count FROM swim_history');
    if (swimHistoryCount.count === 0) {
        if (process.env.NODE_ENV !== 'test') console.log(colors.cyan('Seeding swim history for existing users...'));
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
            await db.run(`UPDATE users SET swims = ? WHERE id = ?`, [totalSwims, user.id]);
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
    for (const t of tags) {
        let row = await db.get('SELECT id FROM tags WHERE name = ?', [t.name]);
        if (!row) {
            const res = await db.run('INSERT INTO tags (name, color, priority, join_policy) VALUES (?, ?, ?, ?)', [t.name, t.color, t.priority, t.join_policy || 'open']);
            tagIds[t.name] = res.lastID;
        } else {
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
            console.error(`Error seeding role ${r.name}:`, err);
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

    const topicalNames = ["Pub Night", "Board Games", "Movie Night", "Quiz Night", "Karaoke", "Bar Crawl"];
    let currentDate = new Date(startDate);

    const formatDate = (d) => d.toISOString().slice(0, 19).replace('T', ' ');
    const setTime = (date, h, m) => {
        const d = new Date(date);
        d.setHours(h, m, 0, 0);
        return formatDate(d);
    };
    const createEvent = async (data) => {
        const res = await db.run(
            `INSERT INTO events (title, description, location, start, end, difficulty_level, max_attendees, upfront_cost, upfront_refund_cutoff) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [data.title, data.description, data.location, data.start, data.end, data.difficulty_level || 1, data.max_attendees !== undefined ? data.max_attendees : 20, data.upfront_cost, data.upfront_refund_cutoff || null]
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

    if (process.env.NODE_ENV !== 'test') console.log(colors.cyan('Generating development events...'));
    
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

        if (day === 3) { // Wednesday
            maxAttendees = 0; // Unlimited
            eventId = await createEvent({ title: `Social: ${topicalNames[Math.floor(Math.random() * topicalNames.length)]}`, description: "A fun social event.", location: "The Pub", start: setTime(currentDate, 19, 0), end: setTime(currentDate, 23, 0), upfront_cost: 0, max_attendees: 0, tags: [tagIds['socials']] });
        } else if (day === 4) { // Thursday
            const startT = new Date(currentDate); startT.setHours(14, 0, 0, 0);
            const cutoff = new Date(startT); cutoff.setHours(cutoff.getHours() - 48);
            eventId = await createEvent({ title: "Slalom/White Water", description: "Practice.", location: "Tees Barrage", start: formatDate(startT), end: setTime(currentDate, 16, 0), upfront_cost: 12, upfront_refund_cutoff: formatDate(cutoff), tags: [tagIds['slalom'], tagIds['white water']] });
        } else if (day === 5) { // Friday
            const startT = new Date(currentDate); startT.setHours(19, 0, 0, 0);
            const cutoff = new Date(startT); cutoff.setHours(cutoff.getHours() - 24);
            eventId = await createEvent({ title: "Polo Pool Session", description: "Training.", location: "Freeman's Quay", start: formatDate(startT), end: setTime(currentDate, 20, 0), upfront_cost: 6, upfront_refund_cutoff: formatDate(cutoff), tags: [tagIds['polo']] });
        } else if ([1, 2].includes(day) && Math.random() < 0.7) {
            const type = ['polo', 'white water', 'slalom'][Math.floor(Math.random() * 3)];
            maxAttendees = 5;
            eventId = await createEvent({ title: `${type.toUpperCase()} Ergs`, description: "Training.", location: "Boathouse Gym", start: setTime(currentDate, 7, 0), end: setTime(currentDate, 8, 0), upfront_cost: 0, max_attendees: 5, tags: [tagIds['ergs'], tagIds[type]] });
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
    if (process.env.NODE_ENV !== 'test') console.log(colors.green('Sample events generated successfully.'));
}

module.exports = { seedDevelopment };
