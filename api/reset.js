const db = require('../backend/config/db');

module.exports = async (req, res) => {
    try {
        await db.resetData();
        res.json({
            status: "success",
            message: "Database 100% reset completed! All books, students, teachers wiped clean.",
            counts: { users: 1, books: 0, stationary: 0 }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
