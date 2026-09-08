
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail, sendEmailVerification, getAdditionalUserInfo } from 'firebase/auth';
import { getDatabase, ref, set, get, push, update, remove, onValue, query, orderByChild, equalTo } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'hisabkhata-sumanonline.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

import emailjs from '@emailjs/browser';
import { sendEmailViaBackend } from './emailService';
import { deleteFromR2 } from './r2Storage';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

export const sendEmailNotification = async (templateParams) => {
  try {
    const toEmail = templateParams.to_email || templateParams.to || templateParams.email;
    if (!toEmail || !toEmail.includes('@')) {
      console.warn("Skipping email: Invalid or empty recipient address.");
      return;
    }

    const settingsSnap = await get(ref(db, 'settings'));
    const settings = settingsSnap.val() || {};

    if (settings.emailNotifications === false) return;

    if (settings.emailGateway === 'EMAILJS' && settings.emailjs?.serviceId && settings.emailjs?.publicKey) {
      const emailJSConfig = settings.emailjs;
      let templateId = emailJSConfig.welcomeTemplateId || emailJSConfig.templateId;
      if (templateParams.type === 'ALERT' && emailJSConfig.alertTemplateId) {
        templateId = emailJSConfig.alertTemplateId;
      } else if (templateParams.type === 'PAYMENT' && settings.paymentEmailjs?.templateId) {
        return await emailjs.send(
          settings.paymentEmailjs.serviceId || emailJSConfig.serviceId,
          settings.paymentEmailjs.templateId,
          templateParams,
          settings.paymentEmailjs.publicKey || emailJSConfig.publicKey
        );
      }
      return await emailjs.send(
        emailJSConfig.serviceId,
        templateId,
        templateParams,
        emailJSConfig.publicKey
      );
    }

    const result = await sendEmailViaBackend(templateParams);
    return result;
  } catch (error) {
    const toEmail = templateParams.to_email || templateParams.to || templateParams.email;
    console.error(`❌ Email failed to ${toEmail || 'recipient'}\nFailed: ${error.message || error}`);
    return false;
  }
};

export const authService = {
  register: async (name, email, password, phone) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await updateProfile(user, { displayName: name });

    await set(ref(db, `users/${user.uid}`), {
      name: name,
      email: email,
      phone: phone || '',
      role: 'user', // Default role
      createdAt: Date.now()
    });

    sendEmailNotification({
      to_email: email,
      to_name: name,
      subject: 'Welcome to HisabKhata! Manage your business with ease 📈',
      message: `Hello ${name}, welcome to HisabKhata! We are excited to help you manage your financial ledger securely.`,
      action_url: 'https://hisabkhata.sumanonline.com/login',
      type: 'WELCOME'
    });

    return user;
  },
  resetPassword: async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Password reset failed:", error.code, error.message);
      throw error;
    }
  },
  sendVerification: async () => {
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
      }
    } catch (error) {
      console.error("Email verification failed:", error.code, error.message);
      throw error;
    }
  },
  login: async (email, password) => {
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Login failed:", error.code, error.message);
      throw error;
    }
  },
  logout: async () => {
    try {
      return await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error.message);
      throw error;
    }
  },
  onAuthStateChanged: (callback) => {
    return onAuthStateChanged(auth, callback);
  },
  loginWithGoogle: async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const additionalInfo = getAdditionalUserInfo(result);

      const userSnap = await get(ref(db, `users/${user.uid}`));

      if (!userSnap.exists()) {
        const fetchedPhone = user.phoneNumber || 
                           user.providerData?.find(p => p.phoneNumber)?.phoneNumber || 
                           additionalInfo?.profile?.phone_number || 
                           additionalInfo?.profile?.mobile ||
                           '';

        await set(ref(db, `users/${user.uid}`), {
          name: user.displayName || 'Google User',
          email: user.email,
          photoURL: user.photoURL || '',
          phone: fetchedPhone,
          role: 'user',
          createdAt: Date.now()
        });

        sendEmailNotification({
          to_email: user.email,
          to_name: user.displayName || 'Google User',
          subject: 'Welcome to HisabKhata!',
          message: `Hello ${user.displayName || 'User'}, welcome to HisabKhata! We are excited to help you manage your financial ledger securely.`,
          type: 'WELCOME'
        });
      }

      return user;
    } catch (error) {
      console.error("Google Login failed:", error.code, error.message);
      throw error;
    }
  }
};

