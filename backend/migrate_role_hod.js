const db = require('./config/db');

async function migrateRoleEnum() {
    try {
        console.log('Migrating role column to include HOD...');
        // We modify the column to include 'hod'
        await db.query("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'teacher', 'student', 'hod') NOT NULL DEFAULT 'student'");
        console.log('Successfully updated users table role enum.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateRoleEnum();
