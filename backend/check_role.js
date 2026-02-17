const db = require('./config/db');

async function checkRole() {
    try {
        const [rows] = await db.query("SHOW COLUMNS FROM users WHERE Field = 'role'");
        console.log('Role Column:', rows[0].Type);
        process.exit(0);
    } catch (error) {
        console.error('Error checking role:', error);
        process.exit(1);
    }
}

checkRole();
