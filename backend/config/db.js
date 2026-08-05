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
                stationary_blocked BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE users ADD COLUMN IF NOT EXISTS stationary_blocked BOOLEAN DEFAULT FALSE;

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
            ALTER TABLE books ALTER COLUMN image_url TYPE TEXT;
            ALTER TABLE books ALTER COLUMN pdf_url TYPE TEXT;

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
            unit VARCHAR(50) DEFAULT 'pcs',
            reason TEXT,
            status VARCHAR(50) NOT NULL DEFAULT 'Pending',
            requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            acted_at TIMESTAMP
        );
        ALTER TABLE stationary_requests ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'pcs';

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
                reason TEXT,
                reference_link TEXT,
                request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE book_requests ADD COLUMN IF NOT EXISTS reason TEXT;
            ALTER TABLE book_requests ADD COLUMN IF NOT EXISTS reference_link TEXT;

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

            CREATE TABLE IF NOT EXISTS reviews (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL,
                book_id INT NOT NULL,
                rating INT NOT NULL DEFAULT 5,
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS suggestions (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS discussions (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                content TEXT,
                category VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS feedback (
                id SERIAL PRIMARY KEY,
                user_id INT,
                subject VARCHAR(255),
                message TEXT,
                rating INT DEFAULT 5,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS exams (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                subject VARCHAR(255),
                branch VARCHAR(100),
                total_marks INT DEFAULT 100,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS exam_results (
                id SERIAL PRIMARY KEY,
                exam_id INT,
                student_id INT NOT NULL,
                score INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Ensure System Admin user exists in Postgres
        const adminRes = await pgPool.query("SELECT id FROM users WHERE email = 'admin@library.com'");
        if (adminRes.rows.length === 0) {
            const hashAdmin = bcrypt.hashSync('admin123', 10);
            await pgPool.query(
                "INSERT INTO users (name, email, password, role, is_verified) VALUES ($1, $2, $3, $4, true)",
                ['System Admin', 'admin@library.com', hashAdmin, 'admin']
            );
            console.log('✅ System Admin account created in Postgres Database!');
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
                { id: 3, book_name: '1984', author: 'George Orwell', category: 'General', total_quantity: 8, available_quantity: 8, created_at: new Date().toISOString() }
            ],
            stationary_items: [
                { id: 1, item_name: 'A4 Printing Paper (Rim)', category: 'Paper', total_stock: 50, available_stock: 50, min_stock_limit: 10, unit: 'rim', bill_number: 'BILL-101' },
                { id: 2, item_name: 'Whiteboard Marker (Black)', category: 'Writing', total_stock: 100, available_stock: 100, min_stock_limit: 20, unit: 'pcs', bill_number: 'BILL-102' }
            ],
            stationary_requests: [],
            stationary_ledger: [],
            book_issues: [],
            book_requests: [],
            notes: [],
            projects: [],
            reviews: [],
            suggestions: [],
            discussions: [],
            notifications: [],
            feedback: []
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

                if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
                    pgSql += ' RETURNING id';
                }

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
            else if (sqlUpper.includes('FROM NOTES')) table = 'notes';
            else if (sqlUpper.includes('FROM PROJECTS')) table = 'projects';

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
            else if (sqlUpper.includes('INTO NOTES')) table = 'notes';
            else if (sqlUpper.includes('INTO PROJECTS')) table = 'projects';

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
            } else if (table === 'books') {
                newItem.book_name = params[0] || 'Book';
                newItem.author = params[1] || 'Author';
                newItem.category = params[2] || 'General';
                newItem.total_quantity = parseInt(params[3]) || 1;
                newItem.available_quantity = params[4] !== undefined ? parseInt(params[4]) : newItem.total_quantity;
                newItem.image_url = params[5] || null;
                newItem.pdf_url = params[6] || null;
            } else {
                newItem.params = params;
            }

            dbData[table].push(newItem);
            savePureJsData();

            return [{ insertId: newId, affectedRows: 1 }, []];
        }

        if (sqlUpper.startsWith('UPDATE')) {
            if (sqlUpper.includes('UPDATE BOOKS') && params.length > 0) {
                const bookId = Number(params[params.length - 1]);
                const idx = dbData.books.findIndex(b => b.id === bookId);
                if (idx !== -1) {
                    if (params[0]) dbData.books[idx].book_name = params[0];
                    if (params[1]) dbData.books[idx].author = params[1];
                    if (params[2]) dbData.books[idx].category = params[2];
                    if (params[3]) dbData.books[idx].total_quantity = parseInt(params[3]);
                    if (params[4] !== undefined) dbData.books[idx].available_quantity = parseInt(params[4]);
                }
            }
            savePureJsData();
            return [{ insertId: 0, affectedRows: 1 }, []];
        }

        if (sqlUpper.startsWith('DELETE')) {
            if (sqlUpper.includes('FROM BOOKS WHERE ID = ?') && params.length > 0) {
                const bookId = Number(params[0]);
                dbData.books = dbData.books.filter(b => b.id !== bookId);
            }
            savePureJsData();
            return [{ insertId: 0, affectedRows: 1 }, []];
        }

        return [[], []];
    },

    async resetData() {
        if (dbMode === 'postgres' && pgPool) {
            const tables = [
                'feedback', 'notifications', 'discussions', 'suggestions', 'reviews',
                'stationary_ledger', 'stationary_requests', 'stationary_items', 
                'book_issues', 'book_requests', 'notes', 'projects', 'exam_results', 'exams', 'books', 'users'
            ];
            for (const t of tables) {
                try {
                    await pgPool.query(`TRUNCATE TABLE "${t}" RESTART IDENTITY CASCADE;`);
                } catch (e) {
                    console.log(`Table ${t} truncate skipped:`, e.message);
                }
            }
            // Seed ONLY 1 System Admin user
            const hashAdmin = bcrypt.hashSync('admin123', 10);
            await pgPool.query(
                "INSERT INTO users (id, name, email, password, role, is_verified) VALUES (1, $1, $2, $3, 'admin', true)",
                ['System Admin', 'admin@library.com', hashAdmin]
            );
            return true;
        }

        if (dbMode === 'mysql' && mysqlPool) {
            await mysqlPool.promise().query("SET FOREIGN_KEY_CHECKS = 0;");
            const tables = [
                'users', 'books', 'stationary_items', 'stationary_requests', 'stationary_ledger',
                'book_issues', 'book_requests', 'notes', 'projects', 'reviews', 'suggestions',
                'discussions', 'notifications', 'feedback'
            ];
            for (const t of tables) {
                try { await mysqlPool.promise().query(`TRUNCATE TABLE ${t};`); } catch (e) {}
            }
            await mysqlPool.promise().query("SET FOREIGN_KEY_CHECKS = 1;");
            const hashAdmin = bcrypt.hashSync('admin123', 10);
            await mysqlPool.promise().query(
                "INSERT INTO users (id, name, email, password, role, is_verified) VALUES (1, 'System Admin', 'admin@library.com', ?, 'admin', true)",
                [hashAdmin]
            );
            return true;
        }

        const hashAdmin = bcrypt.hashSync('admin123', 10);
        dbData = {
            users: [
                { id: 1, name: 'System Admin', email: 'admin@library.com', password: hashAdmin, role: 'admin', is_verified: 1, created_at: new Date().toISOString() }
            ],
            books: [],
            stationary_items: [],
            stationary_requests: [],
            stationary_ledger: [],
            book_issues: [],
            book_requests: [],
            notes: [],
            projects: [],
            reviews: [],
            suggestions: [],
            discussions: [],
            notifications: [],
            feedback: []
        };
        savePureJsData();
        return true;
    }
};

module.exports = dbWrapper;
