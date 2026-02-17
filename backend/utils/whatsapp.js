const twilio = require('twilio');
const dotenv = require('dotenv');

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// Initialize client only if credentials exist to avoid immediate crash on start if not configured
let client;
if (accountSid && authToken) {
    client = twilio(accountSid, authToken);
}

const sendWhatsAppMessage = async (body) => {
    if (!client) {
        console.log('Twilio credentials not set. Mocking WhatsApp message:', body);
        return;
    }

    const adminPhone = process.env.ADMIN_PHONE_NUMBER;
    if (!adminPhone) {
        console.error('ADMIN_PHONE_NUMBER not set');
        return;
    }

    try {
        const message = await client.messages.create({
            body: body,
            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
            to: `whatsapp:${adminPhone}`
        });
        console.log('WhatsApp message sent SID:', message.sid);
        return message;
    } catch (error) {
        console.error('Error sending WhatsApp message:', error.message);
    }
};

module.exports = { sendWhatsAppMessage };
