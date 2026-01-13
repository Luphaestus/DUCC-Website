const path = require('path');
const fs = require('fs');

/**
 * Manages system-wide configuration stored in a JSON file.
 * @module Globals
 */
class Globals {
    /**
     * Initializes the instance and ensures 'globals.json' exists with defaults.
     */
    constructor() {
        if (Globals.instance) {
            return Globals.instance;
        }
        Globals.instance = this;

        const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, "../../data/database.db");
        const dbDir = path.dirname(dbPath);
        this.path = path.join(dbDir, "globals.json");

        if (!fs.existsSync(this.path)) {
            fs.writeFileSync(this.path, JSON.stringify({
                Unauthorized_max_difficulty: 1,
                MinMoney: -20,
                MembershipCost: 50,
                President: 1,
            }));
        }
    }

    /** 
     * Retrieves a value from the globals file.
     * @param {string} key
     * @returns {any}
     */
    get(key) {
        const data = JSON.parse(fs.readFileSync(this.path, 'utf-8'));
        return data[key];
    }

    /**
     * Retrieves a value as an integer.
     * @param {string} key
     * @returns {number}
     */
    getInt(key) {
        return parseInt(this.get(key), 10);
    }

    /**
     * Retrieves a value as a float.
     * @param {string} key
     * @returns {number}
     */
    getFloat(key) {
        return parseFloat(this.get(key));
    }

    /**
     * Retrieves the entire configuration object.
     * @returns {object}
     */
    getAll() {
        return JSON.parse(fs.readFileSync(this.path, 'utf-8'));
    }

    /**
     * Updates a value in the globals file.
     * @param {string} key
     * @param {any} value
     */
    set(key, value) {
        const data = this.getAll();
        data[key] = value;
        fs.writeFileSync(this.path, JSON.stringify(data));
    }

}

module.exports = Globals;