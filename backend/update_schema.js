
const db = require('./config/db');

const updateSchema = async () => {
    try {
        const connection = await db.getConnection();
        console.log('Connected to database.');

        try {
            // Check if columns exist (simple check by trying to select them or just add them and ignore error)
            // Better to just run ALTER TABLE and catch "Duplicate column name" error which is harmless here.

            console.log('Adding reason column...');
            await connection.query("ALTER TABLE book_requests ADD COLUMN reason TEXT NULL");
            console.log('Reason column added.');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('Reason column already exists.');
            } else {
                console.error('Error adding reason column:', error);
            }
        }

        try {
            console.log('Adding reference_link column...');
            await connection.query("ALTER TABLE book_requests ADD COLUMN reference_link VARCHAR(255) NULL");
            console.log('Reference_link column added.');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('Reference_link column already exists.');
            } else {
                console.error('Error adding reference_link column:', error);
            }
        }

        connection.release();
        process.exit(0);

    } catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
};

updateSchema();
