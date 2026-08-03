const db = require('./config/db');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
    try {
        await db.query('ALTER TABLE users ADD COLUMN stationary_blocked BOOLEAN DEFAULT FALSE');
        console.log('Added stationary_blocked to users table');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('stationary_blocked already exists');
        } else {
            console.error('Error:', e);
        }
    }
    process.exit(0);
}
run();
