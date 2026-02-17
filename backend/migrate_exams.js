const db = require('./config/db');

async function createExamTables() {
    try {
        console.log("Creating/Updating Exam System Tables...");

        // 1. EXAMS
        await db.query(`
            CREATE TABLE IF NOT EXISTS exams (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                duration_minutes INT DEFAULT 60,
                total_marks INT DEFAULT 100,
                passing_marks INT DEFAULT 33,
                start_time DATETIME,
                end_time DATETIME,
                branch VARCHAR(100),
                created_by INT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log("-> 'exams' table checked/created.");

        // 2. QUESTIONS
        await db.query(`
            CREATE TABLE IF NOT EXISTS questions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                exam_id INT,
                question_text TEXT NOT NULL,
                option_a VARCHAR(255) NOT NULL,
                option_b VARCHAR(255) NOT NULL,
                option_c VARCHAR(255) NOT NULL,
                option_d VARCHAR(255) NOT NULL,
                correct_option ENUM('a', 'b', 'c', 'd') NOT NULL,
                marks INT DEFAULT 1,
                FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
            )
        `);
        console.log("-> 'questions' table checked/created.");

        // 3. EXAM RESULTS
        await db.query(`
            CREATE TABLE IF NOT EXISTS exam_results (
                id INT AUTO_INCREMENT PRIMARY KEY,
                exam_id INT,
                student_id INT,
                score INT DEFAULT 0,
                total_questions INT DEFAULT 0,
                correct_answers INT DEFAULT 0,
                wrong_answers INT DEFAULT 0,
                status ENUM('pass', 'fail') DEFAULT 'fail',
                completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_attempt (exam_id, student_id)
            )
        `);
        console.log("-> 'exam_results' table checked/created.");

        console.log("Exam System Database Migration Completed Successfully!");
        process.exit(0);

    } catch (error) {
        console.error("Migration Failed:", error);
        process.exit(1);
    }
}

createExamTables();
