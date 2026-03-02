import mysql, { Pool, Connection } from 'mysql2/promise';
import Logger from '../misc/Logger.js';

export class DatabaseWrapper {
    connection: Pool | Connection;

    constructor(connection: Pool | Connection) {
        this.connection = connection;
    }

    private _prepareParams(params: any): any[] {
        if (params === undefined || params === null) return [];
        const paramArray = Array.isArray(params) ? params : [params];
        return paramArray.map(p => {
            if (p === undefined || (typeof p === 'number' && isNaN(p))) {
                if (typeof p === 'number' && isNaN(p) && process.env.NODE_ENV !== 'test') {
                    Logger.error('NaN detected in database parameters');
                }
                return null;
            }
            if (p instanceof Date) {
                return p.toISOString().slice(0, 19).replace('T', ' ');
            }
            if (typeof p === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(p)) {
                return p.slice(0, 19).replace('T', ' ');
            }
            return p;
        });
    }

    async run(sql: string, params: any = []): Promise<{ lastID: number; changes: number }> {
        const preparedParams = this._prepareParams(params);
        try {
            const [result] = await (this.connection as any).query(sql, preparedParams);
            return {
                lastID: result.insertId,
                changes: result.affectedRows
            };
        } catch (error: any) {
            if (process.env.NODE_ENV !== 'test') {
                Logger.error(`DB Run Error: ${error.message}\nSQL: ${sql}\nParams: ${JSON.stringify(preparedParams)}`);
            }
            throw error;
        }
    }

    async get(sql: string, params: any = []): Promise<any> {
        const preparedParams = this._prepareParams(params);
        try {
            const [rows] = await (this.connection as any).query(sql, preparedParams);
            return (rows as any[])[0];
        } catch (error: any) {
            if (process.env.NODE_ENV !== 'test') {
                Logger.error(`DB Get Error: ${error.message}\nSQL: ${sql}\nParams: ${JSON.stringify(preparedParams)}`);
            }
            throw error;
        }
    }

    async all(sql: string, params: any = []): Promise<any[]> {
        const preparedParams = this._prepareParams(params);
        try {
            const [rows] = await (this.connection as any).query(sql, preparedParams);
            return rows as any[];
        } catch (error: any) {
            if (process.env.NODE_ENV !== 'test') {
                Logger.error(`DB All Error: ${error.message}\nSQL: ${sql}\nParams: ${JSON.stringify(preparedParams)}`);
            }
            throw error;
        }
    }

    async exec(sql: string): Promise<void> {
        try {
            await (this.connection as any).query(sql);
        } catch (error: any) {
            if (process.env.NODE_ENV !== 'test') {
                Logger.error(`DB Exec Error: ${error.message}\nSQL: ${sql}`);
            }
            throw error;
        }
    }

    async transaction<T>(callback: (db: DatabaseWrapper) => Promise<T>): Promise<T> {
        let conn: any;
        let release = false;

        if ('getConnection' in this.connection) {
            conn = await (this.connection as Pool).getConnection();
            release = true;
        } else {
            conn = this.connection;
        }

        await conn.beginTransaction();
        try {
            const result = await callback(new DatabaseWrapper(conn));
            await conn.commit();
            return result;
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            if (release) {
                conn.release();
            }
        }
    }

    async close(): Promise<void> {
        if ('end' in this.connection) {
            await (this.connection as any).end();
        }
    }
}

export async function connect(config: any): Promise<DatabaseWrapper> {
    const { rootPassword, ...validConfig } = config;
    const poolConfig = { ...validConfig, multipleStatements: true, decimalNumbers: true };
    const pool = mysql.createPool(poolConfig);
    return new DatabaseWrapper(pool);
}
