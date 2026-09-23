import { sendSmtpEmail } from './smtp.js';
import { renderPaymentReminderTemplate } from './mail_templates/payment_reminder_mail.js';
import { renderWeeklyNewsletterTemplate } from './mail_templates/weekly_report_mail.js';

const DEFAULT_FIREBASE_DB_URL = 'https://hisabkhata-sumanonline-default-rtdb.asia-southeast1.firebasedatabase.app';
const APP_BASE_URL = 'https://hisabkhata.sumanonline.com';

async function fetchFromFirebase(dbUrl, endpoint, env = {}) {
  const baseUrl = (dbUrl || DEFAULT_FIREBASE_DB_URL).replace(/\/+$/, '');
  let url = `${baseUrl}/${endpoint.replace(/^\/+/, '')}.json`;
  
  const authSecret = env.FIREBASE_DB_SECRET || env.FIREBASE_AUTH_TOKEN || env.FIREBASE_SECRET;
  if (authSecret) {
    url += `?auth=${encodeURIComponent(authSecret)}`;
  }

  const res = await fetch(url);
  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new Error(`Firebase [${endpoint}] error [${res.status}]: ${res.statusText} ${errorBody}`);
  }
  const data = await res.json();
  return data || {};
}

function sendEmailHelper(env, toEmail, subject, html, text) {
  return sendSmtpEmail({
    host: env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(env.SMTP_PORT || '465', 10),
    secure: String(env.SMTP_SECURE) === 'true' || parseInt(env.SMTP_PORT, 10) === 465,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    fromName: env.SMTP_FROM_NAME || 'HisabKhata PRO',
    fromEmail: env.SMTP_FROM_EMAIL || env.SMTP_USER,
    toEmail,
    subject,
    text,
    html
  });
}

export async function runPaymentRemindersJob(env = {}) {
  const startTime = Date.now();
  const results = {
    job: 'payment_reminders',
    timestamp: new Date().toISOString(),
    totalCustomersScanned: 0,
    eligibleReminders: 0,
    sent: 0,
    failed: 0,
    errors: []
  };

  if (!env.SMTP_USER || !env.SMTP_PASS) {
    results.errors.push('SMTP credentials not configured in environment (SMTP_USER / SMTP_PASS).');
    return results;
  }

  try {
    let customersData = {};
    let usersData = {};
    let settingsData = {};

    try {
      customersData = await fetchFromFirebase(env.FIREBASE_DB_URL, 'customers', env);
    } catch (err) {
      results.errors.push(`Failed to fetch customers: ${err.message}`);
    }

    try {
      usersData = await fetchFromFirebase(env.FIREBASE_DB_URL, 'users', env);
    } catch (err) {
      results.errors.push(`Failed to fetch users: ${err.message}`);
    }

    try {
      settingsData = await fetchFromFirebase(env.FIREBASE_DB_URL, 'settings', env);
    } catch (err) {
    }

    if (settingsData && settingsData.emailNotifications === false) {
      results.errors.push('Email notifications disabled in global settings.');
      return results;
    }

    const customers = customersData ? Object.entries(customersData).map(([id, c]) => ({ id, ...c })) : [];
    results.totalCustomersScanned = customers.length;

    for (const cust of customers) {
      const rawBalance = Number(cust.balance ?? cust.netBalance ?? 0);
      const email = String(cust.email || '').trim();

      if (rawBalance < 0 && email && email.includes('@')) {
        results.eligibleReminders++;
        const balance = Math.abs(rawBalance);
        const merchant = (usersData && cust.userId && usersData[cust.userId]) ? usersData[cust.userId] : {};
        const merchantName = merchant.businessName || merchant.name || cust.merchantName || 'Your Merchant';
        const merchantPhone = merchant.phone || cust.merchantPhone || '';
        const actionUrl = `${APP_BASE_URL}/customer/share/${cust.id}`;
        const dueDate = cust.dueDate || cust.paymentDueDate || '';

        const html = renderPaymentReminderTemplate({
          customerName: cust.name || 'Valued Customer',
          merchantName,
          merchantPhone,
          balance,
          dueDate,
          actionUrl
        });

        const subject = `Payment Reminder: ₹${balance.toLocaleString('en-IN')} balance due to ${merchantName}`;
        const text = `Hello ${cust.name || 'Customer'}, you have an outstanding balance of ₹${balance.toLocaleString('en-IN')} with ${merchantName}. View statement and pay online: ${actionUrl}`;

        try {
          await sendEmailHelper(env, email, subject, html, text);
          results.sent++;
        } catch (sendErr) {
          results.failed++;
          results.errors.push(`Failed for customer ${cust.id} (${email}): ${sendErr.message}`);
        }
      }
    }
  } catch (err) {
    results.errors.push(`Execution error: ${err.message}`);
  }

  results.durationMs = Date.now() - startTime;
  return results;
}

