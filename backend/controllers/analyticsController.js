const db = require('../config/db');

// Get Analytics (Teacher)
exports.getAnalytics = async (req, res) => {
    try {
        // 1. Student Performance Overview (Top 5 Students by Avg Exam Score)
        const [topStudents] = await db.query(`
            SELECT u.name, u.email, AVG(er.score) as avg_score 
            FROM exam_results er 
            JOIN users u ON er.student_id = u.id 
            GROUP BY u.id 
            ORDER BY avg_score DESC 
            LIMIT 5
        `);

        // 2. Pass/Fail Ratio
        const [passFail] = await db.query(`
            SELECT 
                SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) as passed,
                SUM(CASE WHEN status = 'fail' THEN 1 ELSE 0 END) as failed
            FROM exam_results
        `);

        // 3. Recent Exam Performance (Avg Score per Exam)
        const [examPerformance] = await db.query(`
            SELECT e.title, AVG(er.score) as avg_score, MAX(er.score) as max_score
            FROM exam_results er
            JOIN exams e ON er.exam_id = e.id
            GROUP BY e.id
            ORDER BY e.created_at DESC
            LIMIT 5
        `);

        // 4. Assignment Submission Rates (Submissions vs Total Students per Assignment)
        // Note: Total students is hard to exact without "Class" grouping, so we'll just show submission count.
        const [assignmentStats] = await db.query(`
            SELECT a.title, COUNT(s.id) as submission_count
            FROM assignments a
            LEFT JOIN assignment_submissions s ON a.id = s.assignment_id
            GROUP BY a.id
            ORDER BY a.created_at DESC
            LIMIT 5
        `);

        // 5. Batch Performance (Global Context)
        const [batchStats] = await db.query(`
            SELECT e.batch, AVG(er.score) as avg_score 
            FROM exam_results er
            JOIN exams e ON er.exam_id = e.id
            WHERE e.batch IS NOT NULL AND e.batch != ''
            GROUP BY e.batch
            ORDER BY e.batch DESC
        `);

        // 6. Division Performance
        const [divisionStats] = await db.query(`
            SELECT e.division, AVG(er.score) as avg_score 
            FROM exam_results er
            JOIN exams e ON er.exam_id = e.id
            WHERE e.division IS NOT NULL AND e.division != ''
            GROUP BY e.division
            ORDER BY e.division ASC
        `);

        // 7. Class Group Performance
        const [classGroupStats] = await db.query(`
            SELECT e.class_group, AVG(er.score) as avg_score 
            FROM exam_results er
            JOIN exams e ON er.exam_id = e.id
            WHERE e.class_group IS NOT NULL AND e.class_group != ''
            GROUP BY e.class_group
            ORDER BY e.class_group ASC
        `);

        res.json({
            topStudents,
            passFail: passFail[0],
            examPerformance,
            assignmentStats,
            batchStats,
            divisionStats,
            classGroupStats
        });

    } catch (error) {
        res.status(500).json({ message: 'Error fetching analytics', error: error.message });
    }
};

// Get Student Personal Analytics (Student)
exports.getStudentAnalytics = async (req, res) => {
    try {
        const studentId = req.user.id;

        // 1. My Exam Performance vs Class Average
        const [examComparison] = await db.query(`
            SELECT e.title, er.score as my_score, 
            (SELECT AVG(score) FROM exam_results WHERE exam_id = e.id) as class_avg
            FROM exam_results er
            JOIN exams e ON er.exam_id = e.id
            WHERE er.student_id = ?
            ORDER BY e.created_at DESC
            LIMIT 5
        `, [studentId]);

        // 2. My Assignment Completion
        const [assignments] = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM assignment_submissions WHERE student_id = ?) as submitted,
                (SELECT COUNT(*) FROM assignments) as total
        `, [studentId]);

        res.json({
            examComparison,
            assignmentProgress: assignments[0]
        });

    } catch (error) {
        res.status(500).json({ message: 'Error fetching student analytics', error: error.message });
    }
};

// Get Teacher Performance Analytics (HOD/Admin)
exports.getHODAnalytics = async (req, res) => {
    try {
        // This query aggregates all teacher activities and student performance under them
        const [teacherStats] = await db.query(`
            SELECT 
                u.id, 
                u.name, 
                u.email,
                u.profile_image,
                (SELECT COUNT(*) FROM exams WHERE created_by = u.id) as exam_count,
                (SELECT COUNT(*) FROM notes WHERE uploaded_by = u.id) as note_count,
                (SELECT COUNT(*) FROM assignments WHERE created_by = u.id) as assignment_count,
                (SELECT COUNT(*) FROM exam_results er JOIN exams e ON er.exam_id = e.id WHERE e.created_by = u.id) as total_exam_attempts,
                (SELECT AVG(er.score) FROM exam_results er JOIN exams e ON er.exam_id = e.id WHERE e.created_by = u.id) as avg_student_score
            FROM users u
            WHERE u.role = 'teacher'
            ORDER BY exam_count DESC
        `);

        // Recent Activity across all teachers
        const [recentActivity] = await db.query(`
            (SELECT 'exam' as type, title, created_at, (SELECT name FROM users WHERE id = created_by) as teacher_name FROM exams)
            UNION ALL
            (SELECT 'note' as type, title, created_at, (SELECT name FROM users WHERE id = uploaded_by) as teacher_name FROM notes)
            UNION ALL
            (SELECT 'assignment' as type, title, created_at, (SELECT name FROM users WHERE id = created_by) as teacher_name FROM assignments)
            ORDER BY created_at DESC
            LIMIT 10
        `);

        // Batch Performance
        const [batchStats] = await db.query(`
            SELECT e.batch, AVG(er.score) as avg_score, COUNT(DISTINCT er.student_id) as student_count
            FROM exam_results er
            JOIN exams e ON er.exam_id = e.id
            WHERE e.batch IS NOT NULL AND e.batch != ''
            GROUP BY e.batch
            ORDER BY e.batch DESC
        `);

        // Division Performance
        const [divisionStats] = await db.query(`
            SELECT e.division, AVG(er.score) as avg_score, COUNT(DISTINCT er.student_id) as student_count
            FROM exam_results er
            JOIN exams e ON er.exam_id = e.id
            WHERE e.division IS NOT NULL AND e.division != ''
            GROUP BY e.division
            ORDER BY e.division ASC
        `);

        // Class Group Performance
        const [classGroupStats] = await db.query(`
            SELECT e.class_group, AVG(er.score) as avg_score, COUNT(DISTINCT er.student_id) as student_count
            FROM exam_results er
            JOIN exams e ON er.exam_id = e.id
            WHERE e.class_group IS NOT NULL AND e.class_group != ''
            GROUP BY e.class_group
            ORDER BY e.class_group ASC
        `);

        res.json({
            teacherStats,
            recentActivity,
            batchStats,
            divisionStats,
            classGroupStats
        });

    } catch (error) {
        res.status(500).json({ message: 'Error fetching HOD analytics', error: error.message });
    }
};
