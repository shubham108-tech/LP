const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { sendEmail } = require('../utils/email');

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Generate 6-digit Secure OTP
const generateOTP = () => crypto.randomInt(100000, 999999).toString();

exports.createUser = async (req, res) => {
    const { name, email, password, role, branch, year, division } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Please provide all details' });
    }

    try {
        // Check if user exists
        const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const allowedRoles = ['student', 'teacher', 'hod', 'admin'];
        const userRole = (role && allowedRoles.includes(role)) ? role : 'student';

        // Handle Image Upload
        let profileImage = null;
        if (req.file) {
            const uploadDir = path.join(__dirname, '../uploads/profiles');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            // Sanitize filename
            const cleanName = req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
            const filename = `${Date.now()}-${cleanName}`;

            fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);
            profileImage = `/uploads/profiles/${filename}`;
        }

        // Insert User Directly (Admin Action -> Auto Verified)
        const [result] = await db.query(
            'INSERT INTO users (name, email, password, role, branch, year, division, is_verified, profile_image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, email, hashedPassword, userRole, branch || null, year || null, division || null, true, profileImage]
        );

        res.status(201).json({
            message: 'User created successfully',
            user: { id: result.insertId, name, email, role: userRole, branch, year, division, profile_image: profileImage }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error from create' });
    }
};

