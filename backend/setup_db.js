const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

dotenv.config();

const setup = async () => {
    console.log('🚀 Starting Automated Database Setup...');

    // Config for connecting WITHOUT database selected (to create it)
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD, // Can be undefined/empty
        multipleStatements: true
    };

    // Adjust empty password
    if (config.password === '') delete config.password;

    let connection;

    try {
        // 1. Connect to MySQL Server
        console.log('🔌 Connecting to MySQL server...');
        try {
            connection = await mysql.createConnection(config);
            console.log('✅ Connected to MySQL server.');
        } catch (err) {
            if (err.code === 'ER_ACCESS_DENIED_ERROR') {
                console.error('❌ Access Denied: Incorrect Username or Password.');
                console.error('👉 Please update backend/.env with your MySQL DB_PASSWORD.');
            } else {
                console.error('❌ Connection Failed:', err.message);
            }
            process.exit(1);
        }

        // 2. Create Database
        console.log(`🔨 Creating database '${process.env.DB_NAME}' if not exists...`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
        await connection.query(`USE \`${process.env.DB_NAME}\`;`);
        console.log('✅ Database selected.');

        // 3. Run Schema
        console.log('📜 Applying schema...');
        const schemaPath = path.join(__dirname, 'models', 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await connection.query(schemaSql);
        console.log('✅ Schema applied successfully.');

        // 4. Run Seed
        console.log('🌱 Seeding initial data...');

        // Check for Admin
        const adminEmail = 'admin@library.com';
        const [existingAdmin] = await connection.query('SELECT * FROM users WHERE email = ?', [adminEmail]);

        if (existingAdmin.length === 0) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);
            await connection.query(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                ['Super Admin', adminEmail, hashedPassword, 'admin']
            );
            console.log('   👤 Admin created (admin123)');
        }

        // Check for Books
        const [books] = await connection.query('SELECT COUNT(*) as count FROM books');
        if (books[0].count === 0) {
            const initialBooks = [
                ['The Great Gatsby', 'F. Scott Fitzgerald', 5, 5],
                ['To Kill a Mockingbird', 'Harper Lee', 3, 3],
                ['1984', 'George Orwell', 8, 8],
                ['The Hobbit', 'J.R.R. Tolkien', 4, 4],
                ['Project Hail Mary', 'Andy Weir', 6, 6]
            ];

            await connection.query(
                'INSERT INTO books (book_name, author, total_quantity, available_quantity) VALUES ?',
                [initialBooks]
            );
            console.log('   📚 Books inserted.');
        }

        console.log('\n🎉 CHECK COMPLETE: Database is ready for use!');

    } catch (error) {
        console.error('❌ Setup Error:', error);
    } finally {
        if (connection) await connection.end();
        process.exit(0);
    }
};

setup();
