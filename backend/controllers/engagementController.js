const db = require('../config/db');

// --- REVIEWS ---

exports.addReview = async (req, res) => {
    const { book_id, rating, comment } = req.body;
    const user_id = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Invalid rating (1-5)' });
    }

    try {
        await db.query(
            'INSERT INTO book_reviews (user_id, book_id, rating, comment) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)',
            [user_id, book_id, rating, comment]
        );
        res.status(201).json({ message: 'Review saved' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getBookReviews = async (req, res) => {
    const { id: book_id } = req.params;
    try {
        const [reviews] = await db.query(
            `SELECT r.id, r.rating, r.comment, r.created_at, u.name as user_name 
             FROM book_reviews r 
             JOIN users u ON r.user_id = u.id 
             WHERE r.book_id = ? 
             ORDER BY r.created_at DESC`,
            [book_id]
        );
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// --- WISHLIST ---

exports.toggleWishlist = async (req, res) => {
    const { book_id } = req.body;
    const user_id = req.user.id;

    try {
        const [exists] = await db.query('SELECT * FROM book_wishlist WHERE user_id = ? AND book_id = ?', [user_id, book_id]);

        if (exists.length > 0) {
            await db.query('DELETE FROM book_wishlist WHERE user_id = ? AND book_id = ?', [user_id, book_id]);
            return res.json({ message: 'Removed from wishlist', added: false });
        } else {
            await db.query('INSERT INTO book_wishlist (user_id, book_id) VALUES (?, ?)', [user_id, book_id]);
            return res.json({ message: 'Added to wishlist', added: true });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getMyWishlist = async (req, res) => {
    const user_id = req.user.id;
    try {
        const [wishlist] = await db.query(
            `SELECT w.id, w.book_id, b.book_name, b.author, b.category, b.image_url, b.available_quantity
             FROM book_wishlist w 
             JOIN books b ON w.book_id = b.id 
             WHERE w.user_id = ? 
             ORDER BY w.created_at DESC`,
            [user_id]
        );
        res.json(wishlist);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// --- LEADERBOARD & STATS ---

exports.getLeaderboard = async (req, res) => {
    try {
        const [leaderboard] = await db.query(`
            SELECT u.id, u.name, COUNT(i.id) as books_read 
            FROM book_issues i 
            JOIN users u ON i.user_id = u.id 
            WHERE i.returned = TRUE 
            GROUP BY u.id 
            ORDER BY books_read DESC 
            LIMIT 10
        `);
        res.json(leaderboard);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getUserBadges = async (req, res) => {
    const user_id = req.user ? req.user.id : req.params.userId;
    try {
        // Calculate stats
        const [stats] = await db.query(
            'SELECT COUNT(*) as read_count FROM book_issues WHERE user_id = ? AND returned = TRUE',
            [user_id]
        );
        const count = stats[0].read_count;

        // Simple Badge Logic
        const badges = [];
        if (count >= 1) badges.push({ name: 'First Step', icon: '🥉' });
        if (count >= 5) badges.push({ name: 'Bookworm', icon: '🥈' });
        if (count >= 10) badges.push({ name: 'Scholar', icon: '🥇' });
        if (count >= 20) badges.push({ name: 'Legend', icon: '🏆' });

        res.json({ read_count: count, badges });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Lost/Damaged handling is now integrated into issueController via 'status' field on book_issues table.
