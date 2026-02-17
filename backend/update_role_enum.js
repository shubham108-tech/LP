const db = require('./config/db');

async function updateRoleEnum() {
    try {
        console.log('Updating role column...');
        await db.query("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'teacher', 'student') NOT NULL DEFAULT 'teacher'");
        console.log('Role column updated successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error updating role:', error);
        process.exit(1);
    }
}

updateRoleEnum();
