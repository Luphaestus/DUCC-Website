import { describe, test, expect, afterEach } from 'vitest';
import config from '../../server/config.js';
import { getTrustedPublicOrigin, buildTrustedPublicUrl } from '../../server/misc/publicOrigin.js';

const originalOrigin = process.env.ORIGIN;
const originalDomain = config.domain;

afterEach(() => {
    if (originalOrigin === undefined) {
        delete process.env.ORIGIN;
    } else {
        process.env.ORIGIN = originalOrigin;
    }
    config.domain = originalDomain;
});

describe('misc/publicOrigin', () => {
    test('uses explicit ORIGIN when valid', () => {
        process.env.ORIGIN = 'https://ducc.example.com/some/path?ignored=1';
        config.domain = 'localhost:3000';

        expect(getTrustedPublicOrigin()).toBe('https://ducc.example.com');
    });

    test('uses localhost over http when ORIGIN is not set', () => {
        delete process.env.ORIGIN;
        config.domain = 'localhost:3000';

        expect(getTrustedPublicOrigin()).toBe('http://localhost:3000');
    });

    test('builds absolute URLs from trusted origin', () => {
        delete process.env.ORIGIN;
        config.domain = 'ducc.example.com';

        expect(buildTrustedPublicUrl('/api/auth/verify/abc123')).toBe('https://ducc.example.com/api/auth/verify/abc123');
    });
});
