import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all frontend origins
app.use(cors({
    origin: (origin, callback) => {
        // Allow all local dev servers and official production domains
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

/**
 * Creates Nodemailer Transporter using backend SMTP configuration
 */
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

/**
 * Generates high-fidelity HTML email template matching HisabKhata PRO design system
 */
function generateEmailHtml({
    type,
    customerName,
    merchantName,
    merchantPhone,
    amount,
    balance,
    txType,
    description,
    actionUrl,
    customMessage
}) {
    const isGave = txType === 'Payment Requested' || txType === 'GAVE' || txType === 'credit' || (amount && amount < 0);
    const absAmount = amount != null ? Math.abs(amount).toLocaleString('en-IN') : '0';
    const absBalance = balance != null ? Math.abs(balance).toLocaleString('en-IN') : absAmount;
    const isBalanceDebit = balance != null ? balance < 0 : isGave;
    const merchant = merchantName || 'HisabKhata Merchant';
    const customer = customerName || 'Valued Customer';
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HisabKhata Statement</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    .container { max-width: 580px; margin: 24px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0057BB 0%, #00418c 100%); padding: 32px 28px; text-align: center; color: #ffffff; }
    .brand-title { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin: 0; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
    .pro-badge { background-color: #e53935; color: #ffffff; font-size: 10px; font-weight: 800; padding: 3px 6px; border-radius: 4px; vertical-align: middle; }
    .brand-sub { font-size: 11px; color: #bfdbfe; font-weight: 600; margin-top: 4px; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
    .message-text { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
    .amount-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 24px; text-align: center; margin-bottom: 24px; }
    .amount-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 6px; }
    .amount-val { font-size: 32px; font-weight: 900; color: ${isGave ? '#dc2626' : '#16a34a'}; margin: 0; letter-spacing: -1px; }
    .status-badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 9999px; background-color: ${isGave ? '#fee2e2' : '#dcfce7'}; color: ${isGave ? '#991b1b' : '#166534'}; margin-top: 8px; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
    .info-table td { padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
    .info-label { color: #64748b; font-weight: 600; }
    .info-val { color: #0f172a; font-weight: 700; text-align: right; }
    .notes-box { background-color: #f8fafc; border-left: 4px solid #0057BB; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px; font-size: 13px; color: #334155; line-height: 1.5; white-space: pre-wrap; }
    .btn-container { text-align: center; margin: 32px 0 16px; }
    .btn-primary { display: inline-block; background-color: #0057BB; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-size: 14px; font-weight: 700; box-shadow: 0 4px 12px rgba(0, 87, 187, 0.25); }
    .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.6; }
    .footer-badge { display: inline-block; padding: 3px 10px; background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; font-weight: 700; font-size: 10px; border-radius: 9999px; margin-bottom: 10px; }
    .footer-link { color: #0057BB; font-weight: 700; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="brand-title">
        <span>HisabKhata</span>
        <span class="pro-badge">PRO</span>
      </div>
      <div class="brand-sub">a SumanOnline Project</div>
    </div>

    <!-- Body Content -->
    <div class="content">
      <div class="greeting">Hello ${customer},</div>
      <p class="message-text">
        ${customMessage || (isGave 
            ? `A payment update has been recorded by <strong>${merchant}</strong>.` 
            : `Your payment was successfully received and updated by <strong>${merchant}</strong>.`)}
      </p>

      <!-- Amount Centerpiece -->
      <div class="amount-card">
        <div class="amount-label">${isGave ? 'Amount Due (Gave)' : 'Payment Received (Got)'}</div>
        <div class="amount-val">₹${absAmount}</div>
        <div class="status-badge">${isGave ? 'Payment Pending' : 'Payment Verified / Received'}</div>
      </div>

      <!-- Ledger Summary Breakdown -->
      <table class="info-table">
        <tr>
          <td class="info-label">Current Net Balance:</td>
          <td class="info-val">₹${absBalance} ${isBalanceDebit ? '(Dr / Due)' : '(Cr / Advance)'}</td>
        </tr>
        <tr>
          <td class="info-label">Merchant Name:</td>
          <td class="info-val">${merchant}</td>
        </tr>
        ${merchantPhone ? `
        <tr>
          <td class="info-label">Merchant Contact:</td>
          <td class="info-val">${merchantPhone}</td>
        </tr>` : ''}
        <tr>
          <td class="info-label">Date & Time:</td>
          <td class="info-val">${dateStr}, ${timeStr}</td>
        </tr>
      </table>

      ${description ? `
      <div>
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 6px;">Transaction Remarks & Details:</div>
        <div class="notes-box">${description}</div>
      </div>` : ''}

      <!-- Action Button -->
      ${actionUrl ? `
      <div class="btn-container">
        <a href="${actionUrl}" target="_blank" class="btn-primary">
          View Complete Live Statement & Receipts →
        </a>
      </div>` : ''}
    </div>

    <!-- Footer -->
    <div class="footer">
      <div>
        <span class="footer-badge">✓ VERIFIED DIGITAL STATEMENT</span>
      </div>
      <div>This automated notification is provided for real-time ledger transparency.</div>
      <div style="margin-top: 6px;">
        Platform by <a href="https://sumanonline.com" target="_blank" class="footer-link">SumanOnline.Com</a>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
}

/**
 * Health Check & Status Endpoint
 */
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

/**
 * Test SMTP Connection & Send Test Email
 */
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
                customerName: 'Admin / Merchant',
                merchantName: 'HisabKhata PRO System',
                amount: 100,
                balance: 100,
                txType: 'GAVE',
                description: 'Test message confirming SMTP connection and responsive HTML rendering.',
                customMessage: 'Your custom SMTP server connection has been verified successfully.'
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

/**
 * Main Email Notification Endpoint
 */
app.post('/api/send-email', async (req, res) => {
    const {
        to,
        to_email,
        subject,
        html,
        text,
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
            customerName: customerName || customer_name,
            merchantName: merchantName || merchant_name,
            merchantPhone: merchantPhone || merchant_phone,
            amount: amount,
            balance: balance,
            txType: txType || tx_type,
            description: description,
            actionUrl: actionUrl || action_url,
            customMessage: customMessage
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

// Start Express Server
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 HisabKhata Nodemailer Backend running on port ${PORT}`);
    console.log(`📧 SMTP Server: ${process.env.SMTP_HOST || 'Not configured'} (Port ${process.env.SMTP_PORT || 465})`);
    console.log(`====================================================`);
});

export default app;