export async function runWeeklyDigestJob(env = {}) {
  const startTime = Date.now();
  const results = {
    job: 'weekly_digest',
    timestamp: new Date().toISOString(),
    totalMerchantsScanned: 0,
    sent: 0,
    failed: 0,
    errors: []
  };

  if (!env.SMTP_USER || !env.SMTP_PASS) {
    results.errors.push('SMTP credentials not configured in environment (SMTP_USER / SMTP_PASS).');
    return results;
  }

  try {
    let usersData = {};
    let customersData = {};
    let txData = {};
    let settingsData = {};

    try {
      usersData = await fetchFromFirebase(env.FIREBASE_DB_URL, 'users', env);
    } catch (err) {
      results.errors.push(`Failed to fetch users: ${err.message}`);
    }

    try {
      customersData = await fetchFromFirebase(env.FIREBASE_DB_URL, 'customers', env);
    } catch (err) {
      results.errors.push(`Failed to fetch customers: ${err.message}`);
    }

    try {
      txData = await fetchFromFirebase(env.FIREBASE_DB_URL, 'transactions', env);
    } catch (err) {
      results.errors.push(`Failed to fetch transactions: ${err.message}`);
    }

    try {
      settingsData = await fetchFromFirebase(env.FIREBASE_DB_URL, 'settings', env);
    } catch (err) {
    }

    if (settingsData && settingsData.emailNotifications === false) {
      results.errors.push('Email notifications disabled in global settings.');
      return results;
    }

    const users = usersData ? Object.entries(usersData).map(([id, u]) => ({ id, ...u })) : [];
    const allCustomers = customersData ? Object.values(customersData) : [];
    const allTransactions = txData ? Object.values(txData) : [];
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    results.totalMerchantsScanned = users.length;

    for (const user of users) {
      const email = String(user.email || '').trim();
      if (!email || !email.includes('@')) continue;

      const userCustomers = allCustomers.filter(c => c && c.userId === user.id);
      const userTransactions = allTransactions.filter(t => t && t.userId === user.id);

      let weeklyCollections = 0;
      for (const tx of userTransactions) {
        const txTime = Number(tx.timestamp || tx.date || tx.createdAt || 0);
        if (txTime >= oneWeekAgo) {
          const type = String(tx.type || tx.txType || '').toUpperCase();
          if (type === 'GOT' || type === 'CREDIT' || type === 'RECEIVED') {
            weeklyCollections += Math.abs(Number(tx.amount || 0));
          }
        }
      }

      let totalPendingDues = 0;
      for (const c of userCustomers) {
        const bal = Number(c.balance ?? c.netBalance ?? 0);
        if (bal < 0) {
          totalPendingDues += Math.abs(bal);
        }
      }

      const activeCustomersCount = userCustomers.length;
      const userName = user.businessName || user.name || 'Merchant';
      const actionUrl = `${APP_BASE_URL}/admin`;

      const html = renderWeeklyNewsletterTemplate({
        userName,
        totalCollections: weeklyCollections,
        activeCustomers: activeCustomersCount,
        pendingSettlements: totalPendingDues,
        proTip: 'Share itemized PDF statements and UPI QR links with your customers on WhatsApp for 3x faster payment collections.',
        actionUrl
      });

      const subject = `Weekly Ledger Snapshot: ₹${weeklyCollections.toLocaleString('en-IN')} collected this week - HisabKhata`;
      const text = `Hello ${userName}, here is your weekly summary on HisabKhata: Collected: ₹${weeklyCollections.toLocaleString('en-IN')}, Active Ledgers: ${activeCustomersCount}, Pending Dues: ₹${totalPendingDues.toLocaleString('en-IN')}. Dashboard: ${actionUrl}`;

      try {
        await sendEmailHelper(env, email, subject, html, text);
        results.sent++;
      } catch (sendErr) {
        results.failed++;
        results.errors.push(`Failed for merchant ${user.id} (${email}): ${sendErr.message}`);
      }
    }
  } catch (err) {
    results.errors.push(`Execution error: ${err.message}`);
  }

  results.durationMs = Date.now() - startTime;
  return results;
}
