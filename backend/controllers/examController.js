const db = require('../config/db');

// =======================
// EXAM CRUD (Teacher)
// =======================

// 1. Get Exams
exports.getExams = async (req, res) => {
    try {
        let query;
        let params = [];

        if (req.user.role === 'student') {
            // Students: See currently valid exams (Upcoming or Live or Past within reason)
            query = `
                SELECT exams.*, 
                (SELECT COUNT(*) FROM questions WHERE exam_id = exams.id) as question_count,
                (SELECT score FROM exam_results WHERE exam_id = exams.id AND student_id = ?) as my_score,
                 CASE 
                    WHEN EXISTS (SELECT 1 FROM exam_results WHERE exam_id = exams.id AND student_id = ?) THEN 'completed'
                    WHEN NOW() < start_time THEN 'upcoming'
                    WHEN NOW() > end_time THEN 'expired'
                    ELSE 'live'
                END as status
                FROM exams 
                WHERE branch = ? ` + (req.user.division ? 'AND division = ?' : '') + `
                ORDER BY start_time ASC`;
            params.push(req.user.id); // For my_score
            params.push(req.user.id); // For status check
            params.push(req.user.branch || '');
            if (req.user.division) params.push(req.user.division);
        } else if (req.user.role === 'teacher') {
            // Teachers: See ONLY their own exams
            query = `
                SELECT exams.*, users.name as creator_name,
                (SELECT COUNT(*) FROM questions WHERE exam_id = exams.id) as question_count,
                (SELECT COUNT(*) FROM exam_results WHERE exam_id = exams.id) as attempts_count
                FROM exams 
                LEFT JOIN users ON exams.created_by = users.id 
                WHERE exams.created_by = ?
                ORDER BY created_at DESC`;
            params.push(req.user.id);
        } else {
            // Admins: See everything
            query = `
                SELECT exams.*, users.name as creator_name,
                (SELECT COUNT(*) FROM questions WHERE exam_id = exams.id) as question_count,
                (SELECT COUNT(*) FROM exam_results WHERE exam_id = exams.id) as attempts_count
                FROM exams 
                LEFT JOIN users ON exams.created_by = users.id 
                ORDER BY created_at DESC`;
        }

        const [exams] = await db.query(query, params);
        res.json(exams);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching exams', error: error.message });
    }
};

// 2. Create Exam
exports.createExam = async (req, res) => {
    try {
        const { title, description, duration_minutes, total_marks, passing_marks, start_time, end_time, branch, batch, division, class_group } = req.body;

        if (!title || !start_time || !end_time) {
            return res.status(400).json({ message: 'Title, Start Time and End Time are required' });
        }

        // If teacher, force their branch
        let finalBranch = branch;
        if (req.user.role === 'teacher' && req.user.branch) {
            finalBranch = req.user.branch;
        }

        const result = await db.query(
            `INSERT INTO exams (title, description, duration_minutes, total_marks, passing_marks, start_time, end_time, branch, batch, division, class_group, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, description, duration_minutes, total_marks, passing_marks, start_time, end_time, finalBranch, batch, division, class_group, req.user.id]
        );

        res.status(201).json({ message: 'Exam created successfully', examId: result[0].insertId });
    } catch (error) {
        res.status(500).json({ message: 'Error creating exam', error: error.message });
    }
};

// 3. Delete Exam
exports.deleteExam = async (req, res) => {
    try {
        const examId = req.params.id;

        // Ownership check for teachers
        if (req.user.role === 'teacher') {
            const [exam] = await db.query('SELECT created_by FROM exams WHERE id = ?', [examId]);
            if (exam.length === 0) return res.status(404).json({ message: 'Exam not found' });
            if (exam[0].created_by !== req.user.id) {
                return res.status(403).json({ message: 'You can only delete your own exams' });
            }
        }

        await db.query('DELETE FROM exams WHERE id = ?', [examId]);
        res.json({ message: 'Exam deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting exam', error: error.message });
    }
};

// =======================
// QUESTION MANAGEMENT
// =======================

// 4. Add Question
exports.addQuestion = async (req, res) => {
    try {
        const { exam_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks } = req.body;

        if (!question_text || !correct_option) {
            return res.status(400).json({ message: 'Question text and correct option required' });
        }

        // Ownership check for teachers
        if (req.user.role === 'teacher') {
            const [exam] = await db.query('SELECT created_by FROM exams WHERE id = ?', [exam_id]);
            if (exam.length === 0) return res.status(404).json({ message: 'Exam not found' });
            if (exam[0].created_by !== req.user.id) {
                return res.status(403).json({ message: 'You can only add questions to your own exams' });
            }
        }

        await db.query(
            `INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [exam_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks || 1]
        );

        res.status(201).json({ message: 'Question added' });
    } catch (error) {
        res.status(500).json({ message: 'Error adding question', error: error.message });
    }
};

