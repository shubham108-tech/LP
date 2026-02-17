const db = require('./config/db');

async function migrate() {
    try {
        const connection = await db.getConnection();
        console.log('🔌 Connected to database...');

        // Add 'grade' and 'feedback' to assignment_submissions
        try {
            await connection.query("ALTER TABLE assignment_submissions ADD COLUMN grade FLOAT DEFAULT NULL");
            console.log("✅ Added 'grade' column.");
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') console.error(err);
        }

        try {
            await connection.query("ALTER TABLE assignment_submissions ADD COLUMN feedback TEXT DEFAULT NULL");
            console.log("✅ Added 'feedback' column.");
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') console.error(err);
        }

        connection.release();
        console.log('🎉 Assignments migration completed.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
