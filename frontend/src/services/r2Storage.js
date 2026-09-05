import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { db } from './firebase';
import { ref, get, update } from 'firebase/database';

export const R2_FOLDERS = {
    PROFILE: 'cust_profile_pictures',
    PAYMENT_PROOF: 'payment_proof',
    TRANSACTION: 'transaction_attachments'
};

const DEFAULT_BACKEND_URL = 'https://backend.hisabkhata.sumanonline.com';

/**
 * Fetch dynamic R2 configuration from Firebase settings or fall back to .env
 */
export const getR2Config = async () => {
    let settings = {};
    try {
        const snap = await get(ref(db, 'settings/r2'));
        if (snap.exists()) {
            settings = snap.val() || {};
        }
    } catch (e) {
        console.warn('Could not read R2 settings from database, using env:', e.message);
    }

    return {
        backendUrl: settings.backendUrl || import.meta.env.VITE_BACKEND_WORKER_URL || DEFAULT_BACKEND_URL,
        accountId: settings.accountId || import.meta.env.VITE_R2_ACCOUNT_ID || '',
        accessKeyId: settings.accessKeyId || import.meta.env.VITE_R2_ACCESS_KEY_ID || '',
        secretAccessKey: settings.secretAccessKey || import.meta.env.VITE_R2_SECRET_ACCESS_KEY || '',
        bucketName: settings.bucketName || import.meta.env.VITE_R2_BUCKET_NAME || 'hisabkhata',
        publicUrl: settings.publicUrl || import.meta.env.VITE_R2_PUBLIC_URL || 'http://cdn.backend.hisabkhata.sumanonline.com'
    };
};

/**
 * Instantiate direct S3 client for Cloudflare R2 (Fallback)
 */
export const getS3Client = (config) => {
    if (!config.accountId || !config.accessKeyId || !config.secretAccessKey) {
        throw new Error('Cloudflare R2 credentials (Account ID, Access Key, Secret Key) are not configured.');
    }

    return new S3Client({
        region: 'auto',
        endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey
        }
    });
};

/**
 * Helper to convert Base64 string to Uint8Array & MIME type
 */
export const base64ToBinary = (base64String) => {
    let base64 = base64String;
    let contentType = 'image/jpeg';

    if (base64.includes(';base64,')) {
        const parts = base64.split(';base64,');
        contentType = parts[0].replace('data:', '') || 'image/jpeg';
        base64 = parts[1];
    }

    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    return { bytes, contentType };
};

/**
 * Helper to convert File / Blob to Uint8Array & MIME type
 */
export const fileToBinary = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    return {
        bytes: new Uint8Array(arrayBuffer),
        contentType: file.type || 'image/jpeg'
    };
};

/**
 * Helper to convert File/Blob to Base64
 */
export const fileToBase64 = (fileOrBlob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(fileOrBlob);
    });
};

/**
 * Upload an image to Cloudflare R2 via Cloudflare Worker Backend (or Direct S3 fallback)
 * @param {File|Blob|string} fileOrBase64 
 * @param {string} folder - Folder in bucket (e.g., cust_profile_pictures, payment_proof, transaction_attachments)
 * @param {string} [customFilename] - Optional custom filename
 * @param {object} [customConfig] - Optional override config
 * @returns {Promise<string>} Public CDN URL of uploaded file
 */