// 5. Get Questions (For Teacher Edit View)
exports.getQuestions = async (req, res) => {
    try {
        const examId = req.params.id;

        // If teacher, check ownership
        if (req.user.role === 'teacher') {
            const [exam] = await db.query('SELECT created_by FROM exams WHERE id = ?', [examId]);
            if (exam.length === 0) return res.status(404).json({ message: 'Exam not found' });
            if (exam[0].created_by !== req.user.id) {
                return res.status(403).json({ message: 'You can only view questions for your own exams' });
            }
        }

        const [questions] = await db.query('SELECT * FROM questions WHERE exam_id = ?', [examId]);
        res.json(questions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching questions', error: error.message });
    }
};

// =======================
// EXAM TAKING (Student)
// =======================

// 6. Start Exam (Fetch Questions without correct answers)
exports.startExam = async (req, res) => {
    try {
        const examId = req.params.id;

        // Check if exam is live
        const [exam] = await db.query('SELECT * FROM exams WHERE id = ?', [examId]);
        if (exam.length === 0) return res.status(404).json({ message: 'Exam not found' });

        const now = new Date();
        const start = new Date(exam[0].start_time);
        const end = new Date(exam[0].end_time);

        if (now < start) return res.status(400).json({ message: 'Exam has not started yet' });
        if (now > end) return res.status(400).json({ message: 'Exam has ended' });

        // Check if already attempted
        const [attempt] = await db.query('SELECT * FROM exam_results WHERE exam_id = ? AND student_id = ?', [examId, req.user.id]);
        if (attempt.length > 0) return res.status(400).json({ message: 'You have already attempted this exam' });

        // Fetch questions (hiding correct answer)
        const [questions] = await db.query('SELECT id, question_text, option_a, option_b, option_c, option_d, marks FROM questions WHERE exam_id = ?', [examId]);

        res.json({ exam: exam[0], questions });

    } catch (error) {
        res.status(500).json({ message: 'Error starting exam', error: error.message });
    }
};

// 7. Submit Exam
exports.submitExam = async (req, res) => {
    try {
        const { exam_id, answers } = req.body; // answers: { question_id: 'a', ... }
        const studentId = req.user.id;

        // Fetch correct answers
        const [questions] = await db.query('SELECT id, correct_option, marks FROM questions WHERE exam_id = ?', [exam_id]);

        let score = 0;
        let correctCount = 0;
        let wrongCount = 0;
        let totalQuestions = questions.length;

        questions.forEach(q => {
            const studentAns = answers[q.id];
            if (studentAns === q.correct_option) {
                score += q.marks;
                correctCount++;
            } else if (studentAns) {
                wrongCount++;
            }
        });

        // Get passing marks
        const [examInfo] = await db.query('SELECT passing_marks FROM exams WHERE id = ?', [exam_id]);
        const status = score >= examInfo[0].passing_marks ? 'pass' : 'fail';

        // Save Result
        await db.query(
            `INSERT INTO exam_results (exam_id, student_id, score, total_questions, correct_answers, wrong_answers, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [exam_id, studentId, score, totalQuestions, correctCount, wrongCount, status]
        );

        res.json({ message: 'Exam submitted successfully', score, status, totalQuestions, correctCount, wrongCount });

    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'You have already submitted this exam.' });
        }
        res.status(500).json({ message: 'Error submitting exam', error: error.message });
    }
};

// 8. Get My Results (Student)
exports.getMyResults = async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT r.*, e.title, e.total_marks 
            FROM exam_results r 
            JOIN exams e ON r.exam_id = e.id 
            WHERE r.student_id = ? 
            ORDER BY r.completed_at DESC`,
            [req.user.id]
        );
        res.json(results);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching results', error: error.message });
    }
};

// 9. Get Exam Results (Teacher - for specific exam)
exports.getExamResults = async (req, res) => {
    try {
        const examId = req.params.id;

        // If teacher, check ownership
        if (req.user.role === 'teacher') {
            const [exam] = await db.query('SELECT created_by FROM exams WHERE id = ?', [examId]);
            if (exam.length === 0) return res.status(404).json({ message: 'Exam not found' });
            if (exam[0].created_by !== req.user.id) {
                return res.status(403).json({ message: 'You can only view results for your own exams' });
            }
        }

        const [results] = await db.query(`
            SELECT r.*, u.name as student_name, u.email 
            FROM exam_results r 
            JOIN users u ON r.student_id = u.id 
            WHERE r.exam_id = ? 
            ORDER BY r.score DESC`,
            [examId]
        );
        res.json(results);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching class results', error: error.message });
    }
};
