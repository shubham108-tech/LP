const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function createAdmin() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'library_db'
    });

    try {
        const email = 'admin123@gmail.com';
        const [existing] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);

        const password = 'password123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        if (existing.length === 0) {
            await connection.execute(
                'INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, ?, ?)',
                ['Admin User', email, hashedPassword, 'admin', 1]
            );
            console.log('Created admin123@gmail.com with password123');
        } else {
            await connection.execute(
                'UPDATE users SET password = ?, role = "admin", is_verified = 1 WHERE email = ?',
                [hashedPassword, email]
            );
            console.log('Updated admin123@gmail.com with password123');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

createAdmin();
