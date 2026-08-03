const mysql = require('mysql2');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

dotenv.config();

let useSqlite = false;
let sqliteDb = null;

const mysqlPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
    database: process.env.DB_NAME || 'library_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promisePool = mysqlPool.promise();

// Check MySQL connection asynchronously on startup
(async () => {
    try {
        if (!process.env.DB_HOST && process.env.VERCEL) {
            throw new Error('No DB_HOST configured on Vercel environment');
        }
        await promisePool.query('SELECT 1');
        console.log('✅ Connected to MySQL Database.');
    } catch (err) {
        console.log('⚠️ MySQL Connection unavailable. Falling back to portable SQLite Database...');
        useSqlite = true;
        await initSqliteFallback();
    }
})();

async function initSqliteFallback() {
    const dbPath = process.env.VERCEL 
        ? path.join('/tmp', 'database.sqlite')
        : path.join(__dirname, '..', 'database.sqlite');

    sqliteDb = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    console.log(`✅ SQLite Database ready at ${dbPath}`);

    // Create tables
    await sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'student',
            branch TEXT DEFAULT NULL,
            year TEXT DEFAULT NULL,
            division TEXT DEFAULT NULL,
            phone_number TEXT,
            otp TEXT,
            otp_expiry DATETIME,
            is_verified BOOLEAN DEFAULT 1,
            profile_image TEXT DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_name TEXT NOT NULL,
            author TEXT NOT NULL,
            category TEXT DEFAULT 'General',
            total_quantity INTEGER NOT NULL,
            available_quantity INTEGER NOT NULL,
            image_url TEXT DEFAULT NULL,
            pdf_url TEXT DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS stationary_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_name TEXT NOT NULL,
            category TEXT NOT NULL,
            total_stock INTEGER NOT NULL DEFAULT 0,
            available_stock INTEGER NOT NULL DEFAULT 0,
            min_stock_limit INTEGER NOT NULL DEFAULT 5,
            unit TEXT NOT NULL DEFAULT 'pcs',
            bill_number TEXT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS stationary_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            item_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            reason TEXT NULL,
            status TEXT NOT NULL DEFAULT 'Pending',
            requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            acted_at DATETIME NULL
        );

        CREATE TABLE IF NOT EXISTS stationary_ledger (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER NOT NULL,
            transaction_type TEXT NOT NULL,
            received_qty INTEGER DEFAULT 0,
            issued_qty INTEGER DEFAULT 0,
            previous_balance INTEGER NOT NULL DEFAULT 0,
            new_balance INTEGER NOT NULL DEFAULT 0,
            reference_no TEXT NULL,
            user_id INTEGER NULL,
            notes TEXT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Seed default accounts if empty
    const adminCheck = await sqliteDb.get("SELECT id FROM users WHERE email = ?", ['admin@library.com']);
    if (!adminCheck) {
        const hashAdmin = await bcrypt.hash('admin123', 10);
        const hashPass = await bcrypt.hash('password123', 10);

        await sqliteDb.run(
            "INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, ?, 1)",
            ['System Admin', 'admin@library.com', hashAdmin, 'admin']
        );
        await sqliteDb.run(
            "INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, ?, 1)",
            ['HOD Engineering', 'sagar@library.com', hashPass, 'hod']
        );
        await sqliteDb.run(
            "INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, ?, 1)",
            ['Prof. Powar', 'powar@library.com', hashPass, 'teacher']
        );
        await sqliteDb.run(
            "INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, ?, 1)",
            ['Shubham Bhendavade', 'shubham@library.com', hashPass, 'student']
        );
        console.log('✅ Demo accounts seeded in SQLite Database.');
    }

    // Seed default stationary items if empty
    const itemCheck = await sqliteDb.get("SELECT id FROM stationary_items LIMIT 1");
    if (!itemCheck) {
        const items = [
            ['Blue Ballpoint Pens (Box of 10)', 'Consumable', 100, 100, 20, 'boxes', 'BILL-2026-001'],
            ['Black Gel Pens (Box of 10)', 'Consumable', 80, 80, 15, 'boxes', 'BILL-2026-001'],
            ['A4 Paper Rim (500 Sheets)', 'Consumable', 50, 50, 10, 'rims', 'BILL-2026-002'],
            ['Whiteboard Markers (Set of 4)', 'Consumable', 60, 60, 10, 'sets', 'BILL-2026-003'],
            ['Attendance Register Notebook', 'Consumable', 40, 40, 5, 'pcs', 'BILL-2026-004']
        ];
        for (const item of items) {
            await sqliteDb.run(
                "INSERT INTO stationary_items (item_name, category, total_stock, available_stock, min_stock_limit, unit, bill_number) VALUES (?, ?, ?, ?, ?, ?, ?)",
                item
            );
        }
        console.log('✅ Demo stationary items seeded in SQLite Database.');
    }

    // Seed default books if empty
    const bookCheck = await sqliteDb.get("SELECT id FROM books LIMIT 1");
    if (!bookCheck) {
        const books = [
            ['The Great Gatsby', 'F. Scott Fitzgerald', 'General', 5, 5],
            ['To Kill a Mockingbird', 'Harper Lee', 'General', 3, 3],
            ['1984', 'George Orwell', 'General', 8, 8],
            ['The Hobbit', 'J.R.R. Tolkien', 'General', 4, 4],
            ['Project Hail Mary', 'Andy Weir', 'General', 6, 6]
        ];
        for (const b of books) {
            await sqliteDb.run(
                "INSERT INTO books (book_name, author, category, total_quantity, available_quantity) VALUES (?, ?, ?, ?, ?)",
                b
            );
        }
        console.log('✅ Demo books seeded in SQLite Database.');
    }
}

// Universal query interface matching mysql2 promise API: [rows, fields]
const dbWrapper = {
    async query(sql, params = []) {
        if (!useSqlite) {
            try {
                return await promisePool.query(sql, params);
            } catch (mysqlErr) {
                // Fallback to SQLite if MySQL query fails or connection is lost
                if (!sqliteDb) {
                    useSqlite = true;
                    await initSqliteFallback();
                } else {
                    useSqlite = true;
                }
            }
        }

        // SQLite Execution Mode
        if (!sqliteDb) {
            await initSqliteFallback();
        }

        // Sanitize SQL statement from MySQL specific syntax
        let cleanSql = sql
            .replace(/AUTO_INCREMENT/gi, 'AUTOINCREMENT')
            .replace(/CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP/gi, 'CURRENT_TIMESTAMP');

        const trimmedSql = cleanSql.trim().toUpperCase();

        if (trimmedSql.startsWith('SELECT') || trimmedSql.startsWith('SHOW') || trimmedSql.startsWith('PRAGMA')) {
            const rows = await sqliteDb.all(cleanSql, params);
            return [rows, []];
        } else {
            const result = await sqliteDb.run(cleanSql, params);
            return [{
                insertId: result.lastID,
                affectedRows: result.changes
            }, []];
        }
    }
};

module.exports = dbWrapper;
