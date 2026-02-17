const db = require('./config/db');

const migrate = async () => {
    try {
        console.log('🔄 Starting Engagement Features Migration...');

        // 1. Create Reviews Table
        await db.query(`
            CREATE TABLE IF NOT EXISTS book_reviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                book_id INT NOT NULL,
                rating INT CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_book_review (user_id, book_id)
            )
        `);
        console.log('✅ Created book_reviews table');

        // 2. Create Wishlist Table
        await db.query(`
            CREATE TABLE IF NOT EXISTS book_wishlist (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                book_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_book_wishlist (user_id, book_id)
            )
        `);
        console.log('✅ Created book_wishlist table');

        // 3. Create Lost/Damaged Books Table
        await db.query(`
            CREATE TABLE IF NOT EXISTS report_damaged_lost (
                id INT AUTO_INCREMENT PRIMARY KEY,
                book_id INT NOT NULL,
                user_id INT, -- Optional, if linked to a user
                status ENUM('lost', 'damaged') NOT NULL,
                notes TEXT,
                fine_amount DECIMAL(10, 2) DEFAULT 0.00,
                reported_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log('✅ Created report_damaged_lost table');

        console.log('🎉 Migration successful!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

migrate();