export const uploadToR2 = async (fileOrBase64, folder = R2_FOLDERS.PROFILE, customFilename = null, customConfig = null) => {
    if (!fileOrBase64) return null;

    // Already a public URL (starts with http)
    if (typeof fileOrBase64 === 'string' && fileOrBase64.startsWith('http')) {
        return fileOrBase64;
    }

    const config = customConfig || await getR2Config();

    // 1. Prepare base64 payload
    let base64Payload = fileOrBase64;
    if (fileOrBase64 instanceof Blob || fileOrBase64 instanceof File) {
        base64Payload = await fileToBase64(fileOrBase64);
    }

    // 2. Try uploading via Cloudflare Worker Backend API (Preferred & Enterprise Secure)
    const backendUrl = (config.backendUrl || DEFAULT_BACKEND_URL).replace(/\/+$/, '');
    if (backendUrl) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

            const res = await fetch(`${backendUrl}/api/upload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    image: base64Payload,
                    folder: folder,
                    filename: customFilename
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                if (data.success && data.url) {
                    return data.url;
                }
            }
        } catch (workerErr) {
            console.warn('Worker upload request failed, attempting direct S3 fallback if configured:', workerErr.message);
        }
    }

    // 3. Fallback to Direct S3 client if worker is unavailable and direct keys exist
    if (config.accountId && config.accessKeyId && config.secretAccessKey) {
        const s3 = getS3Client(config);
        const { bytes, contentType } = base64ToBinary(base64Payload);

        let ext = 'jpg';
        if (contentType.includes('png')) ext = 'png';
        else if (contentType.includes('webp')) ext = 'webp';
        else if (contentType.includes('gif')) ext = 'gif';
        else if (contentType.includes('pdf')) ext = 'pdf';

        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const filename = customFilename 
            ? (customFilename.includes('.') ? customFilename : `${customFilename}.${ext}`)
            : `media_${timestamp}_${randomStr}.${ext}`;

        const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
        const key = `${cleanFolder}/${filename}`;

        await s3.send(new PutObjectCommand({
            Bucket: config.bucketName,
            Key: key,
            Body: bytes,
            ContentType: contentType
        }));

        const baseUrl = (config.publicUrl || 'http://cdn.backend.hisabkhata.sumanonline.com').replace(/\/+$/, '');
        return `${baseUrl}/${key}`;
    }

    throw new Error('Unable to upload image: Cloudflare Worker backend is unreachable and direct R2 S3 keys are not provided.');
};

/**
 * Delete a file from Cloudflare R2 given its public URL or key
 */
export const deleteFromR2 = async (fileUrlOrKey, customConfig = null) => {
    if (!fileUrlOrKey) return;
    try {
        const config = customConfig || await getR2Config();
        const backendUrl = (config.backendUrl || DEFAULT_BACKEND_URL).replace(/\/+$/, '');

        // Try via Worker
        if (backendUrl) {
            try {
                const res = await fetch(`${backendUrl}/api/delete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: fileUrlOrKey })
                });
                if (res.ok) return;
            } catch (wErr) {
                console.warn('Worker delete failed, using direct S3 fallback:', wErr.message);
            }
        }

        // Direct S3 fallback
        if (config.accountId && config.accessKeyId && config.secretAccessKey) {
            const s3 = getS3Client(config);

            let key = fileUrlOrKey;
            if (key.startsWith('http')) {
                const baseUrl = (config.publicUrl || '').replace(/\/+$/, '');
                if (baseUrl && key.startsWith(baseUrl)) {
                    key = key.replace(`${baseUrl}/`, '');
                } else {
                    const urlObj = new URL(key);
                    key = urlObj.pathname.replace(/^\/+/, '');
                }
            }

            await s3.send(new DeleteObjectCommand({
                Bucket: config.bucketName,
                Key: key
            }));
        }
    } catch (e) {
        console.error('Failed to delete file from R2:', e);
    }
};

/**
 * Test R2 connection with the given config
 */
