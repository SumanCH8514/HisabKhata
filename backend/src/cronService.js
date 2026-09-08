import { sendSmtpEmail } from './smtp.js';
import { renderPaymentReminderTemplate } from './mail_templates/payment_reminder_mail.js';
import { renderWeeklyNewsletterTemplate } from './mail_templates/weekly_report_mail.js';

const DEFAULT_FIREBASE_DB_URL = 'https://hisabkhata-sumanonline-default-rtdb.asia-southeast1.firebasedatabase.app';
const APP_BASE_URL = 'https://hisabkhata.sumanonline.com';

async function fetchFromFirebase(dbUrl, endpoint) {
  const baseUrl = (dbUrl || DEFAULT_FIREBASE_DB_URL).replace(/\/+$/, '');
  const url = `${baseUrl}/${endpoint.replace(/^\/+/, '')}.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Firebase REST API error [${res.status}]: ${res.statusText}`);
  }
  return await res.json();
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
    results.errors.push('SMTP credentials not configured in environment.');
    return results;
  }

  try {
    const [customersData, usersData, settingsData] = await Promise.all([
      fetchFromFirebase(env.FIREBASE_DB_URL, 'customers').catch(() => ({})),
      fetchFromFirebase(env.FIREBASE_DB_URL, 'users').catch(() => ({})),
      fetchFromFirebase(env.FIREBASE_DB_URL, 'settings').catch(() => ({}))
    ]);

    if (settingsData && settingsData.emailNotifications === false) {
      results.errors.push('Email notifications disabled in global settings.');
      return results;
    }

    const customers = customersData ? Object.entries(customersData).map(([id, c]) => ({ id, ...c })) : [];
    results.totalCustomersScanned = customers.length;

    for (const cust of customers) {
      const balance = Number(cust.balance || cust.netBalance || 0);
      const email = String(cust.email || '').trim();

      if (balance > 0 && email && email.includes('@')) {
        results.eligibleReminders++;
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

        const subject = `Payment Reminder: ₹${Math.abs(balance).toLocaleString('en-IN')} balance due to ${merchantName}`;
        const text = `Hello ${cust.name || 'Customer'}, you have an outstanding balance of ₹${Math.abs(balance).toLocaleString('en-IN')} with ${merchantName}. View statement and pay online: ${actionUrl}`;

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
    results.errors.push('SMTP credentials not configured in environment.');
    return results;
  }

  try {
    const [usersData, customersData, txData, settingsData] = await Promise.all([
      fetchFromFirebase(env.FIREBASE_DB_URL, 'users').catch(() => ({})),
      fetchFromFirebase(env.FIREBASE_DB_URL, 'customers').catch(() => ({})),
      fetchFromFirebase(env.FIREBASE_DB_URL, 'transactions').catch(() => ({})),
      fetchFromFirebase(env.FIREBASE_DB_URL, 'settings').catch(() => ({}))
    ]);

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
        const bal = Number(c.balance || c.netBalance || 0);
        if (bal > 0) {
          totalPendingDues += bal;
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
