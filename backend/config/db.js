const mysql = require('mysql2');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

dotenv.config();

let usePureJs = true; // Default to safe pure JS mode on serverless unless MySQL configured
let promisePool = null;
let memoryDb = null;

// Only attempt MySQL pool creation if explicit cloud DB_HOST is provided
if (process.env.DB_HOST && process.env.DB_HOST !== 'localhost') {
    try {
        const mysqlPool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'library_db',
            port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0
        });
        promisePool = mysqlPool.promise();
        usePureJs = false;
        console.log('✅ Configured Cloud MySQL connection pool.');
    } catch (e) {
        console.log('⚠️ MySQL initialization failed. Using Pure JS Portable DB:', e.message);
        usePureJs = true;
    }
}

async function initPureJsDb() {
    if (memoryDb) return;

    const dbPath = process.env.VERCEL 
        ? path.join('/tmp', 'database.json')
        : path.join(__dirname, '..', 'database.json');

    let data = {
        users: [],
        books: [],
        stationary_items: [],
        stationary_requests: [],
        stationary_ledger: []
    };

    if (fs.existsSync(dbPath)) {
        try {
            data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        } catch (e) {
            console.log('Creating fresh JSON DB');
        }
    }

    // Seed default users if empty
    if (!data.users || data.users.length === 0) {
        const hashAdmin = await bcrypt.hash('admin123', 10);
        const hashPass = await bcrypt.hash('password123', 10);

        data.users = [
            { id: 1, name: 'System Admin', email: 'admin@library.com', password: hashAdmin, role: 'admin', is_verified: 1, created_at: new Date().toISOString() },
            { id: 2, name: 'HOD Engineering', email: 'sagar@library.com', password: hashPass, role: 'hod', is_verified: 1, created_at: new Date().toISOString() },
            { id: 3, name: 'Prof. Powar', email: 'powar@library.com', password: hashPass, role: 'teacher', is_verified: 1, created_at: new Date().toISOString() },
            { id: 4, name: 'Shubham Bhendavade', email: 'shubham@library.com', password: hashPass, role: 'student', is_verified: 1, created_at: new Date().toISOString() }
        ];
    }

    // Seed default stationary items if empty
    if (!data.stationary_items || data.stationary_items.length === 0) {
        data.stationary_items = [
            { id: 1, item_name: 'Blue Ballpoint Pens (Box of 10)', category: 'Consumable', total_stock: 100, available_stock: 100, min_stock_limit: 20, unit: 'boxes', bill_number: 'BILL-2026-001' },
            { id: 2, item_name: 'Black Gel Pens (Box of 10)', category: 'Consumable', total_stock: 80, available_stock: 80, min_stock_limit: 15, unit: 'boxes', bill_number: 'BILL-2026-001' },
            { id: 3, item_name: 'A4 Paper Rim (500 Sheets)', category: 'Consumable', total_stock: 50, available_stock: 50, min_stock_limit: 10, unit: 'rims', bill_number: 'BILL-2026-002' },
            { id: 4, item_name: 'Whiteboard Markers (Set of 4)', category: 'Consumable', total_stock: 60, available_stock: 60, min_stock_limit: 10, unit: 'sets', bill_number: 'BILL-2026-003' },
            { id: 5, item_name: 'Attendance Register Notebook', category: 'Consumable', total_stock: 40, available_stock: 40, min_stock_limit: 5, unit: 'pcs', bill_number: 'BILL-2026-004' }
        ];
    }

    // Seed default books if empty
    if (!data.books || data.books.length === 0) {
        data.books = [
            { id: 1, book_name: 'The Great Gatsby', author: 'F. Scott Fitzgerald', category: 'General', total_quantity: 5, available_quantity: 5 },
            { id: 2, book_name: 'To Kill a Mockingbird', author: 'Harper Lee', category: 'General', total_quantity: 3, available_quantity: 3 },
            { id: 3, book_name: '1984', author: 'George Orwell', category: 'General', total_quantity: 8, available_quantity: 8 },
            { id: 4, book_name: 'The Hobbit', author: 'J.R.R. Tolkien', category: 'General', total_quantity: 4, available_quantity: 4 },
            { id: 5, book_name: 'Project Hail Mary', author: 'Andy Weir', category: 'General', total_quantity: 6, available_quantity: 6 }
        ];
    }

    memoryDb = { data, dbPath };
    saveJsonDb();
}

function saveJsonDb() {
    if (!memoryDb) return;
    try {
        fs.writeFileSync(memoryDb.dbPath, JSON.stringify(memoryDb.data, null, 2));
    } catch (e) {
        // Ignored on read-only environments
    }
}

