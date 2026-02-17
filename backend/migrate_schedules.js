const db = require('./config/db');

async function createScheduleTable() {
    try {
        console.log("Creating Schedules Table...");

        await db.query(`
            CREATE TABLE IF NOT EXISTS schedules (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                type ENUM('class', 'exam', 'event') DEFAULT 'class',
                start_time DATETIME NOT NULL,
                end_time DATETIME NOT NULL,
                description TEXT,
                branch VARCHAR(50),
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);

        console.log("Schedules table created successfully.");
        process.exit(0);

    } catch (error) {
        console.error("Migration Failed:", error);
        process.exit(1);
    }
}

createScheduleTable();
