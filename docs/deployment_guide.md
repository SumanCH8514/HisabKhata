# HisabKhata Firebase Deployment Guide

Follow these steps to deploy your HisabKhata application to Firebase.

## Prerequisites
1. Ensure you have [Firebase CLI](https://firebase.google.com/docs/cli) installed:
   ```bash
   npm install -g firebase-tools
   ```
2. Log in to your Firebase account:
   ```bash
   firebase login
   ```

---

## Step 1: Build the Application
You need to generate the production build for the **Accounts** (main user app).

1. **Build Accounts App**:
   ```bash
   # From root directory
   npm run build
   ```
   *(This script runs `npm run build` inside the `accounts` folder.)*

---

## Step 2: Configure Hosting Targets
You need to tell Firebase which site belongs to the `accounts` folder.

1. **Apply target for Accounts**:
   ```bash
   firebase target:apply hosting accounts hisabkhata-sumanonline
   ```

---

## Step 3: Deploy to Firebase
Run the following command from the root directory:

```bash
firebase deploy
```

This will deploy:
1. **Database Rules**: Your security rules from `database.rules.json`.
2. **Hosting**: Your `accounts` production build.
3. **Functions**: The backend logic in the `functions/` folder.

---

## Troubleshooting
- **Site ID Error**: If `target:apply` fails, go to the **Firebase Console > Hosting** and make sure you have added the site.
- **Rules Error**: If database deployment fails, ensure you have initialized a **Realtime Database** in your Firebase console.
- **Environment Variables**: Ensure your `accounts/.env` file has the correct production credentials before building.

---
*Created by Antigravity for HisabKhata Deployment.*
