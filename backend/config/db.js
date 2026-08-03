const mysql = require('mysql2');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

dotenv.config();

let useFallback = false;
let dbData = null;
let dbFilePath = null;

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
        console.log('⚠️ MySQL Connection unavailable. Falling back to Portable Pure-JS Engine...');
        useFallback = true;
        initPureJsFallback();
    }
})();

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
    console.log(`✅ Portable Pure-JS Database Engine ready at ${dbFilePath}`);
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
        if (!useFallback) {
            try {
                return await promisePool.query(sql, params);
            } catch (mysqlErr) {
                useFallback = true;
                if (!dbData) initPureJsFallback();
            }
        }

        if (!dbData) initPureJsFallback();

        const sqlUpper = sql.trim().toUpperCase();

        // 1. CREATE TABLE / ALTER TABLE
        if (sqlUpper.startsWith('CREATE TABLE') || sqlUpper.startsWith('ALTER TABLE') || sqlUpper.startsWith('USE') || sqlUpper.startsWith('CREATE DATABASE')) {
            const tableMatch = sql.match(/CREATE TABLE (IF NOT EXISTS )?`?([a-zA-Z0-9_]+)`?/i);
            if (tableMatch && tableMatch[2]) {
                const tableName = tableMatch[2];
                if (!dbData[tableName]) dbData[tableName] = [];
                savePureJsData();
            }
            return [[], []];
        }

        // 2. SELECT QUERIES
        if (sqlUpper.startsWith('SELECT')) {
            let table = 'users';
            if (sqlUpper.includes('FROM BOOKS')) table = 'books';
            else if (sqlUpper.includes('FROM STATIONARY_ITEMS')) table = 'stationary_items';
            else if (sqlUpper.includes('FROM STATIONARY_REQUESTS')) table = 'stationary_requests';
            else if (sqlUpper.includes('FROM STATIONARY_LEDGER')) table = 'stationary_ledger';
            else if (sqlUpper.includes('FROM BOOK_REQUESTS')) table = 'book_requests';
            else if (sqlUpper.includes('FROM BOOK_ISSUES')) table = 'book_issues';

            let items = dbData[table] || [];

            // Simple WHERE filtering
            if (sqlUpper.includes('WHERE EMAIL = ?') && params.length > 0) {
                items = items.filter(u => u.email === params[0]);
            } else if (sqlUpper.includes('WHERE ID = ?') && params.length > 0) {
                items = items.filter(u => u.id === Number(params[0]));
            } else if (sqlUpper.includes('WHERE ITEM_NAME = ?') && params.length > 0) {
                items = items.filter(u => u.item_name === params[0]);
            } else if (sqlUpper.includes('WHERE BOOK_NAME = ?') && params.length > 0) {
                items = items.filter(u => u.book_name === params[0]);
            }

            // Handle SELECT COUNT(*)
            if (sqlUpper.includes('COUNT(*)')) {
                return [[{ count: items.length, 'COUNT(*)': items.length }], []];
            }

            return [JSON.parse(JSON.stringify(items)), []];
        }

        // 3. INSERT QUERIES
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

        // 4. UPDATE / DELETE QUERIES
        if (sqlUpper.startsWith('UPDATE') || sqlUpper.startsWith('DELETE')) {
            savePureJsData();
            return [{ insertId: 0, affectedRows: 1 }, []];
        }

        return [[], []];
    }
};

module.exports = dbWrapper;
