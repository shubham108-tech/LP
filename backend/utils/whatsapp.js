const dotenv = require('dotenv');
dotenv.config();

let client = null;
let latestQrRaw = null;
let latestQrDataUrl = null;
let isReady = false;
let isVercel = !!process.env.VERCEL;
let isDisabled = process.env.DISABLE_WHATSAPP === 'true';

const initWhatsAppClient = () => {
    if (isVercel || isDisabled) {
        console.log('ℹ️ WhatsApp Web client disabled or running on serverless environment.');
        return;
    }

    try {
        const { Client, LocalAuth } = require('whatsapp-web.js');
        const qrcodeTerminal = require('qrcode-terminal');
        const QRCode = require('qrcode');

        client = new Client({
            authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-extensions',
                    '--disable-software-rasterizer',
                    '--mute-audio',
                    '--js-flags=--max-old-space-size=128'
                ]
            }
        });

        client.on('qr', async (qr) => {
            latestQrRaw = qr;
            isReady = false;
            console.log('\n==================================================');
            console.log('📱 WHATSAPP WEB QR CODE GENERATED! SCAN WITH PHONE:');
            console.log('==================================================');
            qrcodeTerminal.generate(qr, { small: true });
            console.log('Or view QR code in browser at: http://localhost:5000/qr\n');

            try {
                latestQrDataUrl = await QRCode.toDataURL(qr);
            } catch (err) {
                console.error('Error generating QR DataURL:', err);
            }
        });

        client.on('ready', () => {
            isReady = true;
            latestQrRaw = null;
            latestQrDataUrl = null;
            console.log('\n✅ WHATSAPP WEB CLIENT IS READY & CONNECTED!\n');
        });

        client.on('authenticated', () => {
            isReady = true;
            console.log('🔑 WhatsApp Web Client Authenticated!');
        });

        client.on('auth_failure', (msg) => {
            console.error('❌ WhatsApp Web Auth Failure:', msg);
        });

        client.on('disconnected', (reason) => {
            console.log('⚠️ WhatsApp Web Client Disconnected:', reason);
            isReady = false;
            setTimeout(() => {
                if (client) {
                    client.initialize().catch(err => console.error('Error re-initializing WhatsApp client:', err.message));
                }
            }, 5000);
        });

        client.initialize().catch(err => {
            console.error('WhatsApp Web Client initialization error:', err.message);
        });
    } catch (err) {
        console.warn('⚠️ WhatsApp Web module not available or failed to load:', err.message);
    }
};

initWhatsAppClient();

const resetWhatsApp = async () => {
    isReady = false;
    latestQrRaw = null;
    latestQrDataUrl = null;
    if (client) {
        try {
            await client.destroy();
        } catch (e) {
            console.log('Error destroying client:', e.message);
        }
        client = null;
    }
    initWhatsAppClient();
    return { success: true, message: 'WhatsApp client reset. Generating fresh QR code...' };
};

/**
 * Send WhatsApp Message
 * @param {string} body Message content
 * @param {string} [targetNumber] Phone number in international format (e.g. 919876543210 or +919876543210). Defaults to ADMIN_PHONE_NUMBER if not passed.
 */
const sendWhatsAppMessage = async (body, targetNumber) => {
    let rawNumber = targetNumber || process.env.ADMIN_PHONE_NUMBER;

    if (!rawNumber) {
        try {
            const db = require('../config/db');
            const [admins] = await db.query("SELECT phone_number FROM users WHERE LOWER(role) = 'admin' AND phone_number IS NOT NULL AND TRIM(phone_number) != '' LIMIT 1");
            if (admins && admins.length > 0 && admins[0].phone_number) {
                rawNumber = admins[0].phone_number;
            }
        } catch (e) {
            console.warn('[WhatsApp Web] Admin phone lookup skipped:', e.message);
        }
    }

    if (!rawNumber) {
        console.log('[WhatsApp Web] No phone number specified and ADMIN_PHONE_NUMBER not set');
        return false;
    }

    if (isVercel || !client) {
        console.log(`[WhatsApp Web Mock] (Serverless Mode) Would send to ${rawNumber}:`, body);
        return { success: true, mocked: true };
    }

    if (!isReady) {
        console.log('[WhatsApp Web] Client not ready yet. Please scan QR code first! Message skipped:', body);
        return false;
    }

    try {
        let cleaned = String(rawNumber).replace(/\D/g, '');
        if (cleaned.length === 10) {
            cleaned = '91' + cleaned;
        }

        const chatId = `${cleaned}@c.us`;
        const result = await client.sendMessage(chatId, body);
        console.log(`📱 [WhatsApp Web] Message sent successfully to ${cleaned}`);
        return { success: true, id: (result && result.id) ? result.id._serialized : 'sent' };
    } catch (error) {
        console.error('Error sending WhatsApp Web message:', error.message);
        return false;
    }
};

const getStatus = () => {
    return {
        isReady,
        isVercel,
        qrDataUrl: latestQrDataUrl,
        hasQr: !!latestQrRaw
    };
};

module.exports = { sendWhatsAppMessage, getStatus, resetWhatsApp };


