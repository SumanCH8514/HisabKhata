const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * NOTE: Email notifications have been moved to the Frontend (using EmailJS) 
 * to support the Firebase Spark (Free) plan. 
 * 
 * The Cloud Functions below are currently disabled/minimized to prevent 
 * deployment errors on the free plan.
 */

exports.logNewUser = functions.auth.user().onCreate((user) => {
    console.log('New user created:', user.email);
    return null;
});

exports.logNewTransaction = functions.database.ref('/transactions/{transactionId}')
    .onCreate((snapshot) => {
        console.log('New transaction recorded:', snapshot.key);
        return null;
    });
