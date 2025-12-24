const bcrypt = require('bcrypt');
const { generateRandomPassword } = require('./utils');

async function seedData(db, env) {
    // Check if colleges exist
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
        console.log('Colleges inserted successfully.');
    }

    // Check if admin user exists
    const adminExists = await db.get("SELECT * FROM users WHERE email = 'admin@durham.ac.uk'");
    if (!adminExists) {
        try {
            const sessionsExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'");
            if (sessionsExists) {
                console.log('Clearing sessions...');
                await db.run('DELETE FROM sessions');
            }
        } catch (e) {
            console.warn('Failed to clear sessions (non-fatal):', e.message);
        }

        console.log('Inserting admin user...');
        const email = 'admin@durham.ac.uk';
        const password = generateRandomPassword(12);
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.run(
            `INSERT INTO users (email, hashed_password, first_name, last_name, difficulty_level, can_manage_users, can_manage_events, can_manage_transactions, is_exec) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [email, hashedPassword, 'Admin', 'User', 5, 1, 1, 1, 1]
        );
        console.log('Admin user created');
        console.log("===============================");
        console.log("Admin login details:");
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log("===============================");
    }

    if (env === 'dev' || env === 'development') {
        const userCount = await db.get('SELECT COUNT(*) as count FROM users');

        if (userCount.count < 5) {
            console.log('Inserting random users for development...');
            const password = 'password';
            const hashedPassword = await bcrypt.hash(password, 10);

            const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
            const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

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
                    const daysOffset = Math.floor(Math.random() * 1095) - 365;
                    d.setDate(d.getDate() + daysOffset);
                    firstAidExpiry = d.toISOString().split('T')[0];
                }

                const result = await db.run(
                    `INSERT INTO users (email, hashed_password, first_name, last_name, college_id, is_member, filled_legal_info, is_instructor, first_aid_expiry) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [email, hashedPassword, firstName, lastName, collegeId, isMember, filledLegal, isInstructor, firstAidExpiry]
                );

                const userId = result.lastID;
                const numTx = Math.floor(Math.random() * 4);
                for (let j = 0; j < numTx; j++) {
                    const amount = (Math.random() * 100 - 50).toFixed(2);
                    await db.run(`INSERT INTO transactions (user_id, amount, description) VALUES (?, ?, ?)`, [userId, amount, `Random transaction ${j + 1}`]);
                }
            }
            console.log('Random users inserted.');
        }

        // Insert Tags
        console.log('Ensuring tags exist...');
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

        // Whitelist admin for team tags
        const adminUser = await db.get("SELECT id FROM users WHERE email = 'admin@durham.ac.uk'");
        if (adminUser) {
            await db.run('INSERT OR IGNORE INTO tag_whitelists (tag_id, user_id) VALUES (?, ?)', [tagIds['slalom-team'], adminUser.id]);
            await db.run('INSERT OR IGNORE INTO tag_whitelists (tag_id, user_id) VALUES (?, ?)', [tagIds['polo-team'], adminUser.id]);
        }

        console.log('Clearing old events and regenerating...');
        await db.run('DELETE FROM events');
        await db.run('DELETE FROM event_tags');

        const now = new Date();
        const start = new Date(now);
        start.setDate(start.getDate() - (6 * 7)); // 6 weeks back
        const end = new Date(now);
        end.setDate(end.getDate() + (12 * 7)); // 12 weeks future

        const topicalNames = ["Pub Night", "Board Games", "Movie Night", "Pizza Party", "Quiz Night", "Karaoke", "Bar Crawl", "Bonfire"];

        let currentDate = new Date(start);

        // Helper to format date for SQLite
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
            const eventId = res.lastID;
            if (data.tags) {
                for (const tagId of data.tags) {
                    await db.run('INSERT INTO event_tags (event_id, tag_id) VALUES (?, ?)', [eventId, tagId]);
                }
            }
        };

        while (currentDate <= end) {
            const day = currentDate.getDay(); // 0 Sun, 1 Mon, ... 3 Wed, 4 Thu, 5 Fri

            // Wednesdays (3)
            if (day === 3) {
                // Social at 7pm (19:00)
                await createEvent({
                    title: `Social: ${topicalNames[Math.floor(Math.random() * topicalNames.length)]}`,
                    description: "A fun social event for everyone!",
                    location: "The Pub",
                    start: setTime(currentDate, 19, 0),
                    end: setTime(currentDate, 23, 0),
                    upfront_cost: 0,
                    tags: [tagIds['socials']]
                });

                // Chill 1: Wednesday Warriors
                await createEvent({
                    title: "Wednesday Warriors (Group 1)",
                    description: "Chill paddling session.",
                    location: "Boathouse",
                    start: setTime(currentDate, 13, 0),
                    end: setTime(currentDate, 14, 0),
                    upfront_cost: 0,
                    tags: [tagIds['chill']]
                });

                // Chill 2: Wednesday Warriors
                await createEvent({
                    title: "Wednesday Warriors (Group 2)",
                    description: "Chill paddling session.",
                    location: "Boathouse",
                    start: setTime(currentDate, 14, 0),
                    end: setTime(currentDate, 15, 0),
                    upfront_cost: 0,
                    tags: [tagIds['chill']]
                });
            }

            // Thursdays (4)
            if (day === 4) {
                // Slalom/White Water - £12, 48h refund cutoff
                const startT = new Date(currentDate);
                startT.setHours(14, 0, 0, 0);
                const cutoff = new Date(startT);
                cutoff.setHours(cutoff.getHours() - 48);

                await createEvent({
                    title: "Slalom/White Water Session",
                    description: "Intermediate white water and slalom practice.",
                    location: "Tees Barrage",
                    start: formatDate(startT),
                    end: setTime(currentDate, 16, 0),
                    upfront_cost: 12,
                    upfront_refund_cutoff: formatDate(cutoff),
                    tags: [tagIds['slalom'], tagIds['white water']]
                });
            }

            // Fridays (5)
            if (day === 5) {
                // Pool (Polo) at 7pm (19:00) - £6, 24h refund
                const startT = new Date(currentDate);
                startT.setHours(19, 0, 0, 0);
                const cutoff = new Date(startT);
                cutoff.setHours(cutoff.getHours() - 24);

                await createEvent({
                    title: "Polo Pool Session",
                    description: "Canoe Polo training in the pool.",
                    location: "Freeman's Quay",
                    start: formatDate(startT),
                    end: setTime(currentDate, 20, 0),
                    upfront_cost: 6,
                    upfront_refund_cutoff: formatDate(cutoff),
                    tags: [tagIds['polo']]
                });
            }

            // Ergs - Randomly on weekdays (Mon-Fri) - 3 to 4 times a week
            // We want roughly 3-4 days out of 5 to have an Erg session
            if ([1, 2, 3, 4, 5].includes(day)) {
                if (Math.random() < 0.7) { // 70% chance each weekday ~ 3.5 times/week
                    const types = ['polo', 'white water', 'slalom'];
                    const type = types[Math.floor(Math.random() * types.length)];

                    await createEvent({
                        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Ergs`,
                        description: `Ergometer training focused on ${type} techniques.`,
                        location: "Boathouse Gym",
                        start: setTime(currentDate, 7, 0),
                        end: setTime(currentDate, 8, 0),
                        difficulty_level: Math.floor(Math.random() * 5) + 1,
                        upfront_cost: 0,
                        tags: [tagIds['ergs'], tagIds[type]]
                    });
                }
            }

            // Sporadic Untagged Event (approx 1 per week)
            if (Math.random() < 0.15) { // ~15% chance per day
                await createEvent({
                    title: `Pop-up: ${topicalNames[Math.floor(Math.random() * topicalNames.length)]}`,
                    description: "A spontaneous gathering!",
                    location: "Various Locations",
                    start: setTime(currentDate, 18, 0),
                    end: setTime(currentDate, 21, 0),
                    upfront_cost: 0,
                    tags: [] // No tags
                });
            }

            // Weekend (Sat 6, Sun 0) - "Every so often"
            if (day === 6) { // Saturday
                // Regular Polo Competition
                await createEvent({
                    title: "Polo Competition",
                    description: "Club Polo Competition.",
                    location: "Leeds",
                    start: setTime(currentDate, 9, 0),
                    end: setTime(currentDate, 17, 0),
                    upfront_cost: 15,
                    tags: [tagIds['polo-team']]
                });

                if (Math.random() < 0.3) { // 30% chance of a weekend event
                    const typeRand = Math.random();
                    if (typeRand < 0.5) {
                        // White Water Trip (Weekend: Sat-Sun)
                        const sun = new Date(currentDate);
                        sun.setDate(sun.getDate() + 1);
                        await createEvent({
                            title: "White Water Weekend Trip",
                            description: "Club trip to the Lakes.",
                            location: "Lake District",
                            start: setTime(currentDate, 8, 0),
                            end: setTime(sun, 18, 0),
                            difficulty_level: Math.floor(Math.random() * 5) + 1,
                            upfront_cost: 40,
                            tags: [tagIds['white water']]
                        });
                    } else {
                        // Slalom (Sun) - Triggered on Sat for logic simplicity, but date is Sun
                        const sun = new Date(currentDate);
                        sun.setDate(sun.getDate() + 1);
                        await createEvent({
                            title: "Slalom Competition",
                            description: "Regional slalom competition.",
                            location: "Grandtully",
                            start: setTime(sun, 9, 0),
                            end: setTime(sun, 16, 0),
                            upfront_cost: 20,
                            tags: [tagIds['slalom-team']]
                        });
                    }
                }
            }

            // Sunday (0)
            if (day === 0) {
                await createEvent({
                    title: "Polo Session",
                    description: "Sunday Polo Session.",
                    location: "Boathouse",
                    start: setTime(currentDate, 14, 0),
                    end: setTime(currentDate, 16, 0),
                    upfront_cost: 0,
                    tags: [tagIds['polo']]
                });
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }
        process.stdout.write('\n');
        console.log('Sample events generated.');

        const txCount = await db.get('SELECT COUNT(*) as count FROM transactions');
        if (txCount.count === 0) {
            console.log('Creating initial transaction records...');
            const adminUser = await db.get(`SELECT id FROM users WHERE email = ?`, ['admin@durham.ac.uk']);
            if (adminUser) {
                const initialTransactions = [
                    { amount: 100.00, description: 'Initial membership fee' },
                    { amount: -20.00, description: 'Refund for event cancellation' },
                    { amount: -15.50, description: 'Purchase of club merchandise' }
                ];

                for (const tx of initialTransactions) {
                    await db.run(
                        `INSERT INTO transactions (user_id, amount, description) VALUES (?, ?, ?)`,
                        [adminUser.id, tx.amount, tx.description]
                    );
                }
                console.log('Initial transactions created successfully.');
            }
        }
    }
}

module.exports = { seedData };