exports.register = async (req, res) => {
    const { name, email, password, role, branch, year, division } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Please provide all details' });
    }

    try {
        // Check if user exists AND is verified
        const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0 && existingUsers[0].is_verified) {
            // Only block if VERIFIED. Unverified users can re-register (overwrite).
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const allowedRoles = ['student', 'teacher', 'hod'];
        const userRole = (role && allowedRoles.includes(role)) ? role : 'student';

        // Generate OTP
        const otp = generateOTP();

        // Create a temporary token containing user data and OTP
        // Valid for 10 minutes
        const registrationToken = jwt.sign(
            { name, email, password: hashedPassword, role: userRole, otp, branch, year, division },
            process.env.JWT_SECRET,
            { expiresIn: '10m' }
        );

        // Send Email Asynchronously (Don't await)
        console.log(`[DEV MODE] Generated OTP for ${email}: ${otp}`);

        // Use a promise to handle email silently in background
        sendEmail(email, 'Verify Your Account - LibraryPro', `<p>Your OTP for account verification is: <strong>${otp}</strong></p>`)
            .then(result => {
                if (result.success) {
                    console.log(`Email sent successfully to ${email}`);
                } else {
                    console.error(`Failed to send email to ${email}: ${result.error}`);
                }
            })
            .catch(err => console.error('Email background error:', err));

        // Return token to client IMMEDIATELY
        res.status(200).json({
            message: 'OTP sent to email.',
            registrationToken // Frontend must store this
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.verifyOTP = async (req, res) => {
    const { otp, registrationToken } = req.body;

    if (!registrationToken) {
        return res.status(400).json({ message: 'Missing registration session. Please register again.' });
    }

    try {
        // Verify the registration token
        let decoded;
        try {
            decoded = jwt.verify(registrationToken, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(400).json({ message: 'Session expired or invalid. Please register again.' });
        }

        const { name, email, password, role, otp: correctOtp, branch, year, division } = decoded;

        // Verify OTP
        if (String(correctOtp) !== String(otp)) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        // Check again if user exists (Double check before insert)
        const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            if (existingUsers[0].is_verified) {
                return res.status(400).json({ message: 'User already registered' });
            }

            // User exists but is unverified. UPDATE instead of INSERT.
            await db.query(
                'UPDATE users SET name=?, password=?, role=?, branch=?, year=?, division=?, is_verified=?, created_at=NOW() WHERE id=?',
                [name, password, role, branch, year, division, true, existingUsers[0].id]
            );

            const userId = existingUsers[0].id;

            // Generate Login Token
            const token = jwt.sign(
                { id: userId, role: role, name: name, branch: branch, year: year, division: division },
                process.env.JWT_SECRET,
                { expiresIn: '1d' }
            );

            return res.json({
                message: 'Email verified and account created successfully',
                token,
                user: { id: userId, name, email, role, branch, year, division }
            });
        }

        // INSERT USER INTO DATABASE NOW
        const [result] = await db.query(
            'INSERT INTO users (name, email, password, role, branch, year, division, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, email, password, role, branch, year, division, true]
        );

        const userId = result.insertId;

        // Generate Login Token
        const token = jwt.sign(
            { id: userId, role: role, name: name, branch, year, division },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Email verified and account created successfully',
            token,
            user: { id: userId, name, email, role, branch, year, division }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.resendOTP = async (req, res) => {
    const { email, registrationToken } = req.body;

    try {
        // SCENARIO 1: Resend during Registration (User not in DB yet)
        if (registrationToken) {
            let decoded;
            try {
                decoded = jwt.verify(registrationToken, process.env.JWT_SECRET);
            } catch (err) {
                return res.status(400).json({ message: 'Session expired. Please register again.' });
            }

            const { name, password, role } = decoded;
            const newOtp = generateOTP();

            // Create new token
            const newToken = jwt.sign(
                { name, email, password, role, otp: newOtp },
                process.env.JWT_SECRET,
                { expiresIn: '10m' }
            );

            // Send Email
            try {
                await sendEmail(email, 'Resend OTP - LibraryPro', `<p>Your new OTP for verified registration is: <strong>${newOtp}</strong></p>`);
            } catch (emailError) {
                console.error('Failed to send OTP email:', emailError.message);
                // Continue even if email fails, to return token (though user won't get OTP)
            }

            return res.json({
                message: 'OTP resent successfully',
                registrationToken: newToken
            });
        }

        // SCENARIO 2: Resend for Existing User (e.g. Login verification, if implemented later)
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = users[0];
        if (user.is_verified) {
            // If user is verified, simply tell them? Or maybe this logic is for something else.
            // For now, if they are calling resendOTP, they likely need it.
            // But usually verified users login with password.
            // Assuming this might be used for "Forgot Password" or similar flow in future.
            // But for now, let's stick to the current logic but only if NOT verified?
            // The original code returned 400 if verified.
            return res.status(400).json({ message: 'User already verified' });
        }

        // Generate New Secure OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        await db.query('UPDATE users SET otp = ?, otp_expiry = ? WHERE id = ?', [otp, otpExpiry, user.id]);

        await sendEmail(email, 'Resend OTP - LibraryPro', `<p>Your new OTP for verification is: <strong>${otp}</strong></p>`);

        res.json({ message: 'OTP resent successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Removed email verification check as per user request
        // if (!user.is_verified) {
        //    return res.status(403).json({ message: 'Email not verified', email: user.email, requireOtp: true });
        // }

        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.name, branch: user.branch, year: user.year, division: user.division },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                branch: user.branch,
                year: user.year,
                division: user.division,
                profile_image: user.profile_image
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const role = req.query.role || 'teacher';
        let query = 'SELECT id, name, email, role, branch, year, division, created_at, profile_image FROM users WHERE role = ?';
        let params = [role];

        // HOD: Filter by branch
        if (req.user.role === 'hod' && req.user.branch) {
            query += ' AND branch = ?';
            params.push(req.user.branch);
        }

        query += ' ORDER BY created_at DESC';

        const [users] = await db.query(query, params);
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.bulkRegister = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const role = req.body.role || 'teacher';

        const fileExt = req.file.originalname.split('.').pop().toLowerCase();
        let data = [];

        if (fileExt === 'pdf') {
            const pdf = require('pdf-parse');
            const pdfData = await pdf(req.file.buffer);
            const lines = pdfData.text.split(/\r?\n/).filter(line => line.trim().length > 0);

            // PDF Parsing Heuristic for Name - Email
            data = lines.map(line => {
                // Try: "Name - Email" or "Name | Email" or spaced
                const parts = line.split(/ - | \| | {2,}|\t/);
                if (parts.length >= 2) {
                    return { name: parts[0].trim(), email: parts[1].trim() };
                }
                return null;
            }).filter(item => item !== null && item.email.includes('@'));
        } else {
            const xlsx = require('xlsx');
            const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });

            if (workbook.SheetNames.length === 0) {
                return res.status(400).json({ message: 'Invalid Excel file: No sheets found' });
            }

            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rawData = xlsx.utils.sheet_to_json(sheet);

            data = rawData.map(row => {
                // Try to find name and email keys case-insensitively
                const keys = Object.keys(row);
                const nameKey = keys.find(k => k.toLowerCase().includes('name'));
                const emailKey = keys.find(k => k.toLowerCase().includes('mail'));

                return {
                    name: nameKey ? row[nameKey] : (row['Name'] || row['name']),
                    email: emailKey ? row[emailKey] : (row['Email'] || row['email'])
                };
            }).filter(item => item.name && item.email);
        }

        let addedCount = 0;
        let skippedCount = 0;

        // Prepare bulk insert data
        const roleStr = req.body.role || 'teacher';

        // High Capacity Optimization: Hash default password ONCE before loop for high performance (Allows 1000+ users instantly)
        const salt = await bcrypt.genSalt(10);
        const defaultHashedPassword = await bcrypt.hash('password123', salt);

        for (const item of data) {
            if (item.name && item.email) {
                try {
                    // Check if user exists
                    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [item.email]);

                    if (existing.length === 0) {
                        await db.query(
                            'INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, ?, ?)',
                            [item.name, item.email, defaultHashedPassword, roleStr, true]
                        );
                        addedCount++;
                    } else {
                        skippedCount++;
                    }
                } catch (err) {
                    console.error("Row error", err);
                    skippedCount++;
                }
            }
        }

        res.json({ message: `Bulk register successful. Added: ${addedCount}, Skipped: ${skippedCount}` });

    } catch (error) {
        console.error('Bulk Register Error:', error);
        res.status(500).json({ message: 'Error processing file: ' + error.message });
    }
};

exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { name, email, department, password, role, branch, year, division } = req.body;

    try {
        const [existing] = await db.query('SELECT role FROM users WHERE id = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ message: 'User not found' });

        // Preserve existing role if not provided
        const newRole = role || existing[0].role;

        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            await db.query(
                'UPDATE users SET name = ?, email = ?, password = ?, role = ?, branch = ?, year = ?, division = ? WHERE id = ?',
                [name, email, hashedPassword, newRole, branch || null, year || null, division || null, id]
            );
        } else {
            await db.query(
                'UPDATE users SET name = ?, email = ?, role = ?, branch = ?, year = ?, division = ? WHERE id = ?',
                [name, email, newRole, branch || null, year || null, division || null, id]
            );
        }
        res.json({ message: 'User updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.updateProfile = async (req, res) => {
    const userId = req.user.id;
    const { name, email, password, branch, year, division } = req.body;

    try {
        let profileImage = undefined;
        if (req.file) {
            const uploadDir = path.join(__dirname, '../uploads/profiles');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            const cleanName = req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
            const filename = `${Date.now()}-${cleanName}`;
            const filepath = path.join(uploadDir, filename);
            fs.writeFileSync(filepath, req.file.buffer);
            profileImage = `/uploads/profiles/${filename}`;
        }

        let updates = [];
        let params = [];

        if (name) { updates.push('name = ?'); params.push(name); }
        if (email) { updates.push('email = ?'); params.push(email); }
        if (branch) { updates.push('branch = ?'); params.push(branch); }
        if (year) { updates.push('year = ?'); params.push(year); }
        if (division) { updates.push('division = ?'); params.push(division); }
        if (profileImage) { updates.push('profile_image = ?'); params.push(profileImage); }

        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            updates.push('password = ?');
            params.push(hashedPassword);
        }

        if (updates.length > 0) {
            params.push(userId);
            const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
            await db.query(sql, params);
        }

        const [users] = await db.query('SELECT id, name, email, role, branch, year, division, profile_image FROM users WHERE id = ?', [userId]);

        res.json({
            message: 'Profile updated successfully',
            user: users[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error update profile' });
    }
};

exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
