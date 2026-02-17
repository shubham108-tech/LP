const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkUsers() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'library_db'
    });

    try {
        const [rows] = await connection.execute('SELECT id, name, email, role, is_verified FROM users');
        fs.writeFileSync('users_output.json', JSON.stringify(rows, null, 2));
        console.log('Done writing to users_output.json');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkUsers();
