const mysql = require('mysql2');
const { Pool: PgPool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

dotenv.config();

let dbMode = 'mysql'; // 'postgres', 'mysql', 'fallback'
let pgPool = null;
let mysqlPool = null;
let dbData = null;
let dbFilePath = null;

const pgUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
const isPg = Boolean(pgUrl || process.env.POSTGRES_HOST);

let initPgPromise = null;

if (isPg) {
    dbMode = 'postgres';
    console.log('⚡ Vercel Postgres Database environment detected!');
    pgPool = new PgPool({
        connectionString: pgUrl,
        ssl: { rejectUnauthorized: false }
    });
    initPgPromise = initPgSchema();
} else {
    mysqlPool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
        database: process.env.DB_NAME || 'library_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
    
    (async () => {
        try {
            if (!process.env.DB_HOST && process.env.VERCEL) {
                throw new Error('No DB_HOST configured on Vercel environment');
            }
            await mysqlPool.promise().query('SELECT 1');
            console.log('✅ Connected to MySQL Database.');
        } catch (err) {
            console.log('⚠️ MySQL/Postgres unavailable. Using Portable Pure-JS Engine...');
            dbMode = 'fallback';
            initPureJsFallback();
        }
    })();
}

async function initPgSchema() {
    try {
        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'student',
                branch VARCHAR(100),
                year VARCHAR(50),
                division VARCHAR(50),
                phone_number VARCHAR(20),
                otp VARCHAR(6),
                otp_expiry TIMESTAMP,
                is_verified BOOLEAN DEFAULT TRUE,
                profile_image VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS books (
                id SERIAL PRIMARY KEY,
                book_name VARCHAR(255) NOT NULL,
                author VARCHAR(255) NOT NULL,
                category VARCHAR(100) DEFAULT 'General',
                total_quantity INT NOT NULL,
                available_quantity INT NOT NULL,
                image_url VARCHAR(255),
                pdf_url VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS stationary_items (
                id SERIAL PRIMARY KEY,
                item_name VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL,
                total_stock INT NOT NULL DEFAULT 0,
                available_stock INT NOT NULL DEFAULT 0,
                min_stock_limit INT NOT NULL DEFAULT 5,
                unit VARCHAR(50) NOT NULL DEFAULT 'pcs',
                bill_number VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS stationary_requests (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL,
                item_id INT NOT NULL,
                quantity INT NOT NULL DEFAULT 1,
                reason TEXT,
                status VARCHAR(50) NOT NULL DEFAULT 'Pending',
                requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                acted_at TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS stationary_ledger (
                id SERIAL PRIMARY KEY,
                item_id INT NOT NULL,
                transaction_type VARCHAR(50) NOT NULL,
                received_qty INT DEFAULT 0,
                issued_qty INT DEFAULT 0,
                previous_balance INT NOT NULL DEFAULT 0,
                new_balance INT NOT NULL DEFAULT 0,
                reference_no VARCHAR(255),
                user_id INT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS book_issues (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL,
                book_id INT NOT NULL,
                issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                return_date TIMESTAMP,
                returned INT DEFAULT 0,
                status VARCHAR(50) DEFAULT 'issued',
                fine DECIMAL(10,2) DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS book_requests (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL,
                book_id INT NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS notes (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                subject VARCHAR(255),
                branch VARCHAR(100),
                year VARCHAR(50),
                semester VARCHAR(50),
                file_url VARCHAR(255),
                resource_type VARCHAR(50) DEFAULT 'note',
                uploaded_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS projects (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                branch VARCHAR(100),
                student_id INT,
                guide_id INT,
                file_url VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Check & Seed Admin in Vercel Postgres
        const adminRes = await pgPool.query("SELECT id FROM users WHERE email = 'admin@library.com'");
        if (adminRes.rows.length === 0) {
            const hashAdmin = bcrypt.hashSync('admin123', 10);
            const hashPass = bcrypt.hashSync('password123', 10);

            await pgPool.query(
                "INSERT INTO users (name, email, password, role, is_verified) VALUES ($1, $2, $3, $4, true)",
                ['System Admin', 'admin@library.com', hashAdmin, 'admin']
            );
            await pgPool.query(
                "INSERT INTO users (name, email, password, role, is_verified) VALUES ($1, $2, $3, $4, true)",
                ['HOD Engineering', 'sagar@library.com', hashPass, 'hod']
            );
            await pgPool.query(
                "INSERT INTO users (name, email, password, role, is_verified) VALUES ($1, $2, $3, $4, true)",
                ['Prof. Powar', 'powar@library.com', hashPass, 'teacher']
            );
            await pgPool.query(
                "INSERT INTO users (name, email, password, role, is_verified) VALUES ($1, $2, $3, $4, true)",
                ['Shubham Bhendavade', 'shubham@library.com', hashPass, 'student']
            );
            console.log('✅ Demo accounts seeded in Vercel Postgres Database!');
        }

        // Check & Seed Books in Vercel Postgres
        const booksRes = await pgPool.query("SELECT COUNT(*) FROM books");
        if (parseInt(booksRes.rows[0].count, 10) === 0) {
            const defaultBooks = [
                ['The Great Gatsby', 'F. Scott Fitzgerald', 'General', 5, 5],
                ['To Kill a Mockingbird', 'Harper Lee', 'General', 3, 3],
                ['1984', 'George Orwell', 'General', 8, 8],
                ['Pride and Prejudice', 'Jane Austen', 'General', 4, 4],
                ['The Catcher in the Rye', 'J.D. Salinger', 'General', 5, 5],
                ['The Hobbit', 'J.R.R. Tolkien', 'General', 2, 2],
                ['Fahrenheit 451', 'Ray Bradbury', 'General', 6, 6],
                ['Moby Dick', 'Herman Melville', 'General', 3, 3],
                ['War and Peace', 'Leo Tolstoy', 'General', 2, 2],
                ['The Odyssey', 'Homer', 'General', 4, 4],
                ['Hamlet', 'William Shakespeare', 'General', 10, 10]
            ];
            for (const b of defaultBooks) {
                await pgPool.query(
                    "INSERT INTO books (book_name, author, category, total_quantity, available_quantity) VALUES ($1, $2, $3, $4, $5)",
                    b
                );
            }
            console.log('✅ Demo books seeded in Vercel Postgres Database!');
        }

        // Check & Seed Stationary Items
        const statRes = await pgPool.query("SELECT COUNT(*) FROM stationary_items");
        if (parseInt(statRes.rows[0].count, 10) === 0) {
            const defaultStationary = [
                ['A4 Printing Paper (Rim)', 'Paper', 50, 50, 10, 'rim', 'BILL-101'],
                ['Whiteboard Marker (Black)', 'Writing', 100, 100, 20, 'pcs', 'BILL-102'],
                ['Blue Ball Pens (Box)', 'Writing', 30, 30, 5, 'box', 'BILL-103'],
                ['Stapler Machine No.10', 'Office', 15, 15, 3, 'pcs', 'BILL-104']
            ];
            for (const s of defaultStationary) {
                await pgPool.query(
                    "INSERT INTO stationary_items (item_name, category, total_stock, available_stock, min_stock_limit, unit, bill_number) VALUES ($1, $2, $3, $4, $5, $6, $7)",
                    s
                );
            }
            console.log('✅ Demo stationary items seeded in Vercel Postgres Database!');
        }
    } catch (e) {
        console.error('Vercel Postgres Init Error:', e.message);
    }
}

function initPureJsFallback() {
    dbFilePath = process.env.VERCEL
        ? path.join('/tmp', 'database.json')
        : path.join(__dirname, '..', 'database.json');

    if (fs.existsSync(dbFilePath)) {
        try {
            dbData = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
        } catch (e) {
            dbData = null;
        }
    }

    if (!dbData) {
        const hashAdmin = bcrypt.hashSync('admin123', 10);
        const hashPass = bcrypt.hashSync('password123', 10);

        dbData = {
            users: [
                { id: 1, name: 'System Admin', email: 'admin@library.com', password: hashAdmin, role: 'admin', is_verified: 1, created_at: new Date().toISOString() },
                { id: 2, name: 'HOD Engineering', email: 'sagar@library.com', password: hashPass, role: 'hod', is_verified: 1, created_at: new Date().toISOString() },
                { id: 3, name: 'Prof. Powar', email: 'powar@library.com', password: hashPass, role: 'teacher', is_verified: 1, created_at: new Date().toISOString() },
                { id: 4, name: 'Shubham Bhendavade', email: 'shubham@library.com', password: hashPass, role: 'student', is_verified: 1, created_at: new Date().toISOString() }
            ],
            books: [
                { id: 1, book_name: 'The Great Gatsby', author: 'F. Scott Fitzgerald', category: 'General', total_quantity: 5, available_quantity: 5, created_at: new Date().toISOString() },
                { id: 2, book_name: 'To Kill a Mockingbird', author: 'Harper Lee', category: 'General', total_quantity: 3, available_quantity: 3, created_at: new Date().toISOString() },
                { id: 3, book_name: '1984', author: 'George Orwell', category: 'General', total_quantity: 8, available_quantity: 8, created_at: new Date().toISOString() },
                { id: 4, book_name: 'The Hobbit', author: 'J.R.R. Tolkien', category: 'General', total_quantity: 4, available_quantity: 4, created_at: new Date().toISOString() },
                { id: 5, book_name: 'Project Hail Mary', author: 'Andy Weir', category: 'General', total_quantity: 6, available_quantity: 6, created_at: new Date().toISOString() }
            ],
            stationary_items: [
                { id: 1, item_name: 'Blue Ballpoint Pens (Box of 10)', category: 'Consumable', total_stock: 100, available_stock: 100, min_stock_limit: 20, unit: 'boxes', bill_number: 'BILL-2026-001', created_at: new Date().toISOString() },
                { id: 2, item_name: 'Black Gel Pens (Box of 10)', category: 'Consumable', total_stock: 80, available_stock: 80, min_stock_limit: 15, unit: 'boxes', bill_number: 'BILL-2026-001', created_at: new Date().toISOString() },
                { id: 3, item_name: 'A4 Paper Rim (500 Sheets)', category: 'Consumable', total_stock: 50, available_stock: 50, min_stock_limit: 10, unit: 'rims', bill_number: 'BILL-2026-002', created_at: new Date().toISOString() },
                { id: 4, item_name: 'Whiteboard Markers (Set of 4)', category: 'Consumable', total_stock: 60, available_stock: 60, min_stock_limit: 10, unit: 'sets', bill_number: 'BILL-2026-003', created_at: new Date().toISOString() },
                { id: 5, item_name: 'Attendance Register Notebook', category: 'Consumable', total_stock: 40, available_stock: 40, min_stock_limit: 5, unit: 'pcs', bill_number: 'BILL-2026-004', created_at: new Date().toISOString() }
            ],
            stationary_requests: [],
            stationary_ledger: [],
            book_requests: [],
            book_issues: []
        };
        savePureJsData();
    }
}

function savePureJsData() {
    try {
        fs.writeFileSync(dbFilePath, JSON.stringify(dbData, null, 2));
    } catch (e) {
        console.error('Failed to write database file:', e.message);
    }
}

// Universal query interface matching mysql2 promise API: [rows, fields]
const dbWrapper = {
    async query(sql, params = []) {
        if (dbMode === 'postgres' && pgPool) {
            if (initPgPromise) {
                await initPgPromise;
            }
            try {
                let countParamIndex = 1;
                let pgSql = sql.replace(/\?/g, () => `$${countParamIndex++}`);
                pgSql = pgSql.replace(/`([a-zA-Z0-9_]+)`/g, '"$1"');

                // MySQL to Postgres compatibility rewrites
                pgSql = pgSql.replace(/DATE_ADD\(([^,]+),\s*INTERVAL\s+(\d+)\s+DAY\)/gi, "($1 + INTERVAL '$2 days')");
                pgSql = pgSql.replace(/DATE_FORMAT\(([^,]+),\s*['"]%Y-%m['"]\)/gi, "TO_CHAR($1, 'YYYY-MM')");
                pgSql = pgSql.replace(/"admin"/g, "'admin'");
                pgSql = pgSql.replace(/"teacher"/g, "'teacher'");
                pgSql = pgSql.replace(/"student"/g, "'student'");

                const res = await pgPool.query(pgSql, params);
                if (pgSql.trim().toUpperCase().startsWith('INSERT')) {
                    return [{ insertId: res.rows[0]?.id || 1, affectedRows: res.rowCount }, []];
                }
                return [res.rows, res.fields];
            } catch (err) {
                console.error('Postgres Query Error:', err.message);
                throw err;
            }
        }

        if (dbMode === 'mysql') {
            try {
                return await mysqlPool.promise().query(sql, params);
            } catch (mysqlErr) {
                dbMode = 'fallback';
                if (!dbData) initPureJsFallback();
            }
        }

        // Pure JS Fallback Mode
        if (!dbData) initPureJsFallback();

        const sqlUpper = sql.trim().toUpperCase();

        if (sqlUpper.startsWith('CREATE TABLE') || sqlUpper.startsWith('ALTER TABLE') || sqlUpper.startsWith('USE') || sqlUpper.startsWith('CREATE DATABASE')) {
            const tableMatch = sql.match(/CREATE TABLE (IF NOT EXISTS )?`?([a-zA-Z0-9_]+)`?/i);
            if (tableMatch && tableMatch[2]) {
                const tableName = tableMatch[2];
                if (!dbData[tableName]) dbData[tableName] = [];
                savePureJsData();
            }
            return [[], []];
        }

        if (sqlUpper.startsWith('SELECT')) {
            let table = 'users';
            if (sqlUpper.includes('FROM BOOKS')) table = 'books';
            else if (sqlUpper.includes('FROM STATIONARY_ITEMS')) table = 'stationary_items';
            else if (sqlUpper.includes('FROM STATIONARY_REQUESTS')) table = 'stationary_requests';
            else if (sqlUpper.includes('FROM STATIONARY_LEDGER')) table = 'stationary_ledger';
            else if (sqlUpper.includes('FROM BOOK_REQUESTS')) table = 'book_requests';
            else if (sqlUpper.includes('FROM BOOK_ISSUES')) table = 'book_issues';

            let items = dbData[table] || [];

            if (sqlUpper.includes('WHERE EMAIL = ?') && params.length > 0) {
                items = items.filter(u => u.email === params[0]);
            } else if (sqlUpper.includes('WHERE ID = ?') && params.length > 0) {
                items = items.filter(u => u.id === Number(params[0]));
            } else if (sqlUpper.includes('WHERE ITEM_NAME = ?') && params.length > 0) {
                items = items.filter(u => u.item_name === params[0]);
            } else if (sqlUpper.includes('WHERE BOOK_NAME = ?') && params.length > 0) {
                items = items.filter(u => u.book_name === params[0]);
            }

            if (sqlUpper.includes('COUNT(*)')) {
                return [[{ count: items.length, 'COUNT(*)': items.length }], []];
            }

            return [JSON.parse(JSON.stringify(items)), []];
        }

        if (sqlUpper.startsWith('INSERT INTO')) {
            let table = 'users';
            if (sqlUpper.includes('INTO BOOKS')) table = 'books';
            else if (sqlUpper.includes('INTO STATIONARY_ITEMS')) table = 'stationary_items';
            else if (sqlUpper.includes('INTO STATIONARY_REQUESTS')) table = 'stationary_requests';
            else if (sqlUpper.includes('INTO STATIONARY_LEDGER')) table = 'stationary_ledger';
            else if (sqlUpper.includes('INTO BOOK_REQUESTS')) table = 'book_requests';
            else if (sqlUpper.includes('INTO BOOK_ISSUES')) table = 'book_issues';

            if (!dbData[table]) dbData[table] = [];

            const newId = dbData[table].length > 0 ? Math.max(...dbData[table].map(i => i.id || 0)) + 1 : 1;
            let newItem = { id: newId, created_at: new Date().toISOString() };

            if (table === 'users') {
                newItem.name = params[0] || 'User';
                newItem.email = params[1] || `user${newId}@library.com`;
                newItem.password = params[2] || '';
                newItem.role = params[3] || 'student';
                newItem.branch = params[4] || null;
                newItem.year = params[5] || null;
                newItem.division = params[6] || null;
                newItem.is_verified = params[7] !== undefined ? params[7] : 1;
                newItem.profile_image = params[8] || null;
            } else if (table === 'stationary_items') {
                newItem.item_name = params[0] || 'Item';
                newItem.category = params[1] || 'Consumable';
                newItem.total_stock = params[2] || 0;
                newItem.available_stock = params[3] || 0;
                newItem.min_stock_limit = params[4] || 5;
                newItem.unit = params[5] || 'pcs';
                newItem.bill_number = params[6] || null;
            } else if (table === 'books') {
                newItem.book_name = params[0] || 'Book';
                newItem.author = params[1] || 'Author';
                newItem.category = params[2] || 'General';
                newItem.total_quantity = params[3] || 1;
                newItem.available_quantity = params[4] || 1;
            } else {
                newItem.params = params;
            }

            dbData[table].push(newItem);
            savePureJsData();

            return [{ insertId: newId, affectedRows: 1 }, []];
        }

        if (sqlUpper.startsWith('UPDATE') || sqlUpper.startsWith('DELETE')) {
            savePureJsData();
            return [{ insertId: 0, affectedRows: 1 }, []];
        }

        return [[], []];
    }
};

module.exports = dbWrapper;
