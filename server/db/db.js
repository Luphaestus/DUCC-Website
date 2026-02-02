import mysql from 'mysql2';
import Logger from '../misc/Logger.js';

export class DatabaseWrapper {
    constructor(connection) {
        this.connection = connection;
    }

    _prepareParams(params) {
        if (params === undefined || params === null) return [];
        const paramArray = Array.isArray(params) ? params : [params];
        return paramArray.map(p => {
            if (p === undefined) return null;
            if (p instanceof Date) {
                // MySQL expects YYYY-MM-DD HH:mm:ss in local time or UTC depending on config
                // but usually it's best to send a string.
                return p.toISOString().slice(0, 19).replace('T', ' ');
            }
            // If it's a string that looks like an ISO date, convert it for MySQL
            if (typeof p === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(p)) {
                return p.slice(0, 19).replace('T', ' ');
            }
            return p;
        });
    }

    async run(sql, params = []) {
        const preparedParams = this._prepareParams(params);
        try {
            const [result] = await this.connection.query(sql, preparedParams);
            return {
                lastID: result.insertId,
                changes: result.affectedRows
            };
        } catch (error) {
            Logger.error(`DB Run Error: ${error.message}\nSQL: ${sql}\nParams: ${JSON.stringify(preparedParams)}`);
            throw error;
        }
    }

    async get(sql, params = []) {
        const preparedParams = this._prepareParams(params);
        try {
            const [rows] = await this.connection.query(sql, preparedParams);
            return rows[0];
        } catch (error) {
            Logger.error(`DB Get Error: ${error.message}\nSQL: ${sql}\nParams: ${JSON.stringify(preparedParams)}`);
            throw error;
        }
    }

    async all(sql, params = []) {
        const preparedParams = this._prepareParams(params);
        try {
            const [rows] = await this.connection.query(sql, preparedParams);
            return rows;
        } catch (error) {
            Logger.error(`DB All Error: ${error.message}\nSQL: ${sql}\nParams: ${JSON.stringify(preparedParams)}`);
            throw error;
        }
    }

    async exec(sql) {
        try {
            await this.connection.query(sql);
        } catch (error) {
            Logger.error(`DB Exec Error: ${error.message}\nSQL: ${sql}`);
            throw error;
        }
    }

    async transaction(callback) {
        if (!this.connection.getConnection) {
            throw new Error('Cannot start transaction from a non-pool connection');
        }

        const conn = await this.connection.getConnection();
        await conn.beginTransaction();
        try {
            const result = await callback(new DatabaseWrapper(conn));
            await conn.commit();
            return result;
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    async close() {
        if (this.connection.end) {
            await this.connection.end();
        }
    }
}

export async function connect(config) {
    const poolConfig = { ...config, multipleStatements: true, decimalNumbers: true };
    const pool = mysql.createPool(poolConfig).promise();
    return new DatabaseWrapper(pool);
}
