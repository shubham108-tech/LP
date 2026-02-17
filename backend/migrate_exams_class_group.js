const db = require('./config/db');

async function migrate() {
    try {
        const connection = await db.getConnection();
        console.log('🔌 Connected to database...');

        // Add 'class_group' column to 'exams' table
        try {
            // Adding class_group (e.g. F1, S1, T1)
            await connection.query("ALTER TABLE exams ADD COLUMN class_group VARCHAR(50) DEFAULT NULL");
            console.log("✅ Added 'class_group' column to exams.");
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') console.error(err);
        }

        connection.release();
        console.log('🎉 Exam class_group migration completed.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
