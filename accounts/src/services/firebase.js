import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getDatabase, ref, set, get, push, update, remove, onValue, query, orderByChild, equalTo } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

import emailjs from '@emailjs/browser';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

/**
 * Helper to send emails from frontend using EmailJS.
 */
const sendEmailNotification = async (templateParams) => {
  try {
    // Basic email validation
    if (!templateParams.to_email || !templateParams.to_email.includes('@')) {
      console.warn("Skipping email: Invalid or empty recipient address.");
      return;
    }

    const settingsSnap = await get(ref(db, 'settings'));
    const settings = settingsSnap.val() || {};

    if (settings.emailNotifications === false) return;

    const config = settings.emailjs;
    if (!config || !config.serviceId || !config.templateId || !config.publicKey) {
      console.warn("EmailJS not configured in Admin Console.");
      return;
    }

    await emailjs.send(
      config.serviceId,
      config.templateId,
      templateParams,
      config.publicKey
    );
    console.log("Email sent successfully! ✅");
  } catch (error) {
    console.log("Email not sent ! ❌");
  }
};

// Authentication Service
export const authService = {
  register: async (name, email, password, phone) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await updateProfile(user, { displayName: name });

    // Create user profile in Realtime Database
    await set(ref(db, `users/${user.uid}`), {
      name: name,
      email: email,
      phone: phone || '',
      role: 'user', // Default role
      createdAt: Date.now()
    });

    // Send Welcome Email (Frontend)
    sendEmailNotification({
      to_email: email,
      to_name: name,
      subject: 'Welcome to HisabKhata!',
      message: `Hello ${name}, welcome to HisabKhata! We are excited to help you manage your financial ledger securely.`,
      type: 'WELCOME'
    });

    return user;
  },
  login: async (email, password) => {
    return await signInWithEmailAndPassword(auth, email, password);
  },
  logout: async () => {
    return await signOut(auth);
  },
  onAuthStateChanged: (callback) => {
    return onAuthStateChanged(auth, callback);
  },
  loginWithGoogle: async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if user already exists in DB
    const userSnap = await get(ref(db, `users/${user.uid}`));

    if (!userSnap.exists()) {
      // New user from Google, create profile
      await set(ref(db, `users/${user.uid}`), {
        name: user.displayName || 'Google User',
        email: user.email,
        photoURL: user.photoURL || '',
        phone: user.phoneNumber || '',
        role: 'user',
        createdAt: Date.now()
      });

      // Send Welcome Email
      sendEmailNotification({
        to_email: user.email,
        to_name: user.displayName || 'Google User',
        subject: 'Welcome to HisabKhata!',
        message: `Hello ${user.displayName || 'User'}, welcome to HisabKhata! We are excited to help you manage your financial ledger securely.`,
        type: 'WELCOME'
      });
    }

    return user;
  }
};