export const dbService = {
  addCustomer: async (userId, customerData) => {
    const customerRef = push(ref(db, 'customers'));
    const newCustomer = {
      ...customerData,
      userId,
      createdAt: Date.now()
    };
    await set(customerRef, newCustomer);

    if (newCustomer.email) {
      try {
        const userSnap = await get(ref(db, `users/${userId}`));
        const merchant = userSnap.val() || {};
        const merchantBusinessName = merchant.businessName || merchant.shopName || merchant.business || merchant.name || 'HisabKhata Merchant';
        const merchantPhone = merchant.phone || merchant.mobile || '';
        await sendEmailNotification({
          to_email: newCustomer.email,
          to_name: newCustomer.name,
          subject: 'New Ledger Created - Track your balance live on HisabKhata 🛡️',
          message: `You have been added as a customer on HisabKhata by ${merchantBusinessName} (Phone: ${merchantPhone || 'N/A'}).`,
          merchant_name: merchantBusinessName,
          merchant_phone: merchantPhone || 'N/A',
          action_url: `https://hisabkhata.sumanonline.com/customer/share/${customerRef.key}`,
          type: 'CUSTOMER_ADDED'
        });
      } catch (err) {
        console.error("Failed to trigger customer add email:", err);
      }
    }

    return customerRef.key;
  },

  createCustomer: async (userId, customerData) => {
    return dbService.addCustomer(userId, customerData);
  },

  updateCustomer: async (customerId, customerData) => {
    try {
      await update(ref(db, `customers/${customerId}`), { ...customerData, updatedAt: Date.now() });
    } catch (error) {
      console.error("Update customer failed:", error.message);
      throw error;
    }
  },

  deleteCustomer: async (customerId) => {
    try {
      const customerSnapshot = await get(ref(db, `customers/${customerId}`));
      if (customerSnapshot.exists()) {
        const customerData = customerSnapshot.val();
        if (customerData.profilePicture && customerData.profilePicture.startsWith('http')) {
          deleteFromR2(customerData.profilePicture).catch(err => {
            console.warn('Failed to delete customer profile picture from R2:', err);
          });
        }
      }

      const transactionsQuery = query(ref(db, 'transactions'), orderByChild('customerId'), equalTo(customerId));
      const snapshot = await get(transactionsQuery);
      if (snapshot.exists()) {
        const transactionsRef = ref(db, 'transactions');
        const updates = {};
        const attachmentUrls = [];

        snapshot.forEach((child) => {
          const t = child.val();
          if (Array.isArray(t?.attachments)) {
            attachmentUrls.push(...t.attachments);
          }
          if (t?.attachment && !attachmentUrls.includes(t.attachment)) {
            attachmentUrls.push(t.attachment);
          }
          if (t?.screenshot && !attachmentUrls.includes(t.screenshot)) {
            attachmentUrls.push(t.screenshot);
          }
          updates[child.key] = null;
        });

        Promise.allSettled(
          attachmentUrls.filter(u => u && typeof u === 'string' && u.startsWith('http')).map(u => deleteFromR2(u))
        ).catch(() => {});

        await update(transactionsRef, updates);
      }

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

  listenCustomer: (customerId, callback) => {
    return onValue(ref(db, `customers/${customerId}`), (snapshot) => {
      if (snapshot.exists()) callback({ id: snapshot.key, ...snapshot.val() });
    });
  },

  addTransaction: async (userId, customerId, transactionData) => {
    const transactionRef = push(ref(db, 'transactions'));

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

    const inferredType = transactionData.type || (Number(transactionData.amount) > 0 ? 'GOT' : 'GAVE');

    const newTransaction = {
      ...transactionData,
      type: inferredType,
      userId,
      customerId,
      balance: newBalance,
      timestamp: transactionData.timestamp || Date.now()
    };
    try {
      await set(transactionRef, newTransaction);

      await update(ref(db, `customers/${customerId}`), {
        balance: newBalance,
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error("Add transaction failed:", error.message);
      throw error;
    }

    if (customerEmail) {
      try {
        const typeStr = transactionData.type === 'GOT' ? 'Payment Received' : 'Credit Given';
        const userSnap = await get(ref(db, `users/${userId}`));
        const merchant = userSnap.val() || {};
        const merchantBusinessName = merchant.businessName || merchant.shopName || merchant.business || merchant.name || 'HisabKhata Merchant';
        const merchantPhone = merchant.phone || merchant.mobile || '';
        const absAmt = Math.abs(transactionData.amount);

        await sendEmailNotification({
          to_email: customerEmail,
          to_name: customerName,
          customer_name: customerName,
          subject: `Transaction Alert: ₹${absAmt} - ${merchantBusinessName}`,
          message: `A new transaction amount of ₹${absAmt} has been recorded on your account. Please check the details below:`,
          merchant_name: merchantBusinessName,
          merchant_phone: merchantPhone,
          amount: absAmt,
          balance: Math.abs(newBalance),
          tx_type: typeStr,
          description: transactionData.description || '',
          action_url: `https://hisabkhata.sumanonline.com/customer/share/${customerId}`,
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
      const txRef = ref(db, `transactions/${transactionId}`);
      const txSnapshot = await get(txRef);
      const txData = txSnapshot.exists() ? txSnapshot.val() : null;

      if (txData) {
        const attachmentUrls = [];
        if (Array.isArray(txData.attachments)) {
          attachmentUrls.push(...txData.attachments);
        }
        if (txData.attachment && !attachmentUrls.includes(txData.attachment)) {
          attachmentUrls.push(txData.attachment);
        }
        if (txData.screenshot && !attachmentUrls.includes(txData.screenshot)) {
          attachmentUrls.push(txData.screenshot);
        }

        await Promise.allSettled(
          attachmentUrls.map(url => {
            if (url && typeof url === 'string' && url.startsWith('http')) {
              return deleteFromR2(url).catch(err => {
                console.warn('Failed to delete attachment from R2 storage:', url, err);
              });
            }
            return Promise.resolve();
          })
        );
      }

      await remove(txRef);

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
      await update(ref(db, `transactions/${transactionId}`), {
        ...updatedData,
        updatedAt: Date.now()
      });

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

  importCustomerTransactions: async (userId, customerId, transactionsList, options = {}) => {
    if (!transactionsList || transactionsList.length === 0) return { success: true, count: 0 };
    
    const customerSnapshot = await get(ref(db, `customers/${customerId}`));
    if (!customerSnapshot.exists()) {
      throw new Error("Customer not found");
    }

    const customer = customerSnapshot.val();
    let currentBalance = Number(customer.balance || 0);

    if (options.resetExistingBalance && options.openingBalance !== undefined) {
      currentBalance = Number(options.openingBalance || 0);
    }

    const sorted = [...transactionsList].sort((a, b) => new Date(a.date) - new Date(b.date));

    const updates = {};
    const createdKeys = [];
    let runningBal = currentBalance;
    const baseTimestamp = Date.now();

    sorted.forEach((tx, index) => {
      const isGot = tx.type === 'GOT';
      const finalAmount = isGot ? Math.abs(Number(tx.amount)) : -Math.abs(Number(tx.amount));
      runningBal = runningBal + finalAmount;

      const txDateObj = new Date(tx.date || new Date().toISOString().split('T')[0]);
      txDateObj.setHours(12, 0, index % 60);
      const timestamp = txDateObj.getTime() || (baseTimestamp + index * 1000);

      const txRef = push(ref(db, 'transactions'));
      const txKey = txRef.key;
      createdKeys.push(txKey);

      updates[`transactions/${txKey}`] = {
        userId,
        customerId,
        amount: finalAmount,
        type: isGot ? 'GOT' : 'GAVE',
        description: (tx.description || 'Imported Transaction').trim(),
        date: tx.date || new Date().toISOString().split('T')[0],
        timestamp,
        balance: runningBal,
        importedAt: baseTimestamp
      };
    });

    updates[`customers/${customerId}/balance`] = runningBal;
    updates[`customers/${customerId}/updatedAt`] = baseTimestamp;

    await update(ref(db), updates);
    return { success: true, count: createdKeys.length, finalBalance: runningBal };
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
    const txQuery = query(ref(db, 'transactions'), orderByChild('customerId'), equalTo(customerId));
    const txSnapshot = await get(txQuery);
    if (txSnapshot.exists()) {
      const updates = {};
      txSnapshot.forEach((child) => {
        updates[`transactions/${child.key}`] = null;
      });
      await update(ref(db), updates);
    }

    await remove(ref(db, `customers/${customerId}`));
  },

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

  listenGlobalSettings: (callback) => {
    return onValue(ref(db, 'settings'), (snapshot) => {
      callback(snapshot.val() || {});
    });
  },

  updateGlobalSettings: async (settings) => {
    try {
      await update(ref(db, 'settings'), settings);
    } catch (error) {
      console.error("Update settings failed:", error.message);
      throw error;
    }
  },

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
    await remove(ref(db, `users/${userId}`));

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
  },

  importDatabase: async (data) => {
    await set(ref(db), data);
  },

  sendEmailNotification
};

export { auth, db };