export const testR2Connection = async (config) => {
    const backendUrl = (config.backendUrl || DEFAULT_BACKEND_URL).replace(/\/+$/, '');

    // 1. Test via Worker
    if (backendUrl) {
        try {
            const res = await fetch(`${backendUrl}/api/test-connection`, {
                method: 'POST'
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    return { success: true, message: 'Cloudflare Worker Backend (' + backendUrl + ') is connected to R2 successfully!' };
                }
            }
        } catch (workerErr) {
            // Check health
            try {
                const healthRes = await fetch(`${backendUrl}/api/health`);
                if (healthRes.ok) {
                    return { success: true, message: 'Cloudflare Worker is ONLINE at ' + backendUrl };
                }
            } catch (hErr) {}
        }
    }

    // 2. Direct S3 test
    if (config.accountId && config.accessKeyId && config.secretAccessKey) {
        try {
            const s3 = getS3Client(config);
            const testKey = `_test_connection_${Date.now()}.txt`;
            const testData = new TextEncoder().encode('R2 Connection Verified at ' + new Date().toISOString());

            await s3.send(new PutObjectCommand({
                Bucket: config.bucketName,
                Key: testKey,
                Body: testData,
                ContentType: 'text/plain'
            }));

            await s3.send(new DeleteObjectCommand({
                Bucket: config.bucketName,
                Key: testKey
            }));

            return { success: true, message: 'Direct S3 Connection to Cloudflare R2 established successfully!' };
        } catch (error) {
            return { success: false, message: error.message || 'Failed to connect to Cloudflare R2.' };
        }
    }

    return { 
        success: false, 
        message: 'Could not reach Cloudflare Worker at ' + backendUrl + ' and direct S3 credentials are not configured.' 
    };
};

/**
 * Full Migration Utility:
 * Scans Firebase RTDB users, customers, transactions, pending_payments for base64 images
 * and migrates them to R2 storage with public URLs.
 */
