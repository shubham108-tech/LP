const db = require('../config/db');

// Get Leaderboards
exports.getLeaderboard = async (req, res) => {
    try {
        let topReaders = [];
        try {
            const [readers] = await db.query(`
                SELECT u.id, u.name, u.profile_image, 
                COUNT(bi.id) as books_read
                FROM users u
                JOIN book_issues bi ON u.id = bi.user_id
                WHERE u.role = 'student' AND (bi.returned = 1 OR bi.status = 'returned')
                GROUP BY u.id, u.name, u.profile_image
                ORDER BY books_read DESC
                LIMIT 5
            `);
            topReaders = readers || [];
        } catch (e) {
            console.error('Leaderboard topReaders error:', e.message);
        }

        let examToppers = [];
        try {
            const [toppers] = await db.query(`
                SELECT u.id, u.name, u.profile_image,
                COALESCE(SUM(er.score), 0) as total_score,
                COUNT(er.id) as exams_taken
                FROM users u
                JOIN exam_results er ON u.id = er.student_id
                WHERE u.role = 'student'
                GROUP BY u.id, u.name, u.profile_image
                ORDER BY total_score DESC
                LIMIT 5
            `);
            examToppers = toppers || [];
        } catch (e) {
            console.error('Leaderboard examToppers error:', e.message);
        }

        res.json({ topReaders, examToppers });
    } catch (error) {
        console.error('Leaderboard outer error:', error);
        res.status(500).json({ message: 'Error fetching leaderboard', error: error.message });
    }
};
