const db = require('./config/db');

async function checkSchema() {
    try {
        const [rows] = await db.query('SHOW COLUMNS FROM users');
        console.log(JSON.stringify(rows.map(r => ({ Field: r.Field, Type: r.Type, Null: r.Null, Default: r.Default })), null, 2));
        process.exit(0);
    } catch (error) {
        console.error('Error checking schema:', error);
        process.exit(1);
    }
}

checkSchema();