// Universal query interface matching mysql2 promise API: [rows, fields]
const dbWrapper = {
    async query(sql, params = []) {
        if (!usePureJs && promisePool) {
            try {
                return await promisePool.query(sql, params);
            } catch (mysqlErr) {
                console.log('MySQL query failed, falling back to Pure JS DB:', mysqlErr.message);
                usePureJs = true;
                await initPureJsDb();
            }
        }

        if (!memoryDb) await initPureJsDb();

        const cleanSql = sql.trim().replace(/\s+/g, ' ');
        const upperSql = cleanSql.toUpperCase();

        // 1. SELECT Query Processing
        if (upperSql.startsWith('SELECT')) {
            let table = 'users';
            if (upperSql.includes('FROM USERS')) table = 'users';
            else if (upperSql.includes('FROM BOOKS')) table = 'books';
            else if (upperSql.includes('FROM STATIONARY_ITEMS')) table = 'stationary_items';
            else if (upperSql.includes('FROM STATIONARY_REQUESTS')) table = 'stationary_requests';
            else if (upperSql.includes('FROM STATIONARY_LEDGER')) table = 'stationary_ledger';

            let list = [...(memoryDb.data[table] || [])];

            // WHERE email = ?
            if (upperSql.includes('WHERE EMAIL = ?') && params.length > 0) {
                list = list.filter(item => item.email && item.email.toLowerCase() === String(params[0]).toLowerCase());
            }
            // WHERE id = ?
            else if (upperSql.includes('WHERE ID = ?') && params.length > 0) {
                list = list.filter(item => item.id == params[0]);
            }
            // WHERE user_id = ?
            else if (upperSql.includes('WHERE USER_ID = ?') && params.length > 0) {
                list = list.filter(item => item.user_id == params[0]);
            }

            // COUNT(*) aggregation check
            if (upperSql.includes('COUNT(*)')) {
                return [[{ count: list.length, 'COUNT(*)': list.length }], []];
            }

            return [list, []];
        }

        // 2. INSERT Query Processing
        if (upperSql.startsWith('INSERT INTO')) {
            let table = 'users';
            if (upperSql.includes('INTO USERS')) table = 'users';
            else if (upperSql.includes('INTO BOOKS')) table = 'books';
            else if (upperSql.includes('INTO STATIONARY_ITEMS')) table = 'stationary_items';
            else if (upperSql.includes('INTO STATIONARY_REQUESTS')) table = 'stationary_requests';
            else if (upperSql.includes('INTO STATIONARY_LEDGER')) table = 'stationary_ledger';

            const newId = (memoryDb.data[table].length > 0 ? Math.max(...memoryDb.data[table].map(i => i.id || 0)) : 0) + 1;
            let newItem = { id: newId, created_at: new Date().toISOString() };

            if (table === 'users') {
                newItem = {
                    ...newItem,
                    name: params[0] || 'User',
                    email: params[1] || '',
                    password: params[2] || '',
                    role: params[3] || 'student',
                    branch: params[4] || null,
                    year: params[5] || null,
                    division: params[6] || null,
                    is_verified: params[7] !== undefined ? params[7] : 1,
                    profile_image: params[8] || null
                };
            } else if (table === 'stationary_requests') {
                newItem = {
                    ...newItem,
                    user_id: params[0],
                    item_id: params[1],
                    quantity: params[2] || 1,
                    reason: params[3] || '',
                    status: 'Pending',
                    requested_at: new Date().toISOString()
                };
            } else if (table === 'stationary_ledger') {
                newItem = {
                    ...newItem,
                    item_id: params[0],
                    transaction_type: params[1],
                    received_qty: params[2] || 0,
                    issued_qty: params[3] || 0,
                    previous_balance: params[4] || 0,
                    new_balance: params[5] || 0,
                    reference_no: params[6] || '',
                    user_id: params[7] || null,
                    notes: params[8] || ''
                };
            } else {
                newItem = { ...newItem, params };
            }

            memoryDb.data[table].push(newItem);
            saveJsonDb();

            return [{ insertId: newId, affectedRows: 1 }, []];
        }

        // 3. UPDATE Query Processing
        if (upperSql.startsWith('UPDATE')) {
            let table = 'users';
            if (upperSql.includes('UPDATE USERS')) table = 'users';
            else if (upperSql.includes('UPDATE BOOKS')) table = 'books';
            else if (upperSql.includes('UPDATE STATIONARY_ITEMS')) table = 'stationary_items';
            else if (upperSql.includes('UPDATE STATIONARY_REQUESTS')) table = 'stationary_requests';

            const lastParam = params[params.length - 1];
            if (lastParam) {
                const target = memoryDb.data[table].find(i => i.id == lastParam);
                if (target && upperSql.includes('STATUS = ?')) {
                    target.status = params[0];
                    target.acted_at = new Date().toISOString();
                }
            }
            saveJsonDb();
            return [{ affectedRows: 1 }, []];
        }

        // 4. DELETE Query Processing
        if (upperSql.startsWith('DELETE')) {
            return [{ affectedRows: 1 }, []];
        }

        return [[], []];
    }
};

module.exports = dbWrapper;
