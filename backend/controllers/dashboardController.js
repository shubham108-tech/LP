const db = require('../config/db');

exports.getDashboardData = async (req, res) => {
    try {
        // 1. Stats
        const [books] = await db.query('SELECT SUM(total_quantity) as totalBooks, SUM(available_quantity) as availableBooks FROM books');
        const [issued] = await db.query('SELECT COUNT(*) as issuedBooks FROM book_issues WHERE returned = 0');
        const [lost] = await db.query("SELECT COUNT(*) as count FROM book_issues WHERE status = 'lost'");
        const [damaged] = await db.query("SELECT COUNT(*) as count FROM book_issues WHERE status = 'damaged'");
        const [fines] = await db.query('SELECT SUM(fine) as totalFines FROM book_issues WHERE fine > 0');

        // Count Teachers and Students separately
        const [userStats] = await db.query(`
            SELECT role, COUNT(*) as count 
            FROM users 
            WHERE role IN ('teacher', 'student') 
            GROUP BY role
        `);

        const teacherCount = userStats.find(u => u.role === 'teacher')?.count || 0;
        const studentCount = userStats.find(u => u.role === 'student')?.count || 0;

        // 2. Recent Activity (Issues & Returns)
        const [recentActivity] = await db.query(`
            SELECT 
                i.id, 
                u.name as user_name, 
                b.book_name, 
                i.status as type, 
                i.issue_date as date 
            FROM book_issues i
            JOIN users u ON i.user_id = u.id
            JOIN books b ON i.book_id = b.id
            ORDER BY i.issue_date DESC 
            LIMIT 5
        `);

        // 3. Low Stock Books (Available < 3)
        const [lowStockBooks] = await db.query(`
            SELECT id, book_name, author, available_quantity, total_quantity 
            FROM books 
            WHERE available_quantity < 3 
            ORDER BY available_quantity ASC 
            LIMIT 5
        `);

        // 4. Overdue Books (Not returned and due date passed)
        const [overdueBooks] = await db.query(`
            SELECT 
                i.id, 
                u.name as user_name, 
                b.book_name, 
                DATE_ADD(i.issue_date, INTERVAL 15 DAY) as due_date
            FROM book_issues i
            JOIN users u ON i.user_id = u.id
            JOIN books b ON i.book_id = b.id
            WHERE i.returned = 0 
            AND DATE_ADD(i.issue_date, INTERVAL 15 DAY) < NOW()
            ORDER BY i.issue_date ASC
            LIMIT 5
        `);

        // 5. Category Distribution (Popularity by Issue Count)
        // Updated to reflect strictly *popularity* by issue count per category
        const [categoryStats] = await db.query(`
            SELECT b.category as name, COUNT(i.id) as value 
            FROM book_issues i
            JOIN books b ON i.book_id = b.id
            GROUP BY b.category
            ORDER BY value DESC
        `);

        // 6. Monthly Trends (Issued vs Returned)
        const [issuedStats] = await db.query(`
            SELECT DATE_FORMAT(issue_date, '%Y-%m') as month, COUNT(*) as count 
            FROM book_issues 
            GROUP BY month 
            ORDER BY month ASC 
        `);

        const [returnedStats] = await db.query(`
            SELECT DATE_FORMAT(return_date, '%Y-%m') as month, COUNT(*) as count 
            FROM book_issues 
            WHERE returned = 1 AND return_date IS NOT NULL
            GROUP BY month 
            ORDER BY month ASC 
        `);

        // Merge logic
        const monthlyMap = new Map();

        issuedStats.forEach(s => {
            if (s.month) {
                monthlyMap.set(s.month, { name: s.month, issued: s.count, returned: 0 });
            }
        });

        returnedStats.forEach(s => {
            if (s.month) {
                if (monthlyMap.has(s.month)) {
                    monthlyMap.get(s.month).returned = s.count;
                } else {
                    monthlyMap.set(s.month, { name: s.month, issued: 0, returned: s.count });
                }
            }
        });

        // Convert to array and sort
        const monthlyStats = Array.from(monthlyMap.values()).sort((a, b) => a.name.localeCompare(b.name));

        // 7. Top Borrowers
        const [topBorrowers] = await db.query(`
            SELECT u.name, COUNT(i.id) as count 
            FROM book_issues i 
            JOIN users u ON i.user_id = u.id 
            GROUP BY u.id, u.name 
            ORDER BY count DESC 
            LIMIT 5
        `);

        res.json({
            stats: {
                totalBooks: books[0].totalBooks || 0,
                availableBooks: books[0].availableBooks || 0,
                issuedBooks: issued[0].issuedBooks || 0,
                totalTeachers: teacherCount,
                totalStudents: studentCount,
                lostBooks: lost[0]?.count || 0,
                damagedBooks: damaged[0]?.count || 0,
                totalFines: fines[0]?.totalFines || 0
            },
            recentActivity,
            lowStockBooks,
            overdueBooks,
            categoryStats,
            monthlyStats,
            topBorrowers
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getStats = async (req, res) => {
    try {
        const [books] = await db.query('SELECT SUM(total_quantity) as totalBooks, SUM(available_quantity) as availableBooks FROM books');
        const [issued] = await db.query('SELECT COUNT(*) as issuedBooks FROM book_issues WHERE returned = 0');
        const [users] = await db.query('SELECT COUNT(*) as totalUsers FROM users WHERE role != "admin"'); // Teachers/Staff

        res.json({
            totalBooks: books[0].totalBooks || 0,
            availableBooks: books[0].availableBooks || 0,
            issuedBooks: issued[0].issuedBooks || 0,
            totalTeachers: users[0].totalUsers || 0
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
