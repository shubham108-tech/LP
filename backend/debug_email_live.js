const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const nodemailer = require('nodemailer');

const recipient = 'shubhambhendavade2@gmail.com';

const testEmail = async () => {
    console.log('--- LIVE EMAIL DEBUG ---');
    console.log('Sender:', process.env.EMAIL_USER);
    console.log('Recipient:', recipient);

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('MISSING CREDENTIALS in .env file');
        return;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        debug: true,
        logger: true
    });

    try {
        console.log('Sending...');
        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: recipient,
            subject: 'LibraryPro OTP Test',
            html: '<h3>Test Email</h3><p>If you received this, the system is working perfectly.</p>'
        });
        console.log('--- SUCCESS ---');
        console.log('Message ID:', info.messageId);
        console.log('Response:', info.response);
    } catch (error) {
        console.log('--- FAILURE ---');
        console.error('Error:', error.message);
        if (error.responseCode === 535) {
            console.log('REASON: Authentication Failed. Check Email and App Password in .env');
        }
    }
};

testEmail();
