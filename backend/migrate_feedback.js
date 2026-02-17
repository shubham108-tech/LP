const db = require('./config/db');

async function createFeedbackTable() {
    try {
        console.log("Creating Feedback Table...");

        await db.query(`
            CREATE TABLE IF NOT EXISTS feedback (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                message TEXT NOT NULL,
                type ENUM('bug', 'suggestion', 'other') DEFAULT 'other',
                status ENUM('pending', 'acknowledged', 'resolved') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        console.log("Feedback table created/checked successfully.");
        process.exit(0);

    } catch (error) {
        console.error("Migration Failed:", error);
        process.exit(1);
    }
}

createFeedbackTable();
