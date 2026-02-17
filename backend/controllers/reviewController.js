const db = require('../config/db');

// Get all reviews for a book
exports.getBookReviews = async (req, res) => {
    const { bookId } = req.params;
    try {
        const [reviews] = await db.query(`
            SELECT r.id, r.rating, r.review_text, r.created_at, u.name as user_name
            FROM book_reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.book_id = ?
            ORDER BY r.created_at DESC
        `, [bookId]);

        // Calculate average rating
        const [avg] = await db.query(`
            SELECT AVG(rating) as average_rating FROM book_reviews WHERE book_id = ?
        `, [bookId]);

        res.json({
            reviews,
            average_rating: parseFloat(avg[0].average_rating || 0).toFixed(1)
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Add or update a review
exports.addReview = async (req, res) => {
    const { bookId } = req.params;
    const { rating, review_text } = req.body;
    const userId = req.user.id; // From authenticateToken middleware

    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    try {
        // Use Insert ... ON DUPLICATE KEY UPDATE for single review per user per book
        // Note: The unique key `unique_user_book_review` handles the uniqueness.
        // We'll first try to update if exists, otherwise insert a new one. (Upsert)

        // Simpler approach: Check if exists first for clarity or just rely on UPSERT SQL
        const query = `
            INSERT INTO book_reviews (book_id, user_id, rating, review_text)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE rating = VALUES(rating), review_text = VALUES(review_text), created_at = CURRENT_TIMESTAMP
        `;

        await db.query(query, [bookId, userId, rating, review_text]);
        res.status(201).json({ message: 'Review submitted successfully' });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
