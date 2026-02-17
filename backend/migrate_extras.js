const db = require('./config/db');

const migrate = async () => {
    try {
        const connection = await db.getConnection();
        console.log('Connected to database for migration...');

        // 1. Create Reviews Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS book_reviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                book_id INT NOT NULL,
                user_id INT NOT NULL,
                rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
                review_text TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_book_review (user_id, book_id)
            )
        `);
        console.log('✅ Reviews table checked/created.');

        // 2. Create Discussions Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS discussions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                content TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Discussions table checked/created.');

        // 3. Create Discussion Replies Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS discussion_replies (
                id INT AUTO_INCREMENT PRIMARY KEY,
                discussion_id INT NOT NULL,
                user_id INT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (discussion_id) REFERENCES discussions(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Discussion Replies table checked/created.');

        connection.release();
        console.log('🎉 Migration successful.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

migrate();
