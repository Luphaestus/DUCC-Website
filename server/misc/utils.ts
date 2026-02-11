import { Request } from 'express';

/**
 * utils.ts
 *
 * General-purpose utility functions.
 */

export default class Utils {
    /**
     * Calculate the start of the current academic year (September 1st).
     */
    static getAcademicYearStart(): string {
        const now = new Date();
        const year = now.getUTCMonth() < 8 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
        return new Date(Date.UTC(year, 8, 1)).toISOString();
    }

    /**
     * Extract the base URL from an incoming Express request.
     */
    static getBaseUrl(req: Request): string {
        return `${req.protocol}://${req.get('host')}`;
    }

    /**
     * Generate a numeric OTP.
     */
    static generateOTP(length: number = 6): string {
        let otp = '';
        for (let i = 0; i < length; i++) {
            otp += Math.floor(Math.random() * 10).toString();
        }
        return otp;
    }
}
