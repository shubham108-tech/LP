const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkColumns() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'library_db'
    });

    try {
        const [rows] = await connection.execute('SHOW COLUMNS FROM users');
        const fields = rows.map(r => r.Field);
        console.log('Columns in users table:', fields);

        if (!fields.includes('profile_image')) {
            console.log('MISSING: profile_image');
        } else {
            console.log('FOUND: profile_image');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkColumns();
