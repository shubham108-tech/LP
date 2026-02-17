const db = require('./config/db');

async function upgradeDatabase() {
    try {
        console.log("Upgrading Database for New Features...");

        // 1. Notifications
        await db.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(50) DEFAULT 'info',
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log("-> 'notifications' table ready.");

        // 2. Reviews
        await db.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                book_id INT NOT NULL,
                user_id INT NOT NULL,
                rating INT CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log("-> 'reviews' table ready.");

        // 3. Fines (Add columns to book_issues if they don't exist)
        // We'll check if column exists first to avoid error
        const [columns] = await db.query(`SHOW COLUMNS FROM book_issues LIKE 'fine_amount'`);
        if (columns.length === 0) {
            await db.query(`ALTER TABLE book_issues ADD COLUMN fine_amount DECIMAL(10, 2) DEFAULT 0`);
            await db.query(`ALTER TABLE book_issues ADD COLUMN fine_status ENUM('none', 'pending', 'paid') DEFAULT 'none'`);
            console.log("-> 'book_issues' updated with fine columns.");
        } else {
            console.log("-> 'book_issues' already has fine columns.");
        }

        console.log("Database Upgrade Completed Successfully!");
        process.exit(0);

    } catch (error) {
        console.error("Upgrade Failed:", error);
        process.exit(1);
    }
}

upgradeDatabase();
