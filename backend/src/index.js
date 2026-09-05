import { Hono } from 'hono';
import { cors } from 'hono/cors';

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
        cdn_url: c.env.PUBLIC_CDN_URL || 'http://cdn.backend.hisabkhata.sumanonline.com'
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

        const baseUrl = (c.env.PUBLIC_CDN_URL || 'http://cdn.backend.hisabkhata.sumanonline.com').replace(/\/+$/, '');
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
            const baseUrl = (c.env.PUBLIC_CDN_URL || 'http://cdn.backend.hisabkhata.sumanonline.com').replace(/\/+$/, '');
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
 * Direct file serving fallback for public R2 assets
 */
app.get('/:folder/:filename', async (c) => {
    const { folder, filename } = c.req.param();
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
