const db = require('../config/db');

exports.getDashboardData = async (req, res) => {
    try {
        // Execute all independent queries in parallel using Promise.all
        const [
            [books],
            [issued],
            [lost],
            [damaged],
            [fines],
            [pendingBookReqs],
            [pendingStatReqs],
            [lowStockStationary],
            [todayStatIssues],
            [userStats],
            [recentActivity],
            [lowStockBooks],
            [overdueBooks],
            [categoryStats],
            [issuedStats],
            [returnedStats],
            [topBorrowers]
        ] = await Promise.all([
            // 1. Stats
            db.query('SELECT SUM(total_quantity) as totalBooks, SUM(available_quantity) as availableBooks FROM books'),
            db.query('SELECT COUNT(*) as issuedBooks FROM book_issues WHERE returned = 0'),
            db.query("SELECT COUNT(*) as count FROM book_issues WHERE status = 'lost'"),
            db.query("SELECT COUNT(*) as count FROM book_issues WHERE status = 'damaged'"),
            db.query('SELECT SUM(fine) as totalFines FROM book_issues WHERE fine > 0'),
            db.query("SELECT COUNT(*) as count FROM book_requests WHERE LOWER(status) = 'pending'"),
            db.query("SELECT COUNT(*) as count FROM stationary_requests WHERE LOWER(status) = 'pending'"),
            // Low stock stationary items
            db.query(`
                SELECT id, item_name, available_stock, min_stock_limit, unit
                FROM stationary_items
                WHERE available_stock < min_stock_limit
                ORDER BY available_stock ASC
                LIMIT 10
            `),
            // Today's stationary issues count
            db.query(`
                SELECT COUNT(*) as count FROM stationary_requests
                WHERE LOWER(status) = 'approved'
                AND DATE(acted_at) = CURRENT_DATE
            `),
            // Count Teachers and Students separately
            db.query(`
                SELECT role, COUNT(*) as count 
                FROM users 
                WHERE role IN ('teacher', 'student') 
                GROUP BY role
            `),
            // 2. Recent Activity (Issues & Returns)
            db.query(`
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
            `),
            // 3. Low Stock Books (Available < 3)
            db.query(`
                SELECT id, book_name, author, available_quantity, total_quantity 
                FROM books 
                WHERE available_quantity < 3 
                ORDER BY available_quantity ASC 
                LIMIT 5
            `),
            // 4. Overdue Books (Not returned and due date passed)
            db.query(`
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
            `),
            // 5. Category Distribution
            db.query(`
                SELECT b.category as name, COUNT(i.id) as value 
                FROM book_issues i
                JOIN books b ON i.book_id = b.id
                GROUP BY b.category
                ORDER BY value DESC
            `),
            // 6. Monthly Trends (Issued vs Returned)
            db.query(`
                SELECT DATE_FORMAT(issue_date, '%Y-%m') as month, COUNT(*) as count 
                FROM book_issues 
                GROUP BY month 
                ORDER BY month ASC 
            `),
            db.query(`
                SELECT DATE_FORMAT(return_date, '%Y-%m') as month, COUNT(*) as count 
                FROM book_issues 
                WHERE returned = 1 AND return_date IS NOT NULL
                GROUP BY month 
                ORDER BY month ASC 
            `),
            // 7. Top Borrowers
            db.query(`
                SELECT u.name, COUNT(i.id) as count 
                FROM book_issues i 
                JOIN users u ON i.user_id = u.id 
                GROUP BY u.id, u.name 
                ORDER BY count DESC 
                LIMIT 5
            `)
        ]);

        const teacherCount = (userStats || []).find(u => u.role === 'teacher')?.count || 0;
        const studentCount = (userStats || []).find(u => u.role === 'student')?.count || 0;

        // Merge logic
        const monthlyMap = new Map();

        (issuedStats || []).forEach(s => {
            if (s.month) {
                monthlyMap.set(s.month, { name: s.month, issued: s.count, returned: 0 });
            }
        });

        (returnedStats || []).forEach(s => {
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

        res.json({
            stats: {
                totalBooks: books?.[0]?.totalBooks || 0,
                availableBooks: books?.[0]?.availableBooks || 0,
                issuedBooks: issued?.[0]?.issuedBooks || 0,
                totalTeachers: teacherCount,
                totalStudents: studentCount,
                lostBooks: lost?.[0]?.count || 0,
                damagedBooks: damaged?.[0]?.count || 0,
                totalFines: fines?.[0]?.totalFines || 0,
                pendingBookRequests: pendingBookReqs?.[0]?.count || 0,
                pendingStationaryRequests: pendingStatReqs?.[0]?.count || 0
            },
            recentActivity: recentActivity || [],
            lowStockBooks: lowStockBooks || [],
            overdueBooks: overdueBooks || [],
            categoryStats: categoryStats || [],
            monthlyStats: monthlyStats || [],
            topBorrowers: topBorrowers || [],
            lowStockStationary: lowStockStationary || [],
            todayStatIssues: todayStatIssues?.[0]?.count || 0
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getStats = async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        const [
            [books],
            [notes],
            [projects],
            [users]
        ] = await Promise.all([
            db.query('SELECT COALESCE(SUM(total_quantity), 0) as count FROM books'),
            db.query('SELECT COUNT(*) as count FROM notes'),
            db.query('SELECT COUNT(*) as count FROM projects'),
            db.query("SELECT COUNT(*) as count FROM users WHERE role != 'admin'")
        ]);

        res.json({
            totalBooks: parseInt(books[0]?.count || 0, 10),
            digitalJournals: parseInt(notes[0]?.count || 0, 10),
            researchPapers: parseInt(projects[0]?.count || 0, 10),
            activeMembers: parseInt(users[0]?.count || 0, 10)
        });
    } catch (error) {
        console.error('getStats error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.resetSystemData = async (req, res) => {
    try {
        await db.resetData();
        res.json({ message: 'System database reset successfully to initial state!' });
    } catch (error) {
        console.error('Reset error:', error);
        res.status(500).json({ message: 'Failed to reset database', error: error.message });
    }
};
