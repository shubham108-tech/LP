const db = require('./config/db');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
    try {
        await db.query('ALTER TABLE stationary_items ADD COLUMN bill_number VARCHAR(100)');
        console.log('Added bill_number to stationary_items');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('bill_number already exists');
        } else {
            console.error('Error:', e);
        }
    }
    process.exit(0);
}
run();
