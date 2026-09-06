import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sendSmtpEmail } from './smtp.js';
import { generateEmailHtml } from './emailTemplate.js';

const app = new Hono();

// Global CORS Middleware
app.use('*', cors({
    origin: (origin) => {
        // Allow all local dev servers and official production domains
        if (!origin || 
            origin.includes('localhost') || 
            origin.includes('127.0.0.1') || 
            origin.includes('sumanonline.com') ||
            origin.includes('web.app') ||
            origin.includes('firebaseapp.com')) {
            return origin;
        }
        return '*';
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposeHeaders: ['Content-Length', 'X-Custom-Header'],
    maxAge: 86400,
    credentials: true,
}));

const R2_FOLDERS = {
    PROFILE: 'cust_profile_pictures',
    PAYMENT_PROOF: 'payment_proof',
    TRANSACTION: 'transaction_attachments'
};

/**
 * Health check & diagnostic
 */
app.get('/', (c) => {
    return c.json({
        service: 'HisabKhata Cloudflare Worker Backend',
        status: 'ONLINE',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        cdn_url: (c.env.PUBLIC_CDN_URL || 'https://cdn.backend.hisabkhata.sumanonline.com').replace(/^http:\/\//i, 'https://')
    });
});

app.get('/api/health', async (c) => {
    const hasBucket = !!c.env.MY_BUCKET;
    return c.json({
        status: 'HEALTHY',
        r2_connected: hasBucket,
        timestamp: new Date().toISOString()
    });
});

/**
 * Test R2 connection
 */
app.post('/api/test-connection', async (c) => {
    if (!c.env.MY_BUCKET) {
        return c.json({ success: false, message: 'R2 Bucket binding MY_BUCKET is missing in Worker configuration.' }, 500);
    }

    try {
        const testKey = `_diagnostic_test_${Date.now()}.txt`;
        await c.env.MY_BUCKET.put(testKey, 'Test connection from Cloudflare Worker', {
            httpMetadata: { contentType: 'text/plain' }
        });
        await c.env.MY_BUCKET.delete(testKey);

        return c.json({ success: true, message: 'Cloudflare R2 Bucket connection verified successfully!' });
    } catch (err) {
        return c.json({ success: false, message: 'R2 Test Error: ' + err.message }, 500);
    }
});

/**
 * Helper to parse Base64 to ArrayBuffer and content-type
 */
function parseBase64(base64Str) {
    let contentType = 'image/jpeg';
    let rawBase64 = base64Str;

    if (base64Str.includes(';base64,')) {
        const parts = base64Str.split(';base64,');
        contentType = parts[0].replace('data:', '') || 'image/jpeg';
        rawBase64 = parts[1];
    }

    const binaryString = atob(rawBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    return { buffer: bytes.buffer, contentType };
}

/**
 * Upload endpoint (Accepts JSON with Base64 or FormData multipart)
 */
app.post('/api/upload', async (c) => {
    if (!c.env.MY_BUCKET) {
        return c.json({ success: false, error: 'R2 Bucket binding is not configured in Worker.' }, 500);
    }

    const contentTypeHeader = c.req.header('content-type') || '';
    let fileBuffer;
    let contentType = 'image/jpeg';
    let folder = R2_FOLDERS.PROFILE;
    let customFilename = null;

    try {
        if (contentTypeHeader.includes('application/json')) {
            const body = await c.req.json();
            const rawData = body.image || body.file || body.data;
            if (!rawData) {
                return c.json({ success: false, error: 'Missing image/data payload' }, 400);
            }

            folder = body.folder || R2_FOLDERS.PROFILE;
            customFilename = body.filename || null;

            if (typeof rawData === 'string' && rawData.startsWith('data:')) {
                const parsed = parseBase64(rawData);
                fileBuffer = parsed.buffer;
                contentType = parsed.contentType;
            } else {
                return c.json({ success: false, error: 'Unsupported JSON image payload format' }, 400);
            }
        } else if (contentTypeHeader.includes('multipart/form-data')) {
            const formData = await c.req.formData();
            const file = formData.get('file');
            folder = formData.get('folder') || R2_FOLDERS.PROFILE;
            customFilename = formData.get('filename') || null;

            if (!file || typeof file === 'string') {
                return c.json({ success: false, error: 'No valid file attached' }, 400);
            }

            fileBuffer = await file.arrayBuffer();
            contentType = file.type || 'image/jpeg';
        } else {
            // Raw binary stream
            fileBuffer = await c.req.arrayBuffer();
            folder = c.req.query('folder') || R2_FOLDERS.PROFILE;
            customFilename = c.req.query('filename') || null;
            contentType = contentTypeHeader || 'image/jpeg';
        }

        // Determine extension
        let ext = 'jpg';
        if (contentType.includes('png')) ext = 'png';
        else if (contentType.includes('webp')) ext = 'webp';
        else if (contentType.includes('gif')) ext = 'gif';
        else if (contentType.includes('pdf')) ext = 'pdf';

        const timestamp = Date.now();
        const rand = Math.random().toString(36).substring(2, 8);
        const filename = customFilename 
            ? (customFilename.includes('.') ? customFilename : `${customFilename}.${ext}`)
            : `media_${timestamp}_${rand}.${ext}`;

        const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
        const key = `${cleanFolder}/${filename}`;

        // Put into R2 bucket
        await c.env.MY_BUCKET.put(key, fileBuffer, {
            httpMetadata: {
                contentType: contentType,
                cacheControl: 'public, max-age=31536000, immutable'
            }
        });

        const baseUrl = (c.env.PUBLIC_CDN_URL || 'https://cdn.backend.hisabkhata.sumanonline.com').replace(/\/+$/, '').replace(/^http:\/\//i, 'https://');
        const publicUrl = `${baseUrl}/${key}`;

        return c.json({
            success: true,
            url: publicUrl,
            key: key,
            folder: cleanFolder,
            filename: filename,
            contentType: contentType,
            size: fileBuffer.byteLength
        });
    } catch (err) {
        console.error('Upload error in Worker:', err);
        return c.json({ success: false, error: err.message }, 500);
    }
});

/**
 * Delete endpoint
 */
app.post('/api/delete', async (c) => {
    if (!c.env.MY_BUCKET) {
        return c.json({ success: false, error: 'R2 Bucket binding is missing.' }, 500);
    }

    try {
        const body = await c.req.json();
        const target = body.key || body.url;
        if (!target) {
            return c.json({ success: false, error: 'Missing key or url to delete.' }, 400);
        }

        let key = target;
        if (key.startsWith('http')) {
            const baseUrl = (c.env.PUBLIC_CDN_URL || 'https://cdn.backend.hisabkhata.sumanonline.com').replace(/\/+$/, '');
            if (key.startsWith(baseUrl)) {
                key = key.replace(`${baseUrl}/`, '');
            } else {
                const parsedUrl = new URL(key);
                key = parsedUrl.pathname.replace(/^\/+/, '');
            }
        }

        await c.env.MY_BUCKET.delete(key);
        return c.json({ success: true, message: `Deleted ${key} from R2 storage.`, key });
    } catch (err) {
        return c.json({ success: false, error: err.message }, 500);
    }
});

/**
 * Cloudflare Worker Email Status Endpoint
 */
app.get('/api/email-status', async (c) => {
    const hasHost = !!c.env.SMTP_HOST;
    const hasUser = !!c.env.SMTP_USER;
    const hasPass = !!c.env.SMTP_PASS;
    const hasFromEmail = !!c.env.SMTP_FROM_EMAIL;
    const hasSmtpConfig = hasHost && hasUser && hasPass;

    return c.json({
        service: 'HisabKhata Cloudflare Worker Email Service',
        status: hasSmtpConfig ? 'ONLINE' : 'UNCONFIGURED',
        configured: hasSmtpConfig,
        diagnostics: {
            hasHost,
            hasUser,
            hasPass,
            hasFromEmail
        },
        host: c.env.SMTP_HOST || 'Not configured',
        port: c.env.SMTP_PORT || 465,
        fromEmail: c.env.SMTP_FROM_EMAIL || c.env.SMTP_USER || 'Not set',
        timestamp: new Date().toISOString()
    });
});

/**
 * Cloudflare Worker Test Email Endpoint
 */
app.post('/api/test-email', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const recipient = body.testRecipient || c.env.SMTP_USER;

    if (!recipient) {
        return c.json({ success: false, error: 'Recipient email address is required.' }, 400);
    }

    const missing = [];
    if (!c.env.SMTP_HOST) missing.push('SMTP_HOST');
    if (!c.env.SMTP_USER) missing.push('SMTP_USER');
    if (!c.env.SMTP_PASS) missing.push('SMTP_PASS');

    if (missing.length > 0) {
        return c.json({
            success: false,
            error: `Missing: ${missing.join(', ')}. In Cloudflare Dashboard, scroll down and click 'Deploy' / 'Save and Deploy' so secrets take effect on the active worker.`
        }, 500);
    }

    try {
        const result = await sendSmtpEmail({
            host: c.env.SMTP_HOST,
            port: c.env.SMTP_PORT || 465,
            secure: c.env.SMTP_SECURE || true,
            user: c.env.SMTP_USER,
            pass: c.env.SMTP_PASS,
            fromName: c.env.SMTP_FROM_NAME || 'HisabKhata',
            fromEmail: c.env.SMTP_FROM_EMAIL || c.env.SMTP_USER,
            toEmail: recipient,
            subject: 'HisabKhata - SMTP Connection Verified',
            text: 'Your custom SMTP transactional email delivery is operational!',
            html: generateEmailHtml({
                customerName: 'Valued Merchant',
                merchantName: 'HisabKhata System',
                amount: 100,
                balance: 100,
                txType: 'GAVE',
                description: 'Automated test message confirming custom SMTP delivery, secure socket authentication, and responsive template formatting.',
                customMessage: 'Your custom SMTP server connection has been verified successfully. Your transactional email gateway is active and ready to deliver real-time statements.',
                actionUrl: 'https://hisabkhata.sumanonline.com/customer/share/-Ort7aT4tXrZTTb9qSh6'
            })
        });

        return c.json({
            success: true,
            message: `Test email sent successfully to ${recipient}!`,
            result
        });
    } catch (err) {
        console.error('SMTP Test Error:', err);
        return c.json({ success: false, error: err.message }, 500);
    }
});

/**
 * Cloudflare Worker Main Email Sending Endpoint
 */
app.post('/api/send-email', async (c) => {
    let body;
    try {
        body = await c.req.json();
    } catch {
        return c.json({ success: false, error: 'Invalid JSON request body.' }, 400);
    }

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
        customMessage
    } = body;

    const recipient = to || to_email;
    if (!recipient || !recipient.includes('@')) {
        return c.json({ success: false, error: 'Invalid or missing recipient email address.' }, 400);
    }

    if (!c.env.SMTP_HOST || !c.env.SMTP_USER || !c.env.SMTP_PASS) {
        return c.json({
            success: false,
            error: 'SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) are not configured in backend secrets.'
        }, 500);
    }

    try {
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

        const result = await sendSmtpEmail({
            host: c.env.SMTP_HOST,
            port: c.env.SMTP_PORT || 465,
            secure: c.env.SMTP_SECURE || true,
            user: c.env.SMTP_USER,
            pass: c.env.SMTP_PASS,
            fromName: c.env.SMTP_FROM_NAME || 'HisabKhata',
            fromEmail: c.env.SMTP_FROM_EMAIL || c.env.SMTP_USER,
            toEmail: recipient,
            subject: emailSubject,
            text: text || `HisabKhata Statement: ${merchantName || 'Merchant'} has updated your ledger. Visit ${actionUrl || ''} to view.`,
            html: emailHtml
        });

        return c.json({
            success: true,
            recipient,
            message: 'Email delivered successfully via Project SMTP'
        });
    } catch (err) {
        console.error('Project SMTP Error:', err);
        return c.json({
            success: false,
            error: err.message
        }, 500);
    }
});

/**
 * Direct file serving fallback for public R2 assets (Must be last route)
 */
app.get('/:folder/:filename', async (c) => {
    const { folder, filename } = c.req.param();
    if (folder === 'api') {
        return c.text('API endpoint not found', 404);
    }

    const key = `${folder}/${filename}`;

    if (!c.env.MY_BUCKET) {
        return c.text('R2 Bucket not configured', 500);
    }

    const object = await c.env.MY_BUCKET.get(key);
    if (!object) {
        return c.text('File Not Found', 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new Response(object.body, { headers });
});

export default app;

