import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, update } from 'firebase/database';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

const BACKEND_WORKER_URL = process.env.VITE_BACKEND_WORKER_URL || 'https://backend.hisabkhata.sumanonline.com';

const R2_CONFIG = {
    accountId: process.env.VITE_R2_ACCOUNT_ID,
    accessKeyId: process.env.VITE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.VITE_R2_SECRET_ACCESS_KEY,
    bucketName: process.env.VITE_R2_BUCKET_NAME || 'hisabkhata',
    publicUrl: process.env.VITE_R2_PUBLIC_URL || 'https://cdn.backend.hisabkhata.sumanonline.com'
};

const R2_FOLDERS = {
    PROFILE: 'cust_profile_pictures',
    PAYMENT_PROOF: 'payment_proof',
    TRANSACTION: 'transaction_attachments'
};

const base64ToBinary = (base64String) => {
    let base64 = base64String;
    let contentType = 'image/jpeg';

    if (base64.includes(';base64,')) {
        const parts = base64.split(';base64,');
        contentType = parts[0].replace('data:', '') || 'image/jpeg';
        base64 = parts[1];
    }

    const buffer = Buffer.from(base64, 'base64');
    return { buffer, contentType };
};

const uploadViaWorker = async (base64Data, folder, filename) => {
    const backendUrl = BACKEND_WORKER_URL.replace(/\/+$/, '');
    const res = await fetch(`${backendUrl}/api/upload`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            image: base64Data,
            folder: folder,
            filename: filename
        })
    });

    if (!res.ok) {
        throw new Error(`Worker HTTP ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    if (!data.success || !data.url) {
        throw new Error(data.error || 'Worker upload returned failure');
    }

    return data.url;
};

const uploadViaS3 = async (s3, base64Data, folder, filename) => {
    const { buffer, contentType } = base64ToBinary(base64Data);

    let ext = 'jpg';
    if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('webp')) ext = 'webp';

    const fullFilename = filename.includes('.') ? filename : `${filename}.${ext}`;
    const key = `${folder}/${fullFilename}`;

    await s3.send(new PutObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType
    }));

    const baseUrl = R2_CONFIG.publicUrl.replace(/\/+$/, '');
    return `${baseUrl}/${key}`;
};

const uploadImage = async (s3, base64Data, folder, filename) => {
    try {
        return await uploadViaWorker(base64Data, folder, filename);
    } catch (workerErr) {
        if (s3) {
            return await uploadViaS3(s3, base64Data, folder, filename);
        }
        throw workerErr;
    }
};

async function runMigration() {
    console.log('🚀 Starting Cloudflare R2 Base64 Image Migration...\n');
    console.log(`Backend API: ${BACKEND_WORKER_URL}`);
    console.log(`Bucket: ${R2_CONFIG.bucketName}`);
    console.log(`Public CDN: ${R2_CONFIG.publicUrl}`);

    // Parse CLI credentials if provided
    const args = process.argv.slice(2);
    let email = process.env.FIREBASE_EMAIL || process.env.VITE_ADMIN_EMAIL || '';
    let password = process.env.FIREBASE_PASSWORD || process.env.VITE_ADMIN_PASSWORD || '';
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--email' && args[i + 1]) email = args[i + 1];
        if (args[i] === '--password' && args[i + 1]) password = args[i + 1];
    }

    if (email && password) {
        try {
            console.log(`🔐 Authenticating as ${email}...`);
            await signInWithEmailAndPassword(auth, email, password);
            console.log('✅ Firebase Authentication Successful!');
        } catch (authErr) {
            console.error(`❌ Authentication failed: ${authErr.message}`);
            process.exit(1);
        }
    } else {
        console.log('ℹ️ Running without explicit credentials. (Tip: pass --email and --password if DB rules require auth)');
    }

    let s3 = null;
    if (R2_CONFIG.accountId && R2_CONFIG.accessKeyId && R2_CONFIG.secretAccessKey) {
        s3 = new S3Client({
            region: 'auto',
            endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: R2_CONFIG.accessKeyId,
                secretAccessKey: R2_CONFIG.secretAccessKey
            }
        });
        console.log('Direct S3 client: Configured ✅');
    } else {
        console.log('Direct S3 credentials not in .env; using Cloudflare Worker API ✅');
    }

    const isBase64 = (str) => typeof str === 'string' && (str.startsWith('data:image/') || str.startsWith('data:application/'));

    try {
        console.log('\n📦 Fetching all collections from Firebase Realtime Database...');
        const [usersSnap, custSnap, txSnap, paySnap] = await Promise.all([
            get(ref(db, 'users')),
            get(ref(db, 'customers')),
            get(ref(db, 'transactions')),
            get(ref(db, 'pending_payments'))
        ]);

        const users = usersSnap.exists() ? usersSnap.val() : {};
        const customers = custSnap.exists() ? custSnap.val() : {};
        const transactions = txSnap.exists() ? txSnap.val() : {};
        const payments = paySnap.exists() ? paySnap.val() : {};

        let totalBase64Found = 0;
        let migratedCount = 0;
        let failedCount = 0;

        // 1. Users
        console.log('\n👤 1. Checking User Profile Photos...');
        for (const [uid, u] of Object.entries(users)) {
            if (isBase64(u.photoURL)) {
                totalBase64Found++;
                process.stdout.write(`  -> Migrating user ${u.name || uid}... `);
                try {
                    const url = await uploadImage(s3, u.photoURL, R2_FOLDERS.PROFILE, `user_${uid}_${Date.now()}`);
                    await update(ref(db, `users/${uid}`), { photoURL: url, migratedAt: Date.now() });
                    console.log(`✅ ${url}`);
                    migratedCount++;
                } catch (err) {
                    console.log(`❌ Error: ${err.message}`);
                    failedCount++;
                }
            }
        }

        // 2. Customers
        console.log('\n👥 2. Checking Customer Profile Photos...');
        for (const [cid, c] of Object.entries(customers)) {
            if (isBase64(c.photoURL)) {
                totalBase64Found++;
                process.stdout.write(`  -> Migrating customer ${c.name || cid}... `);
                try {
                    const url = await uploadImage(s3, c.photoURL, R2_FOLDERS.PROFILE, `cust_${cid}_${Date.now()}`);
                    await update(ref(db, `customers/${cid}`), { photoURL: url, migratedAt: Date.now() });
                    console.log(`✅ ${url}`);
                    migratedCount++;
                } catch (err) {
                    console.log(`❌ Error: ${err.message}`);
                    failedCount++;
                }
            }
        }

        // 3. Transactions
        console.log('\n🧾 3. Checking Transaction Attachments (Bills/Receipts)...');
        for (const [txid, t] of Object.entries(transactions)) {
            if (Array.isArray(t.attachments)) {
                for (let idx = 0; idx < t.attachments.length; idx++) {
                    const att = t.attachments[idx];
                    if (isBase64(att)) {
                        totalBase64Found++;
                        process.stdout.write(`  -> Migrating tx attachment ${txid} [#${idx + 1}]... `);
                        try {
                            const url = await uploadImage(s3, att, R2_FOLDERS.TRANSACTION, `tx_${txid}_${idx}_${Date.now()}`);
                            await update(ref(db, `transactions/${txid}/attachments`), { [idx]: url });
                            if (idx === 0) {
                                await update(ref(db, `transactions/${txid}`), { attachment: url, migratedAt: Date.now() });
                            }
                            console.log(`✅ ${url}`);
                            migratedCount++;
                        } catch (err) {
                            console.log(`❌ Error: ${err.message}`);
                            failedCount++;
                        }
                    }
                }
            } else if (isBase64(t.attachment)) {
                totalBase64Found++;
                process.stdout.write(`  -> Migrating tx attachment ${txid}... `);
                try {
                    const url = await uploadImage(s3, t.attachment, R2_FOLDERS.TRANSACTION, `tx_${txid}_${Date.now()}`);
                    await update(ref(db, `transactions/${txid}`), { attachment: url, migratedAt: Date.now() });
                    console.log(`✅ ${url}`);
                    migratedCount++;
                } catch (err) {
                    console.log(`❌ Error: ${err.message}`);
                    failedCount++;
                }
            }
        }

        // 4. Pending Payments
        console.log('\n💳 4. Checking Payment Proof Screenshots...');
        for (const [pid, p] of Object.entries(payments)) {
            if (isBase64(p.screenshot)) {
                totalBase64Found++;
                process.stdout.write(`  -> Migrating payment proof ${pid}... `);
                try {
                    const url = await uploadImage(s3, p.screenshot, R2_FOLDERS.PAYMENT_PROOF, `proof_${pid}_${Date.now()}`);
                    await update(ref(db, `pending_payments/${pid}`), { screenshot: url, migratedAt: Date.now() });
                    console.log(`✅ ${url}`);
                    migratedCount++;
                } catch (err) {
                    console.log(`❌ Error: ${err.message}`);
                    failedCount++;
                }
            }
        }

        console.log('\n' + '='.repeat(50));
        if (totalBase64Found === 0) {
            console.log('✨ All images in Firebase Database are already on Cloudflare R2 / CDN!');
        } else {
            console.log(`🎉 Migration Completed!`);
            console.log(`   - Base64 items found: ${totalBase64Found}`);
            console.log(`   - Successfully migrated to R2: ${migratedCount}`);
            if (failedCount > 0) {
                console.log(`   - Failed: ${failedCount}`);
            }
        }
        console.log('='.repeat(50) + '\n');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ Fatal migration error:', err);
        process.exit(1);
    }
}

runMigration();
