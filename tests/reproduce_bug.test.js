import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import TestWorld from './tests/utils/TestWorld.js';
import UserAPI from './server/api/users/UserAPI.js';

describe('Bug Reproduction: Profile Picture Path SQL Syntax', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        
        await world.createUser('user', { 
            first_name: 'John', 
            last_name: 'Doe',
            email: 'john.doe@durham.ac.uk'
        });

        new UserAPI(world.app, world.db).registerRoutes();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    test('Successfully fetches profile_picture_path without SQL error', async () => {
        const res = await world.as('user').get('/api/user/elements/profile_picture_path');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('profile_picture_path');
        expect(res.body.profile_picture_path).toBeNull();
    });

    test('Correctly constructs profile_picture_path when a picture is set', async () => {
        // Manually insert a file and set it as profile picture
        await world.db.run('INSERT INTO files (id, title, author, size, filename, hash, visibility) VALUES (1, "Test", "User", 100, "test.png", "hash", "public")');
        await world.db.run('UPDATE users SET profile_picture_id = 1 WHERE id = ?', [world.data.users['user']]);

        const res = await world.as('user').get('/api/user/elements/profile_picture_path');
        expect(res.statusCode).toBe(200);
        expect(res.body.profile_picture_path).toBe('/api/files/1/download?view=true');
    });
});
