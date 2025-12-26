const bcrypt = require('bcrypt');
const { generateRandomPassword } = require('./utils');

/**
 * Seeds the database with initial data.
 * @param {object} db - Database instance.
 * @param {string} env - Environment mode.
 */
async function seedData(db, env) {
    // Insert colleges if missing
    const collegesExist = await db.get('SELECT COUNT(*) as count FROM colleges');
    if (collegesExist.count === 0) {
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
    }

    // Create default admin user if missing
    const adminExists = await db.get("SELECT * FROM users WHERE email = 'admin@durham.ac.uk'");
    if (!adminExists) {
        try {
            const sessionsExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'");
            if (sessionsExists) {
                await db.run('DELETE FROM sessions');
            }
        } catch (e) {}

        console.log('Inserting admin user...');
        const email = 'admin@durham.ac.uk';
        const password = generateRandomPassword(12);
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.run(
            `INSERT INTO users (email, hashed_password, first_name, last_name, difficulty_level, can_manage_users, can_manage_events, can_manage_transactions, is_exec) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [email, hashedPassword, 'Admin', 'User', 5, 1, 1, 1, 1]
        );
        console.log(`Admin created. Email: ${email}, Password: ${password}`);
    }

    if (env === 'dev' || env === 'development') {
        const userCount = await db.get('SELECT COUNT(*) as count FROM users');

        // Development seeding: random users, transactions, and swims
        if (userCount.count < 5) {
            console.log('Inserting random users for development...');
            const password = 'password';
            const hashedPassword = await bcrypt.hash(password, 10);

            const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
            const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Taylor', 'Moore', 'Jackson', 'Martin'];

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
            }
        }

        // Retroactive swim seeding for existing users
        const swimHistoryCount = await db.get('SELECT COUNT(*) as count FROM swim_history');
        if (swimHistoryCount.count === 0) {
            console.log('Seeding swim history for existing users...');
            const users = await db.all('SELECT id FROM users');
            for (const user of users) {
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
            }
        }

        // Insert default tags
        const tags = [
            { name: 'slalom', color: '#e6194b', priority: 3 },
            { name: 'polo', color: '#3cb44b', priority: 3 },
            { name: 'white water', color: '#ffe119', priority: 2 },
            { name: 'chill', color: '#4363d8', priority: 4 },
            { name: 'ergs', color: '#f58231', priority: 5 },
            { name: 'socials', color: '#911eb4', priority: 6 },
            { name: 'slalom-team', color: '#800000', priority: 1 },
            { name: 'polo-team', color: '#000075', priority: 1 }
        ];

        const tagIds = {};
        for (const t of tags) {
            let row = await db.get('SELECT id FROM tags WHERE name = ?', [t.name]);
            if (!row) {
                const res = await db.run('INSERT INTO tags (name, color, priority) VALUES (?, ?, ?)', [t.name, t.color, t.priority]);
                tagIds[t.name] = res.lastID;
            } else {
                tagIds[t.name] = row.id;
            }
        }

        // Whitelist admin for restricted tags
        const adminUser = await db.get("SELECT id FROM users WHERE email = 'admin@durham.ac.uk'");
        if (adminUser) {
            await db.run('INSERT OR IGNORE INTO tag_whitelists (tag_id, user_id) VALUES (?, ?)', [tagIds['slalom-team'], adminUser.id]);
            await db.run('INSERT OR IGNORE INTO tag_whitelists (tag_id, user_id) VALUES (?, ?)', [tagIds['polo-team'], adminUser.id]);
        }

        // Regenerate development events for a 18-week window
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
                [data.title, data.description, data.location, data.start, data.end, data.difficulty_level || 1, 20, data.upfront_cost, data.upfront_refund_cutoff || null]
            );
            if (data.tags) {
                for (const tagId of data.tags) {
                    await db.run('INSERT INTO event_tags (event_id, tag_id) VALUES (?, ?)', [res.lastID, tagId]);
                }
            }
        };

        while (currentDate <= endDate) {
            const day = currentDate.getDay();

            if (day === 3) { // Wednesday
                await createEvent({ title: `Social: ${topicalNames[Math.floor(Math.random() * topicalNames.length)]}`, description: "A fun social event.", location: "The Pub", start: setTime(currentDate, 19, 0), end: setTime(currentDate, 23, 0), upfront_cost: 0, tags: [tagIds['socials']] });
                await createEvent({ title: "Wednesday Warriors", description: "Chill paddling.", location: "Boathouse", start: setTime(currentDate, 13, 0), end: setTime(currentDate, 14, 0), upfront_cost: 0, tags: [tagIds['chill']] });
            }

            if (day === 4) { // Thursday
                const startT = new Date(currentDate); startT.setHours(14, 0, 0, 0);
                const cutoff = new Date(startT); cutoff.setHours(cutoff.getHours() - 48);
                await createEvent({ title: "Slalom/White Water", description: "Practice.", location: "Tees Barrage", start: formatDate(startT), end: setTime(currentDate, 16, 0), upfront_cost: 12, upfront_refund_cutoff: formatDate(cutoff), tags: [tagIds['slalom'], tagIds['white water']] });
            }

            if (day === 5) { // Friday
                const startT = new Date(currentDate); startT.setHours(19, 0, 0, 0);
                const cutoff = new Date(startT); cutoff.setHours(cutoff.getHours() - 24);
                await createEvent({ title: "Polo Pool Session", description: "Training.", location: "Freeman's Quay", start: formatDate(startT), end: setTime(currentDate, 20, 0), upfront_cost: 6, upfront_refund_cutoff: formatDate(cutoff), tags: [tagIds['polo']] });
            }

            if ([1, 2, 4, 5].includes(day) && Math.random() < 0.7) {
                const type = ['polo', 'white water', 'slalom'][Math.floor(Math.random() * 3)];
                await createEvent({ title: `${type.toUpperCase()} Ergs`, description: "Training.", location: "Boathouse Gym", start: setTime(currentDate, 7, 0), end: setTime(currentDate, 8, 0), upfront_cost: 0, tags: [tagIds['ergs'], tagIds[type]] });
            }

            if (day === 6) { // Saturday
                await createEvent({ title: "Polo Competition", description: "Club competition.", location: "Leeds", start: setTime(currentDate, 9, 0), end: setTime(currentDate, 17, 0), upfront_cost: 15, tags: [tagIds['polo-team']] });
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }
        console.log('Sample events generated.');
    }
}

module.exports = { seedData };