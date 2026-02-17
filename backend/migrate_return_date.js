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

        console.log('Modifying return_date column in book_issues table to DATETIME...');
        await connection.query(`
            ALTER TABLE book_issues 
            MODIFY COLUMN return_date DATETIME
        `);
        console.log('Column modified successfully.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
};

migrate();