export const migrateAllBase64ToR2 = async (onProgress = () => {}, customConfig = null) => {
    const config = customConfig || await getR2Config();
    const stats = {
        totalScanned: 0,
        totalMigrated: 0,
        skipped: 0,
        errors: [],
        users: 0,
        customers: 0,
        transactions: 0,
        pendingPayments: 0
    };

    const isBase64 = (str) => typeof str === 'string' && str.startsWith('data:image/');

    try {
        onProgress({ status: 'FETCHING', message: 'Fetching all records from Firebase database...' });

        // 1. Users
        const usersSnap = await get(ref(db, 'users'));
        const usersData = usersSnap.exists() ? usersSnap.val() : {};

        // 2. Customers
        const customersSnap = await get(ref(db, 'customers'));
        const customersData = customersSnap.exists() ? customersSnap.val() : {};

        // 3. Transactions
        const transactionsSnap = await get(ref(db, 'transactions'));
        const transactionsData = transactionsSnap.exists() ? transactionsSnap.val() : {};

        // 4. Pending Payments
        const paymentsSnap = await get(ref(db, 'pending_payments'));
        const paymentsData = paymentsSnap.exists() ? paymentsSnap.val() : {};

        // Collect items that need migration
        const migrationQueue = [];

        Object.entries(usersData).forEach(([uid, user]) => {
            stats.totalScanned++;
            if (isBase64(user?.photoURL)) {
                migrationQueue.push({
                    type: 'USER_PHOTO',
                    id: uid,
                    field: 'photoURL',
                    dbPath: `users/${uid}`,
                    folder: R2_FOLDERS.PROFILE,
                    customFilename: `user_${uid}_${Date.now()}`,
                    data: user.photoURL,
                    label: `User Profile: ${user.name || user.email || uid}`
                });
            } else {
                stats.skipped++;
            }
        });

        Object.entries(customersData).forEach(([cid, customer]) => {
            stats.totalScanned++;
            if (isBase64(customer?.photoURL)) {
                migrationQueue.push({
                    type: 'CUSTOMER_PHOTO',
                    id: cid,
                    field: 'photoURL',
                    dbPath: `customers/${cid}`,
                    folder: R2_FOLDERS.PROFILE,
                    customFilename: `cust_${cid}_${Date.now()}`,
                    data: customer.photoURL,
                    label: `Customer Photo: ${customer.name || cid}`
                });
            } else {
                stats.skipped++;
            }
        });

        Object.entries(transactionsData).forEach(([txid, tx]) => {
            stats.totalScanned++;
            if (Array.isArray(tx?.attachments)) {
                tx.attachments.forEach((att, idx) => {
                    if (isBase64(att)) {
                        migrationQueue.push({
                            type: 'TRANSACTION_ATTACHMENT',
                            id: `${txid}_${idx}`,
                            field: 'attachments',
                            isArrayField: true,
                            arrayIndex: idx,
                            dbPath: `transactions/${txid}`,
                            folder: R2_FOLDERS.TRANSACTION,
                            customFilename: `tx_${txid}_${idx}_${Date.now()}`,
                            data: att,
                            label: `Transaction Attachment #${idx + 1}: ${txid}`
                        });
                    }
                });
            } else if (isBase64(tx?.attachment)) {
                migrationQueue.push({
                    type: 'TRANSACTION_ATTACHMENT',
                    id: txid,
                    field: 'attachment',
                    dbPath: `transactions/${txid}`,
                    folder: R2_FOLDERS.TRANSACTION,
                    customFilename: `tx_${txid}_${Date.now()}`,
                    data: tx.attachment,
                    label: `Transaction Attachment: ${txid}`
                });
            } else {
                stats.skipped++;
            }
        });

        Object.entries(paymentsData).forEach(([pid, payment]) => {
            stats.totalScanned++;
            if (isBase64(payment?.screenshot)) {
                migrationQueue.push({
                    type: 'PAYMENT_PROOF',
                    id: pid,
                    field: 'screenshot',
                    dbPath: `pending_payments/${pid}`,
                    folder: R2_FOLDERS.PAYMENT_PROOF,
                    customFilename: `proof_${pid}_${Date.now()}`,
                    data: payment.screenshot,
                    label: `Payment Proof: ${pid}`
                });
            } else {
                stats.skipped++;
            }
        });

        const totalItems = migrationQueue.length;
        if (totalItems === 0) {
            onProgress({ status: 'COMPLETED', progress: 100, message: 'All images are already migrated to CDN/R2!', stats });
            return stats;
        }

        onProgress({ 
            status: 'MIGRATING', 
            progress: 0, 
            total: totalItems, 
            message: `Found ${totalItems} base64 images to migrate. Starting upload...` 
        });

        for (let i = 0; i < totalItems; i++) {
            const item = migrationQueue[i];
            const currentProgress = Math.round(((i + 1) / totalItems) * 100);

            try {
                onProgress({
                    status: 'UPLOADING',
                    current: i + 1,
                    total: totalItems,
                    progress: currentProgress,
                    itemLabel: item.label,
                    message: `Migrating (${i + 1}/${totalItems}): ${item.label}...`
                });

                // 1. Upload to R2
                const publicUrl = await uploadToR2(item.data, item.folder, item.customFilename, config);

                // 2. Update Firebase DB record
                if (item.isArrayField) {
                    await update(ref(db, `${item.dbPath}/attachments`), {
                        [item.arrayIndex]: publicUrl
                    });
                    if (item.arrayIndex === 0) {
                        await update(ref(db, item.dbPath), { attachment: publicUrl, migratedAt: Date.now() });
                    }
                } else {
                    await update(ref(db, item.dbPath), {
                        [item.field]: publicUrl,
                        migratedAt: Date.now()
                    });
                }

                stats.totalMigrated++;
                if (item.type === 'USER_PHOTO') stats.users++;
                else if (item.type === 'CUSTOMER_PHOTO') stats.customers++;
                else if (item.type === 'TRANSACTION_ATTACHMENT') stats.transactions++;
                else if (item.type === 'PAYMENT_PROOF') stats.pendingPayments++;

            } catch (err) {
                console.error(`Migration error for ${item.label}:`, err);
                stats.errors.push({ item: item.label, error: err.message });
            }
        }

        onProgress({ 
            status: 'COMPLETED', 
            progress: 100, 
            message: `Migration finished! Migrated ${stats.totalMigrated} of ${totalItems} items.`, 
            stats 
        });

        return stats;
    } catch (globalError) {
        onProgress({ status: 'ERROR', message: globalError.message });
        throw globalError;
    }
};
