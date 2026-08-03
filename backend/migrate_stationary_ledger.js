const db = require('./config/db');
const dotenv = require('dotenv');
dotenv.config();

const initialItems = [
    { item_name: 'Blue Ballpoint Pens (Box of 10)', category: 'Consumable', total_stock: 100, min_stock_limit: 20, unit: 'boxes', bill_number: 'BILL-2026-001' },
    { item_name: 'Black Gel Pens (Box of 10)', category: 'Consumable', total_stock: 80, min_stock_limit: 15, unit: 'boxes', bill_number: 'BILL-2026-001' },
    { item_name: 'A4 Paper Rim (500 Sheets)', category: 'Consumable', total_stock: 50, min_stock_limit: 10, unit: 'rims', bill_number: 'BILL-2026-002' },
    { item_name: 'Whiteboard Markers (Set of 4)', category: 'Consumable', total_stock: 60, min_stock_limit: 10, unit: 'sets', bill_number: 'BILL-2026-003' },
    { item_name: 'Attendance Register Notebook', category: 'Consumable', total_stock: 40, min_stock_limit: 5, unit: 'pcs', bill_number: 'BILL-2026-004' },
    { item_name: 'Heavy Duty Stapler & Pins Box', category: 'Returnable', total_stock: 25, min_stock_limit: 5, unit: 'sets', bill_number: 'BILL-2026-005' },
    { item_name: 'Sticky Notes Pad (Yellow)', category: 'Consumable', total_stock: 90, min_stock_limit: 15, unit: 'pads', bill_number: 'BILL-2026-006' },
    { item_name: 'Plastic File Folders', category: 'Consumable', total_stock: 150, min_stock_limit: 30, unit: 'pcs', bill_number: 'BILL-2026-007' },
    { item_name: 'Highlighters Pack (4 Colors)', category: 'Consumable', total_stock: 45, min_stock_limit: 10, unit: 'packs', bill_number: 'BILL-2026-008' },
    { item_name: 'Whiteboard Duster / Eraser', category: 'Returnable', total_stock: 30, min_stock_limit: 5, unit: 'pcs', bill_number: 'BILL-2026-009' },
    { item_name: 'Scissors Stainless Steel', category: 'Returnable', total_stock: 20, min_stock_limit: 3, unit: 'pcs', bill_number: 'BILL-2026-010' },
    { item_name: 'Glue Stick (21g)', category: 'Consumable', total_stock: 70, min_stock_limit: 10, unit: 'pcs', bill_number: 'BILL-2026-011' },
    { item_name: 'Correction Tape Roll', category: 'Consumable', total_stock: 40, min_stock_limit: 8, unit: 'pcs', bill_number: 'BILL-2026-012' },
    { item_name: 'Paper Clips & Binder Clips Box', category: 'Consumable', total_stock: 60, min_stock_limit: 10, unit: 'boxes', bill_number: 'BILL-2026-013' },
    { item_name: 'Permanent Markers (Black/Red)', category: 'Consumable', total_stock: 50, min_stock_limit: 10, unit: 'pcs', bill_number: 'BILL-2026-014' }
];

async function migrate() {
    try {
        console.log('🚀 Starting Stationary Ledger Migration...');

        // 1. Ensure bill_number column exists in stationary_items
        try {
            await db.query('ALTER TABLE stationary_items ADD COLUMN bill_number VARCHAR(100)');
            console.log('✅ Added bill_number column to stationary_items');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ bill_number column already exists');
            } else {
                console.log('Note on bill_number column:', e.message);
            }
        }

        // 2. Create stationary_ledger table
        console.log('📦 Creating stationary_ledger table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS stationary_ledger (
                id INT AUTO_INCREMENT PRIMARY KEY,
                item_id INT NOT NULL,
                transaction_type ENUM('RECEIVED', 'ISSUED', 'RETURNED', 'ADJUSTMENT') NOT NULL,
                received_qty INT DEFAULT 0,
                issued_qty INT DEFAULT 0,
                previous_balance INT NOT NULL DEFAULT 0,
                new_balance INT NOT NULL DEFAULT 0,
                reference_no VARCHAR(255) NULL,
                user_id INT NULL,
                notes TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (item_id) REFERENCES stationary_items(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log('✅ stationary_ledger table created/verified.');

        // 3. Seed items that don't exist yet
        let addedCount = 0;
        for (const item of initialItems) {
            const [check] = await db.query('SELECT id FROM stationary_items WHERE item_name = ?', [item.item_name]);
            if (check.length === 0) {
                const [result] = await db.query(
                    'INSERT INTO stationary_items (item_name, category, total_stock, available_stock, min_stock_limit, unit, bill_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [item.item_name, item.category, item.total_stock, item.total_stock, item.min_stock_limit, item.unit, item.bill_number]
                );

                // Add ledger entry
                await db.query(
                    `INSERT INTO stationary_ledger 
                    (item_id, transaction_type, received_qty, issued_qty, previous_balance, new_balance, reference_no, notes)
                    VALUES (?, 'RECEIVED', ?, 0, 0, ?, ?, 'Initial Stock Received')`,
                    [result.insertId, item.total_stock, item.total_stock, item.bill_number]
                );
                addedCount++;
            }
        }
        console.log(`✅ Seeded ${addedCount} missing standard items into inventory with initial ledger entries.`);

        console.log('🎉 Stationary Ledger Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
