const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const migrate = async () => {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'library_db'
    };

    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('Connected to database.');

        // Check if columns exist
        const [columns] = await connection.query(`SHOW COLUMNS FROM users LIKE 'otp'`);

        if (columns.length === 0) {
            console.log('Adding otp, otp_expiry, and is_verified columns...');
            await connection.query(`
                ALTER TABLE users 
                ADD COLUMN otp VARCHAR(6),
                ADD COLUMN otp_expiry DATETIME,
                ADD COLUMN is_verified BOOLEAN DEFAULT FALSE
            `);
            console.log('Columns added successfully.');
        } else {
            console.log('Columns already exist.');
        }

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
};

migrate();
