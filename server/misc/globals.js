const path = require('path');
const fs = require('fs');

/**
 * Globals class.
 * A Singleton that manages system-wide configuration settings stored in a JSON file.
 * This allows settings like membership cost or minimum balance to be modified without code changes.
 * 
 * Note: Current implementation reads/writes to disk on every operation.
 * 
 * @module Globals
 */
class Globals {
    /**
     * Initializes the Globals instance using the Singleton pattern.
     * Ensures 'globals.json' exists with default values if it is missing.
     */
    constructor() {
        if (Globals.instance) {
            return Globals.instance;
        }
        Globals.instance = this;

        this.path = path.resolve(__dirname, "../../globals.json");

        // Bootstrap defaults if the config file is missing
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
     * Reads and parses the entire file synchronously.
     * @param {string} key - The configuration key to retrieve.
     * @returns {any} The value, or undefined if not found.
     */
    get(key) {
        const data = JSON.parse(fs.readFileSync(this.path, 'utf-8'));
        return data[key];
    }

    /**
     * Retrieves a value and parses it as an integer.
     * @param {string} key
     * @returns {number}
     */
    getInt(key) {
        return parseInt(this.get(key), 10);
    }

    /**
     * Retrieves a value and parses it as a float.
     * @param {string} key
     * @returns {number}
     */
    getFloat(key) {
        return parseFloat(this.get(key));
    }

    /**
     * Retrieves the entire global configuration object.
     * @returns {object}
     */
    getAll() {
        return JSON.parse(fs.readFileSync(this.path, 'utf-8'));
    }

    /**
     * Updates a value in the globals file.
     * Reads, modifies, and then re-writes the entire file synchronously.
     * @param {string} key - The key to update.
     * @param {any} value - The new value to set.
     */
    set(key, value) {
        const data = this.getAll();
        data[key] = value;
        fs.writeFileSync(this.path, JSON.stringify(data));
    }

}

module.exports = Globals;