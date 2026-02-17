const db = require('./config/db');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();

const seed = async () => {
    if (!process.env.DB_PASSWORD && process.env.DB_PASSWORD !== '') {
        console.log('⚠️  Warning: DB_PASSWORD is undefined in .env');
    }

    try {
        console.log('🌱 Starting database seed...');

        // 1. Create Admin User
        const adminEmail = 'admin@library.com';
        const [existingAdmin] = await db.query('SELECT * FROM users WHERE email = ?', [adminEmail]);

        if (existingAdmin.length === 0) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);
            await db.query(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                ['Super Admin', adminEmail, hashedPassword, 'admin']
            );
            console.log('✅ Admin account created: admin@library.com / admin123');
        } else {
            console.log('ℹ️  Admin account already exists');
        }

        // 2. Create Teachers
        const teachers = [
            { name: 'Sarah Wilson', email: 'sarah@school.com' },
            { name: 'Mike Johnson', email: 'mike@school.com' },
            { name: 'Emily Davis', email: 'emily@school.com' },
        ];

        for (const t of teachers) {
            const [exists] = await db.query('SELECT * FROM users WHERE email = ?', [t.email]);
            if (exists.length === 0) {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash('password123', salt);
                await db.query(
                    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                    [t.name, t.email, hashedPassword, 'teacher']
                );
                console.log(`✅ Teacher created: ${t.email}`);
            }
        }

        // 3. Create Books
        const books = [
            { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', qty: 5 },
            { title: 'To Kill a Mockingbird', author: 'Harper Lee', qty: 3 },
            { title: '1984', author: 'George Orwell', qty: 8 },
            { title: 'Pride and Prejudice', author: 'Jane Austen', qty: 4 },
            { title: 'The Catcher in the Rye', author: 'J.D. Salinger', qty: 5 },
            { title: 'The Hobbit', author: 'J.R.R. Tolkien', qty: 2 },
            { title: 'Fahrenheit 451', author: 'Ray Bradbury', qty: 6 },
            { title: 'Moby Dick', author: 'Herman Melville', qty: 3 },
            { title: 'War and Peace', author: 'Leo Tolstoy', qty: 2 },
            { title: 'The Odyssey', author: 'Homer', qty: 4 },
            { title: 'Hamlet', author: 'William Shakespeare', qty: 10 },
            { title: 'The Divine Comedy', author: 'Dante Alighieri', qty: 3 },
        ];

        for (const b of books) {
            const [exists] = await db.query('SELECT * FROM books WHERE book_name = ?', [b.title]);
            if (exists.length === 0) {
                await db.query(
                    'INSERT INTO books (book_name, author, total_quantity, available_quantity) VALUES (?, ?, ?, ?)',
                    [b.title, b.author, b.qty, b.qty]
                );
                console.log(`✅ Book added: ${b.title}`);
            }
        }

        console.log('✨ Seeding completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

seed();
