const path = require('path');
const fs = require('fs');
const { error } = require('console');
const { permission } = require('process');
const { type } = require('os');

/**
 * Manages system-wide configuration stored in a JSON file.
 * @module Globals
 */
class Globals {
    /**
     * Initializes the instance and ensures 'globals.json' exists with defaults.
     */
    constructor() {
        Globals.instance = this;
        Globals.validPermissions = ['Guest', 'Authenticated', 'President'];

        const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, "../../data/database.db");
        const dbDir = path.dirname(dbPath);
        this.path = path.join(dbDir, "globals.json");
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        if (!fs.existsSync(this.path)) {
            fs.writeFileSync(this.path, JSON.stringify({
                Unauthorized_max_difficulty: {
                    data: 1,
                    name: "Unauthorized Max Difficulty",
                    description: "Maximum difficulty level visible to guests.",
                    type: "number",
                    regexp: "^[1-5]$",
                    error: "Value must be an integer between 1 and 5.",
                    permission: "President",
                },
                MinMoney: {
                    data: -25,
                    name: "Minimum Balance",
                    description: "Debt limit before signup restriction.",
                    type: "number",
                    regexp: "^-?\\d+$",
                    error: "Value must be an integer.",
                    permission: "Authenticated",
                },
                MembershipCost: {
                    data: 50,
                    name: "Membership Cost",
                    description: "Annual membership fee.",
                    type: "number",
                    regexp: "^\\d+(\\.\\d{1,2})?$",
                    error: "Value must be a valid currency amount.",
                    permission: "Authenticated",
                },
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

    getKeys(keys, permission = Globals.validPermissions[0]) {
        const allowedPermissions = Globals.validPermissions.slice(0, Globals.validPermissions.indexOf(permission) + 1);

        const data = this.getAll();
        const result = {};

        for (const key of keys) {
            if (data[key] && allowedPermissions.includes(data[key].permission)) {
                result[key] = data[key];
            }
        }

        return result;
    }

    /**
     * Updates a value in the globals file.
     * @param {string} key
     * @param {any} value
     */
    set(key, value) {
        const data = this.getAll();
        const valueContainer = data[key];

        if (key === undefined || value === undefined) {
            throw new Error("Key and value must be provided.");
        }

        if (valueContainer === undefined && typeof valueContainer !== 'object') {
            throw new Error(`Global key '${key}' does not exist.`);
        }

        const regexp = new RegExp(valueContainer.regexp);
        if (!regexp.test(value.toString())) {
            throw new Error(valueContainer.error);
        }

        valueContainer.data = value;
        data[key] = valueContainer;
        fs.writeFileSync(this.path, JSON.stringify(data));
    }

}

module.exports = Globals;