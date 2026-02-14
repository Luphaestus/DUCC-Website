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

    /**
     * Pick allowed keys from an object (Mass Assignment protection).
     */
    static pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
        const result = {} as Pick<T, K>;
        keys.forEach(key => {
            if (obj && Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
                result[key] = obj[key];
            }
        });
        return result;
    }

    /**
     * Validate and construct a safe SQL ORDER BY clause.
     */
    static getSortSql(sort: string | undefined, allowed: string[], defaultCol: string, order: string | undefined): string {
        const column = (sort && allowed.includes(sort)) ? sort : defaultCol;
        const dir = order?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        return `${column} ${dir}`;
    }
}
