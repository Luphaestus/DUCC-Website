const path = require('path');
const fs = require('fs');

/**
 * Singleton class for managing global application settings.
 * Reads settings from a 'globals.json' file.
 * @module Globals
 */
class Globals {
    /**
     * Initializes the Globals instance.
     * Creates the 'globals.json' file with default values if it doesn't exist.
     */
    constructor() {
        if (Globals.instance) {
            return Globals.instance;
        }
        Globals.instance = this;

        this.path = path.resolve(__dirname, "../../globals.json");

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
     * Retrieves the value for the given key from the globals file.
     * @param {string} key - The key to retrieve.
     * @returns {any} The value associated with the key.
     */
    get(key) {
        const data = JSON.parse(fs.readFileSync(this.path, 'utf-8'));
        return data[key];
    }

    /**
     * Retrieves an integer value for the given key from the globals file.
     * @param {string} key - The key to retrieve.
     * @returns {number} The integer value associated with the key.
     */
    getInt(key) {
        return parseInt(this.get(key), 10);
    }

    /**
     * Retrieves a float value for the given key from the globals file.
     * @param {string} key - The key to retrieve.
     * @returns {number} The float value associated with the key.
     */
    getFloat(key) {
        return parseFloat(this.get(key));
    }

    /**
     * Retrieves all global settings.
     * @returns {object} An object containing all global settings.
     */
    getAll() {
        return JSON.parse(fs.readFileSync(this.path, 'utf-8'));
    }

    /**
     * Updates the value for the given key in the globals file.
     * @param {string} key - The key to update.
     * @param {any} value - The new value.
     */
    set(key, value) {
        const data = this.getAll();
        data[key] = value;
        fs.writeFileSync(this.path, JSON.stringify(data));
    }

}

module.exports = Globals;