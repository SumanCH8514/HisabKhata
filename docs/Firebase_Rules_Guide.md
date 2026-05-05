# Firebase Realtime Database Rules

Copy and paste these rules into the **Rules** tab of your Firebase Realtime Database console to ensure proper data access and security for HisabKhata.

```json
{
  "rules": {
    "users": {
      "$userId": {
        ".read": "auth != null && auth.uid === $userId",
        ".write": "auth != null && auth.uid === $userId"
      }
    },
    "customers": {
      // Allow public read for shareable ledger view
      ".read": "true",
      // Only authenticated merchants can create/edit customers
      ".write": "auth != null",
      ".indexOn": ["userId"]
    },
    "transactions": {
      // Allow public read for shareable transaction history
      ".read": "true",
      // Only authenticated merchants can log transactions
      ".write": "auth != null",
      ".indexOn": ["customerId", "userId"]
    },
    "admin": {
      // Internal admin data (currently restricted)
      ".read": "auth != null",
      ".write": "false"
    },
    "settings": {
      ".read": "true",
      ".write": "false"
    }
  }
}
```

## How to Apply:
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project: **hisabkhata-sumanonline**.
3. In the left menu, click on **Realtime Database**.
4. Click on the **Rules** tab.
5. Delete the existing rules, paste the code above, and click **Publish**.

> [!IMPORTANT]
> These rules allow public read access to the `customers` and `transactions` nodes. This is necessary for your "Shareable Link" feature to work without requiring your customers to log in. Merchant profiles under `users` remain private to the logged-in owner.
