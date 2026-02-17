const db = require('./config/db');

async function migrate() {
    try {
        const connection = await db.getConnection();
        console.log('🔌 Connected to database...');

        try {
            await connection.query("ALTER TABLE notes ADD COLUMN category VARCHAR(100) DEFAULT 'General'");
            console.log("✅ Added 'category' column to notes.");
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') console.error(err);
        }

        connection.release();
        console.log('🎉 Notes category migration completed.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
