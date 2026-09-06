/**
 * Email Notification Service (Backend Nodemailer Client)
 * Replaces EmailJS by sending requests to our dedicated Node.js Nodemailer backend.
 */

const DEFAULT_BACKEND_URL = 'http://localhost:5000';

export const getBackendEmailUrl = () => {
    return (
        import.meta.env.VITE_BACKEND_EMAIL_URL ||
        import.meta.env.VITE_BACKEND_WORKER_URL ||
        DEFAULT_BACKEND_URL
    ).replace(/\/+$/, '');
};

/**
 * Send an email notification via the backend Nodemailer service
 */
export const sendEmailViaBackend = async (emailParams) => {
    const toEmail = emailParams.to || emailParams.to_email || emailParams.email;

    if (!toEmail || !toEmail.includes('@')) {
        console.warn('⚠️ Skipping email: Invalid or missing recipient email address.');
        return { success: false, reason: 'INVALID_RECIPIENT' };
    }

    const backendUrl = getBackendEmailUrl();

    try {
        const payload = {
            to: toEmail,
            subject: emailParams.subject,
            customerName: emailParams.customer_name || emailParams.to_name || emailParams.customerName,
            merchantName: emailParams.merchant_name || emailParams.business_name || emailParams.merchantName,
            merchantPhone: emailParams.merchant_phone || emailParams.phone || emailParams.merchantPhone,
            amount: emailParams.amount != null ? emailParams.amount : emailParams.transaction_amount,
            balance: emailParams.balance != null ? emailParams.balance : emailParams.current_balance,
            txType: emailParams.tx_type || emailParams.txType,
            description: emailParams.description || emailParams.message,
            actionUrl: emailParams.action_url || emailParams.link || emailParams.actionUrl,
            customMessage: emailParams.message,
            attachments: emailParams.attachments
        };

        const response = await fetch(`${backendUrl}/api/send-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || `HTTP ${response.status}: Failed to send email`);
        }

        console.log(`✅ Email sent to ${toEmail}\nSuccess`);
        return { success: true, messageId: data.messageId };
    } catch (err) {
        console.error(`❌ Email failed to ${toEmail}\nFailed: ${err.message}`);
        throw err;
    }
};

/**
 * Checks if the backend SMTP server is online and verified
 */
export const checkSmtpStatus = async () => {
    const backendUrl = getBackendEmailUrl();
    try {
        const response = await fetch(`${backendUrl}/api/email-status`);
        return await response.json();
    } catch (err) {
        return { status: 'OFFLINE', message: err.message, configured: false };
    }
};

/**
 * Sends a test email to verify SMTP configuration
 */
export const testSmtpConnection = async (testRecipient) => {
    const backendUrl = getBackendEmailUrl();
    const response = await fetch(`${backendUrl}/api/test-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testRecipient })
    });
    return await response.json();
};

export default {
    sendEmailViaBackend,
    checkSmtpStatus,
    testSmtpConnection,
    getBackendEmailUrl
};
