const db = require('./config/db');

const migrate = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS suggestions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                book_name VARCHAR(255) NOT NULL,
                author VARCHAR(255) NOT NULL,
                reference_link VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('Suggestions table created successfully');
        process.exit();
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
