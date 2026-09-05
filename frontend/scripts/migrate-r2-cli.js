/**
 * Standalone CLI Script to Migrate Base64 Images in Firebase to Cloudflare R2
 * Usage: node scripts/migrate-r2-cli.js
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, update } from 'firebase/database';
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

const R2_CONFIG = {
    accountId: process.env.VITE_R2_ACCOUNT_ID,
    accessKeyId: process.env.VITE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.VITE_R2_SECRET_ACCESS_KEY,
    bucketName: process.env.VITE_R2_BUCKET_NAME || 'hisabkhata',
    publicUrl: process.env.VITE_R2_PUBLIC_URL || 'http://cdn.backend.hisabkhata.sumanonline.com'
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

const uploadToR2 = async (s3, base64Data, folder, filename) => {
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

async function runMigration() {
    console.log('🚀 Starting Cloudflare R2 Image Migration...\n');
    console.log(`Bucket: ${R2_CONFIG.bucketName}`);
    console.log(`Public CDN: ${R2_CONFIG.publicUrl}`);

    if (!R2_CONFIG.accountId || !R2_CONFIG.accessKeyId || !R2_CONFIG.secretAccessKey) {
        console.error('❌ Missing R2 credentials in .env! Please set VITE_R2_ACCOUNT_ID, VITE_R2_ACCESS_KEY_ID, and VITE_R2_SECRET_ACCESS_KEY.');
        process.exit(1);
    }

    const s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: R2_CONFIG.accessKeyId,
            secretAccessKey: R2_CONFIG.secretAccessKey
        }
    });

    const isBase64 = (str) => typeof str === 'string' && str.startsWith('data:image/');

    try {
        console.log('📦 Fetching data from Firebase RTDB...');
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

        let migratedCount = 0;

        // 1. Users
        console.log('\n👤 Migrating User Profile Photos...');
        for (const [uid, u] of Object.entries(users)) {
            if (isBase64(u.photoURL)) {
                process.stdout.write(`  -> Uploading user ${uid}... `);
                const url = await uploadToR2(s3, u.photoURL, R2_FOLDERS.PROFILE, `user_${uid}_${Date.now()}`);
                await update(ref(db, `users/${uid}`), { photoURL: url, migratedAt: Date.now() });
                console.log(`✅ ${url}`);
                migratedCount++;
            }
        }

        // 2. Customers
        console.log('\n👥 Migrating Customer Profile Photos...');
        for (const [cid, c] of Object.entries(customers)) {
            if (isBase64(c.photoURL)) {
                process.stdout.write(`  -> Uploading customer ${c.name || cid}... `);
                const url = await uploadToR2(s3, c.photoURL, R2_FOLDERS.PROFILE, `cust_${cid}_${Date.now()}`);
                await update(ref(db, `customers/${cid}`), { photoURL: url, migratedAt: Date.now() });
                console.log(`✅ ${url}`);
                migratedCount++;
            }
        }

        // 3. Transactions
        console.log('\n🧾 Migrating Transaction Attachments...');
        for (const [txid, t] of Object.entries(transactions)) {
            if (isBase64(t.attachment)) {
                process.stdout.write(`  -> Uploading tx ${txid}... `);
                const url = await uploadToR2(s3, t.attachment, R2_FOLDERS.TRANSACTION, `tx_${txid}_${Date.now()}`);
                await update(ref(db, `transactions/${txid}`), { attachment: url, migratedAt: Date.now() });
                console.log(`✅ ${url}`);
                migratedCount++;
            }
        }

        // 4. Pending Payments
        console.log('\n💳 Migrating Payment Proof Screenshots...');
        for (const [pid, p] of Object.entries(payments)) {
            if (isBase64(p.screenshot)) {
                process.stdout.write(`  -> Uploading payment proof ${pid}... `);
                const url = await uploadToR2(s3, p.screenshot, R2_FOLDERS.PAYMENT_PROOF, `proof_${pid}_${Date.now()}`);
                await update(ref(db, `pending_payments/${pid}`), { screenshot: url, migratedAt: Date.now() });
                console.log(`✅ ${url}`);
                migratedCount++;
            }
        }

        console.log(`\n🎉 Migration Complete! Total migrated items: ${migratedCount}`);
        process.exit(0);
    } catch (err) {
        console.error('\n❌ Migration failed:', err);
        process.exit(1);
    }
}

runMigration();
