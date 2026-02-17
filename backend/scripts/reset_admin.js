const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function resetAdminPassword() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'library_db'
    });

    try {
        const password = 'admin123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [result] = await connection.execute(
            'UPDATE users SET password = ?, is_verified = 1 WHERE email = ?',
            [hashedPassword, 'admin123@gmail.com']
        );

        if (result.affectedRows > 0) {
            console.log('Password reset successful for admin123@gmail.com');
        } else {
            console.log('User admin123@gmail.com not found. Checking for admin@library.com...');
            const [result2] = await connection.execute(
                'UPDATE users SET password = ?, is_verified = 1 WHERE email = ?',
                [hashedPassword, 'admin@library.com']
            );
            if (result2.affectedRows > 0) {
                console.log('Password reset successful for admin@library.com');
            }

            await connection.execute(
                'UPDATE users SET password = ?, is_verified = 1 WHERE email = ?',
                [hashedPassword, 'sagarchawan@library.com']
            );
            console.log('Password reset successful for sagarchawan@library.com');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

resetAdminPassword();
