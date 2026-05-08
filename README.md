# 📒 HisabKhata PRO
> A Premium, High-Fidelity Digital Ledger for Modern Indian Merchants.

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-039BE5?style=for-the-badge&logo=Firebase&logoColor=orange)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

---

## 🌟 Overview
**HisabKhata PRO** is a state-of-the-art financial management suite designed specifically for Indian MSMEs (Micro, Small, and Medium Enterprises). It transforms traditional, paper-based bookkeeping into a premium digital experience, combining pixel-perfect design with a robust cloud infrastructure.

**Live Project**: [https://hisabkhata.sumanonline.com/](https://hisabkhata.sumanonline.com/)

---

## 🚀 Key Modules & Detailed Features

### 1. 🛡️ Advanced Merchant Dashboard
The heart of the application, designed for high-density information management and rapid accounting.
- **Customer Lifecycle Management**: Add, edit, and archive customers with detailed profiles including phone numbers, emails, and custom business tags.
- **High-Velocity Ledger Entries**: 
    - **"Gave" (Credit)**: Marked in high-visibility red.
    - **"Got" (Debit)**: Marked in professional green.
    - **Instant Calculations**: Automatic real-time balance updates across the entire dashboard.
- **Interactive Search & Filtering**: Find customers or specific transactions in milliseconds using advanced fuzzy-search logic.
- **Drawer-Based UI**: Uses sleek mobile-first drawers for adding entries, ensuring the main context is never lost.

### 2. 💸 Integrated Online Payment System
A seamless bridge between digital records and actual money recovery.
- **Multi-Method Payment Portal**:
    - **Pay with UPI ID**: Shows the merchant's UPI ID with a 1-tap "Copy to Clipboard" utility.
    - **Dynamic QR Generation**: Real-time generation of UPI-compliant QR codes for any amount.
- **Professional Payment Posters**: 
    - **Automated Design**: Merchants can download a high-fidelity "Scan & Pay" poster.
    - **Branded & Personalized**: Posters include the merchant's name, the exact amount, and "HisabKhata PRO" verification branding.
    - **Security Badge**: Includes a "100% Secure Digital Payments" badge to build customer trust.
- **Payment Verification Flow**: Customers can upload payment screenshots or enter transaction IDs, which are then queued for merchant approval.

### 3. 📄 Enterprise-Grade Reporting
Data portability and professional documentation at your fingertips.
- **GST-Ready PDF Reports**: Generate branded financial statements for any customer with a single click. Includes transaction history, opening balances, and final settlements.
- **Excel Data Exports**: Perfect for tax audits or importing into Tally/Accounting software.
- **Animated Stats Counters**: Visualizes business growth with animated counters for "Total Merchants", "Active Sessions", and "Security Grade".

### 4. 🔗 Customer Shareable Views
A unique "Read-Only" portal for customers to keep them updated without requiring them to log in.
- **Live Balance Tracking**: Customers see their current outstanding amount in real-time.
- **Direct Communication**: One-click buttons to contact the merchant via WhatsApp, Email, or SMS.
- **Self-Service Payments**: Customers can initiate payments directly from their shared link.

### 5. 👑 Comprehensive Admin Console
Centralized control for system administrators to maintain platform health.
- **User Governance**: Monitor all registered merchants, their active customer counts, and account status.
- **Database Snapshots**: Real-time monitoring of Realtime Database nodes to ensure zero latency.
- **System Backups**: One-click full JSON exports of the entire application state for disaster recovery.

---

## 🏗️ Technical Excellence

### ⚡ Performance & Optimization
- **Dynamic Code Splitting**: Utilizes `React.lazy` and `await import()` for heavy libraries like `jsPDF` and `xlsx`, resulting in a **40% faster initial load time**.
- **Edge Caching**: Configured with immutable 1-year caching for static assets via `firebase.json` headers.
- **LCP Optimization**: Strategic use of `fetchPriority="high"` and `loading="eager"` for hero images to achieve near-perfect PageSpeed scores.

### 🔒 Security Hardening
- **Content Security Policy (CSP)**: Robust policy preventing XSS and unauthorized script execution.
- **Privacy Layers**: Strict Firebase Database Rules ensuring that merchants can ONLY access their own data.
- **Secure Routes**: Multi-tier authentication guards for Admin, Private, and Public routes.

---

## 🛠️ Tech Stack

| Category | Tools |
| :--- | :--- |
| **Core Framework** | React 19, Vite |
| **State Management** | React Context API, Firebase Realtime SDK |
| **Design System** | Vanilla CSS (Premium Micro-animations), Material Symbols |
| **Backend** | Firebase Cloud Functions (Node.js), Firebase Auth |
| **Data Visualization** | Recharts, Custom Canvas Posters |
| **Documentation** | jsPDF, jspdf-autotable, SheetJS (xlsx) |
| **Hosting** | Firebase Hosting (Global CDN) |

---

## 📂 Project Structure

```text
HisabKhata/
├── accounts/           # High-fidelity React frontend
│   ├── src/pages/      # Feature modules (CustomerShareableView, Reports, Admin)
│   ├── src/styles/     # Precision CSS & Design Tokens
│   └── src/assets/     # Optimized images & Brand assets
├── functions/          # Backend serverless logic
├── database.rules.json # Strict security rules
├── firebase.json       # Hosting & Deployment configuration
└── package.json        # Unified dependency management
```

---

## 🚀 Getting Started

1. **Clone the Repo**:
   ```bash
   git clone https://github.com/SumanCH8514/HisabKhata.git
   ```
2. **Install Dependencies**:
   ```bash
   cd accounts && npm install
   ```
3. **Run Locally**:
   ```bash
   npm run dev
   ```
4. **Build & Deploy**:
   ```bash
   npm run build && firebase deploy
   ```

---

## ⚖️ License & Credits
Distributed under the **MIT License**.
Built with ❤️ by **Suman** for the Indian Merchant Community.

**Contact**: [SumanOnline.Com](https://SumanOnline.Com) | [hisabkhata@sumanonline.com](mailto:hisabkhata@sumanonline.com)
