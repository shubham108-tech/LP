const db = require('./config/db');

const migrateIssuesStatus = async () => {
    try {
        console.log('Migrating book_issues table...');

        // Add 'status' column
        try {
            await db.query(`
                ALTER TABLE book_issues 
                ADD COLUMN status ENUM('borrowed', 'returned', 'lost', 'damaged') DEFAULT 'borrowed'
            `);
            console.log('Added status column');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('status column already exists');
            } else {
                console.error('Error adding status column:', error.message);
            }
        }

        // Add 'fine' column
        try {
            await db.query(`
                ALTER TABLE book_issues 
                ADD COLUMN fine DECIMAL(10, 2) DEFAULT 0.00
            `);
            console.log('Added fine column');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('fine column already exists');
            } else {
                console.error('Error adding fine column:', error.message);
            }
        }

        // Migrate existing data: if returned=1, set status='returned', else 'borrowed'
        await db.query(`
            UPDATE book_issues 
            SET status = IF(returned = 1, 'returned', 'borrowed')
            WHERE status IS NULL OR status = ''
        `);
        console.log('Updated existing records status');

        console.log('Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrateIssuesStatus();
