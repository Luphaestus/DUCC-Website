const path = require('path');
const fs = require('fs');

class Globals {
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
                MembershipCost: 50
            }));
        }
    }

    getInt(key) {
        const data = JSON.parse(fs.readFileSync(this.path, 'utf-8'));
        return parseInt(data[key], 10);
    }

    getFloat(key) {
        const data = JSON.parse(fs.readFileSync(this.path, 'utf-8'));
        return parseFloat(data[key]);
    }

}

module.exports = Globals;