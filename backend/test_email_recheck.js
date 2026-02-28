const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const nodemailer = require('nodemailer');

const testConfig = async () => {
    console.log('--- Email Connection Test ---');

    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!user || !pass) {
        console.error('ERROR: EMAIL_USER or EMAIL_PASS is missing in .env file!');
        return;
    }

    console.log('Email User:', user);
    console.log('Email Pass Length:', pass.length);

    if (pass.includes(' ')) {
        console.error('CRITICAL WARNING: Your App Password contains spaces!');
        return;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: user,
            pass: pass
        }
    });

    try {
        console.log('Attempting to verify connection...');
        await transporter.verify();
        console.log('SUCCESS: Connection verified! Config is correct.');

        console.log('Attempting to send test email...');
        await transporter.sendMail({
            from: user,
            to: user,
            subject: 'Test Email form LibraryPro',
            text: 'If you see this, email is working!'
        });
        console.log('SUCCESS: Test email sent!');

    } catch (error) {
        console.error('FAILED: Connection/Auth error');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        if (error.response && error.response.includes('535')) {
            console.log('DIAGNOSIS: "Bad Credentials" (535 5.7.8)');
            console.log('Possible solutions:');
            console.log('1. Check spelling of Email Address in .env');
            console.log('2. Check App Password in .env (should be 16 chars, no spaces)');
        }
    }
};

testConfig();
