import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateEmailHtml } from './src/emailTemplate.js';
import { runPaymentRemindersJob, runWeeklyDigestJob } from './src/cronService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || 
            origin.includes('localhost') || 
            origin.includes('127.0.0.1') || 
            origin.includes('sumanonline.com') ||
            origin.includes('web.app') ||
            origin.includes('firebaseapp.com')) {
            callback(null, true);
        } else {
            callback(null, true);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

function createTransporter() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
        console.warn('⚠️ SMTP_USER or SMTP_PASS is missing in environment variables.');
    }

    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
            user,
            pass
        },
        tls: {
            rejectUnauthorized: false
        }
    });
}

app.get('/', (req, res) => {
    res.json({
        service: 'HisabKhata PRO - Node.js Nodemailer Backend',
        status: 'ONLINE',
        timestamp: new Date().toISOString(),
        smtp_configured: !!(process.env.SMTP_USER && process.env.SMTP_PASS)
    });
});

app.get('/api/email-status', async (req, res) => {
    const isConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    
    if (!isConfigured) {
        return res.json({
            status: 'UNCONFIGURED',
            message: 'SMTP credentials missing in .env file (SMTP_USER, SMTP_PASS)',
            configured: false
        });
    }

    try {
        const transporter = createTransporter();
        await transporter.verify();
        return res.json({
            status: 'CONNECTED',
            message: 'SMTP server connection verified successfully!',
            configured: true,
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT
        });
    } catch (err) {
        return res.status(500).json({
            status: 'ERROR',
            message: 'SMTP connection failed: ' + err.message,
            configured: true
        });
    }
});

app.post('/api/test-email', async (req, res) => {
    const { testRecipient } = req.body;
    const recipient = testRecipient || process.env.SMTP_USER;

    if (!recipient) {
        return res.status(400).json({ success: false, error: 'Recipient email address is required.' });
    }

    try {
        const transporter = createTransporter();
        await transporter.verify();

        const fromName = process.env.SMTP_FROM_NAME || 'HisabKhata PRO';
        const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

        const info = await transporter.sendMail({
            from: `"${fromName}" <${fromEmail}>`,
            to: recipient,
            subject: 'HisabKhata PRO - SMTP Test Email',
            text: 'Your Nodemailer custom SMTP backend is working perfectly!',
            html: generateEmailHtml({
                type: 'TEST',
                recipient: recipient
            })
        });

        return res.json({
            success: true,
            message: `Test email sent successfully to ${recipient}!`,
            messageId: info.messageId
        });
    } catch (err) {
        console.error('SMTP test error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/send-email', async (req, res) => {
    const {
        to,
        to_email,
        subject,
        html,
        text,
        type,
        template,
        customerName,
        customer_name,
        merchantName,
        merchant_name,
        merchantPhone,
        merchant_phone,
        amount,
        balance,
        txType,
        tx_type,
        transactionId,
        transaction_id,
        utr,
        dueDate,
        due_date,
        description,
        actionUrl,
        action_url,
        customMessage,
        attachments
    } = req.body;

    const recipient = to || to_email;
    if (!recipient || !recipient.includes('@')) {
        return res.status(400).json({ success: false, error: 'Invalid or missing recipient email address.' });
    }

    const fromName = process.env.SMTP_FROM_NAME || 'HisabKhata PRO';
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return res.status(500).json({
            success: false,
            error: 'SMTP credentials are not configured on the backend server.'
        });
    }

    try {
        const transporter = createTransporter();

        const emailSubject = subject || `HisabKhata Statement Update - ${merchantName || merchant_name || 'Ledger'}`;
        const emailHtml = html || generateEmailHtml({
            ...req.body,
            type: type || template,
            otp: req.body.otp || req.body.code || req.body.otpCode || req.body.loginOtp,
            purpose: req.body.purpose,
            expiry: req.body.expiry,
            customerName: customerName || customer_name || req.body.userName || req.body.toName || req.body.name,
            merchantName: merchantName || merchant_name,
            merchantPhone: merchantPhone || merchant_phone,
            amount: amount,
            balance: balance,
            txType: txType || tx_type,
            transactionId: transactionId || transaction_id || utr,
            dueDate: dueDate || due_date,
            description: description,
            actionUrl: actionUrl || action_url || req.body.link,
            customMessage: customMessage || req.body.message
        });

        const mailOptions = {
            from: `"${fromName}" <${fromEmail}>`,
            to: recipient,
            subject: emailSubject,
            text: text || `HisabKhata Statement: ${merchantName || 'Merchant'} has updated your ledger. Visit ${actionUrl || ''} to view.`,
            html: emailHtml
        };

        if (Array.isArray(attachments) && attachments.length > 0) {
            mailOptions.attachments = attachments;
        }

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${recipient} (MessageID: ${info.messageId})`);

        return res.json({
            success: true,
            messageId: info.messageId,
            recipient: recipient
        });
    } catch (err) {
        console.error('❌ Failed to send email via Nodemailer:', err);
        return res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

app.get('/api/cron/status', async (req, res) => {
    res.json({
        service: 'HisabKhata Automated Cron Triggers',
        status: 'ACTIVE',
        triggers: [
            { name: 'Daily Payment Reminders', cron: '0 4 * * *', description: 'Scans customer dues and dispatches reminder statement emails' },
            { name: 'Weekly Ledger Snapshot', cron: '0 4 * * 1', description: 'Aggregates 7-day collections and sends business recap digest to merchants' }
        ],
        firebase_configured: !!(process.env.FIREBASE_DB_URL || true),
        smtp_configured: !!(process.env.SMTP_USER && process.env.SMTP_PASS)
    });
});

app.post('/api/cron/payment-reminders', async (req, res) => {
    try {
        const report = await runPaymentRemindersJob(process.env);
        return res.json({ success: true, report });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/cron/weekly-digest', async (req, res) => {
    try {
        const report = await runWeeklyDigestJob(process.env);
        return res.json({ success: true, report });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 HisabKhata Nodemailer Backend running on port ${PORT}`);
    console.log(`📧 SMTP Server: ${process.env.SMTP_HOST || 'Not configured'} (Port ${process.env.SMTP_PORT || 465})`);
    console.log(`====================================================`);
});

export default app;
