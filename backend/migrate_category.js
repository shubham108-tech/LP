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
        const [columns] = await connection.query(`SHOW COLUMNS FROM books LIKE 'category'`);

        if (columns.length === 0) {
            console.log('Adding category column to books table...');
            await connection.query(`
                ALTER TABLE books 
                ADD COLUMN category VARCHAR(100) DEFAULT 'General'
            `);
            console.log('Column added successfully.');
        } else {
            console.log('Column already exists.');
        }

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
};

migrate();
