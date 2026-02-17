const db = require('../config/db');

// Get Leaderboards
exports.getLeaderboard = async (req, res) => {
    try {
        // 1. Top Readers (Based on completed book issues)
        // Adjust logic: Count issues where returned = TRUE
        const [topReaders] = await db.query(`
            SELECT u.id, u.name, u.profile_image, 
            COUNT(bi.id) as books_read
            FROM users u
            JOIN book_issues bi ON u.id = bi.user_id
            WHERE u.role = 'student' AND bi.returned = TRUE
            GROUP BY u.id
            ORDER BY books_read DESC
            LIMIT 5
        `);

        // 2. Exam Toppers (Based on highest average score or total score)
        const [examToppers] = await db.query(`
            SELECT u.id, u.name, u.profile_image,
            SUM(er.score) as total_score,
            COUNT(er.id) as exams_taken
            FROM users u
            JOIN exam_results er ON u.id = er.student_id
            WHERE u.role = 'student'
            GROUP BY u.id
            ORDER BY total_score DESC
            LIMIT 5
        `);

        res.json({ topReaders, examToppers });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching leaderboard', error: error.message });
    }
};
