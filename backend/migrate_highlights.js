
const db = require('./config/db');

const up = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS book_highlights (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                book_id INT NOT NULL,
                page_number INT NOT NULL,
                highlights JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_highlight (user_id, book_id, page_number)
            )
        `);
        console.log('Highligths table created successfully');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
};

up();
