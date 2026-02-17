const nodemailer = require('nodemailer');

// Flexible Transport Configuration directly from Environment Variables
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com', // Default to Gmail if not set
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_PORT == 465, // true for 465 (SSL), false for other ports (TLS)
    // service: process.env.SMTP_SERVICE, // Commented out to prefer explicit host/port for custom domains
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false // Helps with self-signed certs or strict firewalls sometimes
    },
    connectionTimeout: 10000, // 10 seconds
    socketTimeout: 10000 // 10 seconds
});

const sendEmail = async (to, subject, html) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject,
            html
        };
        await transporter.sendMail(mailOptions);
        console.log('Email sent to:', to);
        return { success: true };
    } catch (error) {
        console.error('Email sending failed:', error);
        return { success: false, error: error.message };
    }
};

module.exports = { sendEmail };