// Database Service
export const dbService = {
  // Customers
  addCustomer: async (userId, customerData) => {
    const customerRef = push(ref(db, 'customers'));
    const newCustomer = {
      ...customerData,
      userId,
      createdAt: Date.now()
    };
    await set(customerRef, newCustomer);

    // Send "Added as Customer" Email
    if (newCustomer.email) {
      try {
        const userSnap = await get(ref(db, `users/${userId}`));
        const merchant = userSnap.val() || {};
        await sendEmailNotification({
          to_email: newCustomer.email,
          to_name: newCustomer.name,
          subject: 'New Ledger Created - HisabKhata',
          message: `You have been added as a customer on HisabKhata by ${merchant.name || 'a merchant'} (Phone: ${merchant.phone || 'N/A'}).`,
          merchant_name: merchant.name,
          merchant_phone: merchant.phone || 'N/A',
          type: 'CUSTOMER_ADDED'
        });
      } catch (err) {
        console.error("Failed to trigger customer add email:", err);
      }
    }

    return customerRef.key;
  },

  // Alias for backward compatibility
  createCustomer: async (userId, customerData) => {
    return dbService.addCustomer(userId, customerData);
  },

  updateCustomer: async (customerId, customerData) => {
    await update(ref(db, `customers/${customerId}`), { ...customerData, updatedAt: Date.now() });
  },

  deleteCustomer: async (customerId) => {
    try {
      // 1. Delete associated transactions
      const transactionsQuery = query(ref(db, 'transactions'), orderByChild('customerId'), equalTo(customerId));
      const snapshot = await get(transactionsQuery);
      if (snapshot.exists()) {
        const transactionsRef = ref(db, 'transactions');
        const updates = {};
        snapshot.forEach((child) => {
          updates[child.key] = null;
        });
        await update(transactionsRef, updates);
      }

      // 2. Delete customer node
      await remove(ref(db, `customers/${customerId}`));
      return true;
    } catch (error) {
      console.error('Error in deleteCustomer:', error);
      throw error;
    }
  },

  getCustomer: async (customerId) => {
    const snapshot = await get(ref(db, `customers/${customerId}`));
    return snapshot.exists() ? { id: snapshot.key, ...snapshot.val() } : null;
  },

  listenUserCustomers: (userId, callback) => {
    const customersQuery = query(ref(db, 'customers'), orderByChild('userId'), equalTo(userId));
    return onValue(customersQuery, (snapshot) => {
      const customers = [];
      snapshot.forEach((childSnapshot) => {
        customers.push({ id: childSnapshot.key, ...childSnapshot.val() });
      });
      callback(customers);
    });
  },

  // Listen to a single customer (for CustomerLedgerDetail)
  listenCustomer: (customerId, callback) => {
    return onValue(ref(db, `customers/${customerId}`), (snapshot) => {
      if (snapshot.exists()) callback({ id: snapshot.key, ...snapshot.val() });
    });
  },

  // Transactions
  addTransaction: async (userId, customerId, transactionData) => {
    const transactionRef = push(ref(db, 'transactions'));

    // Get current customer balance
    const customerSnapshot = await get(ref(db, `customers/${customerId}`));
    let newBalance = 0;
    let customerName = '';
    let customerEmail = '';

    if (customerSnapshot.exists()) {
      const customer = customerSnapshot.val();
      newBalance = Number(customer.balance || 0) + Number(transactionData.amount);
      customerName = customer.name;
      customerEmail = customer.email;
    }

    const newTransaction = {
      ...transactionData,
      userId,
      customerId,
      balance: newBalance,
      timestamp: Date.now()
    };
    await set(transactionRef, newTransaction);

    await update(ref(db, `customers/${customerId}`), {
      balance: newBalance,
      updatedAt: Date.now()
    });

    // Send Transaction Alert
    if (customerEmail) {
      try {
        const typeStr = transactionData.type === 'GOT' ? 'Payment Received' : 'Credit Given';
        const userSnap = await get(ref(db, `users/${userId}`));
        const merchant = userSnap.val() || {};

        await sendEmailNotification({
          to_email: customerEmail,
          to_name: customerName,
          subject: `Transaction Alert: ₹${Math.abs(transactionData.amount)} - HisabKhata`,
          message: `A new transaction has been recorded on your account.\nType: ${typeStr}\nAmount: ₹${Math.abs(transactionData.amount)}\nNote: ${transactionData.description || 'N/A'}`,
          merchant_name: merchant.name || 'HisabKhata Merchant',
          merchant_phone: merchant.phone || merchant.mobile || 'N/A',
          amount: Math.abs(transactionData.amount),
          tx_type: typeStr,
          type: 'TRANSACTION'
        });
      } catch (err) {
        console.error("Failed to trigger transaction email:", err);
      }
    }

    return transactionRef.key;
  },

  deleteTransaction: async (customerId, transactionId, amount) => {
    try {
      // 1. Delete transaction
      await remove(ref(db, `transactions/${transactionId}`));

      // 2. Reverse customer balance
      const customerRef = ref(db, `customers/${customerId}`);
      const customerSnapshot = await get(customerRef);
      if (customerSnapshot.exists()) {
        const currentBalance = Number(customerSnapshot.val().balance || 0);
        const txAmount = Number(amount);
        const newBalance = currentBalance - txAmount;

        await update(customerRef, {
          balance: newBalance,
          updatedAt: Date.now()
        });
      }
      return true;
    } catch (error) {
      console.error('Error in deleteTransaction:', error);
      throw error;
    }
  },

  updateTransaction: async (customerId, transactionId, updatedData, oldAmount) => {
    try {
      // 1. Update transaction node
      await update(ref(db, `transactions/${transactionId}`), {
        ...updatedData,
        updatedAt: Date.now()
      });

      // 2. Adjust customer balance if amount changed
      const newAmount = Number(updatedData.amount);
      const diff = newAmount - Number(oldAmount);

      if (diff !== 0) {
        const customerRef = ref(db, `customers/${customerId}`);
        const customerSnapshot = await get(customerRef);
        if (customerSnapshot.exists()) {
          const currentBalance = Number(customerSnapshot.val().balance || 0);
          await update(customerRef, {
            balance: currentBalance + diff,
            updatedAt: Date.now()
          });
        }
      }
      return true;
    } catch (error) {
      console.error('Error in updateTransaction:', error);
      throw error;
    }
  },

  listenCustomerTransactions: (customerId, callback) => {
    const transactionsQuery = query(ref(db, 'transactions'), orderByChild('customerId'), equalTo(customerId));
    return onValue(transactionsQuery, (snapshot) => {
      const transactions = [];
      snapshot.forEach((childSnapshot) => {
        transactions.push({ id: childSnapshot.key, ...childSnapshot.val() });
      });
      callback(transactions);
    });
  },

  listenAllUserTransactions: (userId, callback) => {
    const transactionsQuery = query(ref(db, 'transactions'), orderByChild('userId'), equalTo(userId));
    return onValue(transactionsQuery, (snapshot) => {
      const transactions = [];
      snapshot.forEach((childSnapshot) => {
        transactions.push({ id: childSnapshot.key, ...childSnapshot.val() });
      });
      callback(transactions);
    });
  },

  deleteCustomer: async (customerId) => {
    // 1. Delete all transactions for this customer
    const txQuery = query(ref(db, 'transactions'), orderByChild('customerId'), equalTo(customerId));
    const txSnapshot = await get(txQuery);
    if (txSnapshot.exists()) {
      const updates = {};
      txSnapshot.forEach((child) => {
        updates[`transactions/${child.key}`] = null;
      });
      await update(ref(db), updates);
    }

    // 2. Delete customer
    await remove(ref(db, `customers/${customerId}`));
  },

  // Admin specifically
  listenAllUsers: (callback, errorCallback) => {
    return onValue(ref(db, 'users'), (snapshot) => {
      const users = [];
      snapshot.forEach((childSnapshot) => {
        users.push({ id: childSnapshot.key, ...childSnapshot.val() });
      });
      callback(users);
    }, (error) => {
      console.error("Error listening to users:", error);
      if (errorCallback) errorCallback(error);
    });
  },

  listenAllCustomers: (callback, errorCallback) => {
    return onValue(ref(db, 'customers'), (snapshot) => {
      const customers = [];
      snapshot.forEach((childSnapshot) => {
        customers.push({ id: childSnapshot.key, ...childSnapshot.val() });
      });
      callback(customers);
    }, (error) => {
      console.error("Error listening to customers:", error);
      if (errorCallback) errorCallback(error);
    });
  },

  listenAllTransactions: (callback, errorCallback) => {
    return onValue(ref(db, 'transactions'), (snapshot) => {
      const transactions = [];
      snapshot.forEach((childSnapshot) => {
        transactions.push({ id: childSnapshot.key, ...childSnapshot.val() });
      });
      callback(transactions);
    }, (error) => {
      console.error("Error listening to transactions:", error);
      if (errorCallback) errorCallback(error);
    });
  },

  // Global Settings
  listenGlobalSettings: (callback) => {
    return onValue(ref(db, 'settings'), (snapshot) => {
      callback(snapshot.val() || {});
    });
  },

  updateGlobalSettings: async (settings) => {
    await update(ref(db, 'settings'), settings);
  },

  // User Management
  listenToUserProfile: (userId, callback) => {
    return onValue(ref(db, `users/${userId}`), (snapshot) => {
      callback(snapshot.val());
    });
  },

  updateUserProfile: async (userId, data) => {
    await update(ref(db, `users/${userId}`), {
      ...data,
      updatedAt: Date.now()
    });
  },

  updateUserStatus: async (userId, isBlocked) => {
    await update(ref(db, `users/${userId}`), { isBlocked });
  },

  deleteUserCascaded: async (userId) => {
    // 1. Delete user profile
    await remove(ref(db, `users/${userId}`));

    // 2. Delete all customers of this user
    const customersRef = ref(db, 'customers');
    const customersSnapshot = await get(customersRef);
    if (customersSnapshot.exists()) {
      const updates = {};
      customersSnapshot.forEach((child) => {
        if (child.val().userId === userId) {
          updates[`customers/${child.key}`] = null;
        }
      });
      await update(ref(db), updates);
    }

    // 3. Delete all transactions of this user
    const txRef = ref(db, 'transactions');
    const txSnapshot = await get(txRef);
    if (txSnapshot.exists()) {
      const updates = {};
      txSnapshot.forEach((child) => {
        if (child.val().userId === userId) {
          updates[`transactions/${child.key}`] = null;
        }
      });
      await update(ref(db), updates);
    }
  },

  exportDatabase: async () => {
    const snapshot = await get(ref(db));
    return snapshot.val();
  }
};

export { auth, db };
