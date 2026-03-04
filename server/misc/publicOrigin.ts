import config from '../config.js';

function normalizeOrigin(rawOrigin: string): string | null {
    try {
        const parsed = new URL(rawOrigin);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return null;
        }
        return parsed.origin;
    } catch {
        return null;
    }
}

export function getTrustedPublicOrigin(): string {
    const explicitOrigin = process.env.ORIGIN?.trim();
    if (explicitOrigin) {
        const normalizedExplicit = normalizeOrigin(explicitOrigin);
        if (normalizedExplicit) return normalizedExplicit;
    }

    const configuredDomain = (config.domain || 'localhost').trim();
    if (/^https?:\/\//i.test(configuredDomain)) {
        const normalizedConfigured = normalizeOrigin(configuredDomain);
        if (normalizedConfigured) return normalizedConfigured;
    }

    const isLocal = configuredDomain.startsWith('localhost') || configuredDomain.startsWith('127.0.0.1');
    const protocol = isLocal ? 'http' : 'https';
    return `${protocol}://${configuredDomain}`;
}

export function buildTrustedPublicUrl(pathname: string): string {
    const origin = getTrustedPublicOrigin();
    return new URL(pathname, origin).toString();
}
