const db = require('./config/db');

async function migrate() {
    try {
        const connection = await db.getConnection();
        console.log('🔌 Connected to database...');

        // Check if columns exist, if not add them
        try {
            await connection.query("ALTER TABLE notes ADD COLUMN resource_type ENUM('file', 'video') DEFAULT 'file'");
            console.log("✅ Added 'resource_type' column.");
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') console.error(err);
        }

        try {
            await connection.query("ALTER TABLE notes ADD COLUMN video_url TEXT NULL");
            console.log("✅ Added 'video_url' column.");
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') console.error(err);
        }

        connection.release();
        console.log('🎉 Notes migration completed.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
