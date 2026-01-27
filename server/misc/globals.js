/**
 * globals.js
 * 
 * Manages dynamic system-wide configuration settings stored in a JSON file.
 */

import fs from 'fs';
import config from '../config.js';
import Logger from './Logger.js';

export default class Globals {
    static cache = null;

    /**
     * Initializes the instance and ensures 'globals.json' exists with default values.
     */
    constructor() {
        Globals.instance = this;
        Globals.validPermissions = ['Guest', 'Authenticated', 'President'];

        this.path = config.paths.globals;
        const dbDir = config.paths.data;

        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        if (!fs.existsSync(this.path)) {
            const defaults = {
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
            };
            fs.writeFileSync(this.path, JSON.stringify(defaults, null, 4));
            Globals.cache = defaults;
        } else if (!Globals.cache) {
            try {
                Globals.cache = JSON.parse(fs.readFileSync(this.path, 'utf-8'));
            } catch (error) {
                Logger.error('Failed to load globals.json:', error);
                Globals.cache = {}; 
            }
        }
    }

    /** 
     * Retrieves a full global entry from the file.
     */
    get(key) {
        if (!Globals.cache) {
             try {
                Globals.cache = JSON.parse(fs.readFileSync(this.path, 'utf-8'));
            } catch (error) {
                Logger.error('Failed to load globals.json:', error);
                return null;
            }
        }
        return Globals.cache[key];
    }

    /**
     * Helper to retrieve a value and cast it to an integer.
     */
    getInt(key) {
        const item = this.get(key);
        return item ? parseInt(item.data, 10) : 0;
    }

    /**
     * Helper to retrieve a value and cast it to a float.
     */
    getFloat(key) {
        const item = this.get(key);
        return item ? parseFloat(item.data) : 0.0;
    }

    /**
     * Retrieves the entire raw configuration object.
     */
    getAll() {
        if (!Globals.cache) this.get('dummy'); 
        return Globals.cache;
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
        Globals.cache = data; 

        fs.writeFile(this.path, JSON.stringify(data, null, 4), (err) => {
            if (err) Logger.error('Failed to save globals.json:', err);
        });
    }

}
