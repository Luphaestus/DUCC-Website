/**
 * globals.js
 * 
 * Manages dynamic system-wide configuration settings stored in a JSON file.
 */

const path = require('path');
const fs = require('fs');

class Globals {
    /**
     * Initializes the instance and ensures 'globals.json' exists with default values.
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
                DefaultEventImage: {
                    data: "/images/misc/ducc.png",
                    name: "Default Event Image",
                    description: "The default banner image for events if no other image is set.",
                    type: "image",
                    regexp: "^/(images|api/files)/.+$",
                    error: "Value must be a valid path or file API URL.",
                    permission: "President",
                },
            }, null, 4));
        }
    }

    /** 
     * Retrieves a full global entry from the file.
     */
    get(key) {
        const data = JSON.parse(fs.readFileSync(this.path, 'utf-8'));
        return data[key];
    }

    /**
     * Helper to retrieve a value and cast it to an integer.
     */
    getInt(key) {
        return parseInt(this.get(key).data, 10);
    }

    /**
     * Helper to retrieve a value and cast it to a float.
     */
    getFloat(key) {
        return parseFloat(this.get(key).data);
    }

    /**
     * Retrieves the entire raw configuration object.
     */
    getAll() {
        return JSON.parse(fs.readFileSync(this.path, 'utf-8'));
    }

    /**
     * Retrieves a set of keys, filtered by the requester's permission level.
     */
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
     * Updates a value in the configuration file.
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
        fs.writeFileSync(this.path, JSON.stringify(data, null, 4));
    }

}

module.exports = Globals;