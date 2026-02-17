const db = require('./config/db');

async function migrate() {
    try {
        const connection = await db.getConnection();
        console.log('🔌 Connected to database...');

        // Add 'batch' and 'division' columns to 'exams' table
        try {
            await connection.query("ALTER TABLE exams ADD COLUMN batch VARCHAR(50) DEFAULT NULL");
            console.log("✅ Added 'batch' column to exams.");
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') console.error(err);
        }

        try {
            await connection.query("ALTER TABLE exams ADD COLUMN division VARCHAR(50) DEFAULT NULL");
            console.log("✅ Added 'division' column to exams.");
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') console.error(err);
        }

        connection.release();
        console.log('🎉 Exam batch/division migration completed.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
