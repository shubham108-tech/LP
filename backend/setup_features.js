const db = require('./config/db');

const createTables = async () => {
    try {
        console.log('Initializing Engineering Features Tables...');

        // 1. Projects Table
        await db.query(`
            CREATE TABLE IF NOT EXISTS projects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                student_names VARCHAR(255),
                branch VARCHAR(100),
                year VARCHAR(50),
                type ENUM('report', 'code', 'ppt', 'other') DEFAULT 'report',
                file_url VARCHAR(255),
                uploaded_by INT,
                is_approved BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log('Projects table created/verified.');

        // 2. Placements Table
        await db.query(`
            CREATE TABLE IF NOT EXISTS placements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                company_name VARCHAR(255),
                type ENUM('interview_q', 'aptitude', 'resume_template', 'experience') NOT NULL,
                content TEXT,
                file_url VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Placements table created/verified.');

        // 3. Resources Table (for Booking)
        await db.query(`
            CREATE TABLE IF NOT EXISTS resources (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                type ENUM('venue', 'equipment') NOT NULL,
                status ENUM('available', 'maintenance') DEFAULT 'available'
            )
        `);
        console.log('Resources table created/verified.');

        // 4. Bookings Table
        await db.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                resource_id INT NOT NULL,
                user_id INT NOT NULL,
                start_time DATETIME NOT NULL,
                end_time DATETIME NOT NULL,
                purpose VARCHAR(255),
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('Bookings table created/verified.');

        // Seed some dummy resources if empty
        const [resources] = await db.query('SELECT * FROM resources');
        if (resources.length === 0) {
            await db.query(`
                INSERT INTO resources (name, type, status) VALUES 
                ('Seminar Hall A', 'venue', 'available'),
                ('Conference Room', 'venue', 'available'),
                ('Projector 1', 'equipment', 'available'),
                ('Projector 2', 'equipment', 'available'),
                ('Robotics Kit', 'equipment', 'available')
             `);
            console.log('Seeded initial resources.');
        }

        console.log('All engineering feature tables setup successfully.');
        process.exit();
    } catch (error) {
        console.error('Error setting up tables:', error);
        process.exit(1);
    }
};

createTables();
