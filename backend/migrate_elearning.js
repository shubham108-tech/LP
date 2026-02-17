const db = require('./config/db');

async function createELearningTables() {
    try {
        console.log("Creating/Updating E-Learning Tables...");

        // 1. NOTES (Study Material)
        await db.query(`
            CREATE TABLE IF NOT EXISTS notes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                file_url VARCHAR(255),
                branch VARCHAR(100),
                subject VARCHAR(100),
                uploaded_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log("-> 'notes' table checked/created.");

        // 2. ASSIGNMENTS
        await db.query(`
            CREATE TABLE IF NOT EXISTS assignments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                due_date DATETIME,
                branch VARCHAR(100),
                subject VARCHAR(100),
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log("-> 'assignments' table checked/created.");

        // 3. SUBMISSIONS
        await db.query(`
            CREATE TABLE IF NOT EXISTS assignment_submissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                assignment_id INT,
                student_id INT,
                file_url VARCHAR(255),
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                grade VARCHAR(50),
                feedback TEXT,
                FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log("-> 'assignment_submissions' table checked/created.");

        // 4. SCHEDULES (Class/Exam Timetables)
        await db.query(`
            CREATE TABLE IF NOT EXISTS schedules (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                type ENUM('class', 'exam', 'event') DEFAULT 'class',
                start_time DATETIME NOT NULL,
                end_time DATETIME NOT NULL,
                description TEXT,
                branch VARCHAR(100),
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log("-> 'schedules' table checked/created.");

        console.log("E-Learning Database Migration Completed Successfully!");
        process.exit(0);

    } catch (error) {
        console.error("Migration Failed:", error);
        process.exit(1);
    }
}

createELearningTables();
