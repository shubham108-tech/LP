const db = require('./config/db');

const migrate = async () => {
    try {
        console.log('🚀 Starting Stationary Migration...');

        // 1. Create stationary_items table
        console.log('📦 Creating stationary_items table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS stationary_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                item_name VARCHAR(255) NOT NULL,
                category ENUM('Consumable', 'Returnable') DEFAULT 'Consumable',
                total_stock INT DEFAULT 0,
                available_stock INT DEFAULT 0,
                min_stock_limit INT DEFAULT 5,
                unit VARCHAR(50) DEFAULT 'pcs',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ stationary_items table ready.');

        // 2. Create stationary_requests table
        console.log('📝 Creating stationary_requests table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS stationary_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                item_id INT NOT NULL,
                quantity INT NOT NULL DEFAULT 1,
                reason TEXT,
                status ENUM('Pending', 'Approved', 'Rejected', 'Returned') DEFAULT 'Pending',
                requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                acted_at TIMESTAMP NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (item_id) REFERENCES stationary_items(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ stationary_requests table ready.');

        console.log('🎉 Migration successful.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

migrate();
