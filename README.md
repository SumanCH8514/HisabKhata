# 📒 HisabKhata PRO
> A Premium, High-Fidelity Digital Ledger for Modern Indian Merchants.

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-039BE5?style=for-the-badge&logo=Firebase&logoColor=orange)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

---

## 🌟 Overview
**HisabKhata PRO** is a state-of-the-art financial management suite designed for Indian MSMEs. It transforms traditional bookkeeping into a premium digital experience, combining pixel-perfect design with robust cloud infrastructure. Whether you're managing a single store or a multi-branch enterprise, HisabKhata provides the tools to track every rupee with absolute precision.

---

## ✨ Elite Features

### 💎 High-Fidelity UI/UX
- **Branded Experience**: Featuring the signature **Hisab Khata PRO** identity with ultra-slim, space-efficient mobile headers.
- **Glassmorphism & Motion**: Smooth CSS-driven transitions, glowing progress bars, and high-density layouts that feel like a native app.
- **Smart Navigation**: Context-aware navigation bars with active pill indicators and intelligent route tracking.

### 🛡️ Secure Infrastructure
- **Enterprise Security**: Powered by Firebase Auth with dedicated **ProtectedRoute** and **PublicRoute** layers.
- **Data Integrity**: Real-time cloud synchronization ensures your records are never lost, with built-in AES-256 encryption.
- **Privacy First**: Personalized business profiles with high-fidelity identity management.

### 📈 Administrative Power
- **Global Monitoring**: A dedicated **Admin Console** for real-time oversight of all users, customers, and transactions.
- **System Health**: Monitor active sessions and database performance from a centralized dashboard.
- **Data Portability**: Full JSON backup/restore capabilities and one-click CSV transaction exports.

### 💼 Merchant Tools
- **1-Tap Ledger**: Rapid entry for "GOT" and "GAVE" transactions with instant balance updates.
- **Smart Reminders**: Automated WhatsApp and Email payment alerts to get paid 3x faster.
- **GST Ready**: Professional PDF report generation for seamless tax filing and audits.

---

## 🛠️ Tech Stack

| Category | Tools |
| :--- | :--- |
| **Core** | React 19, Vite (Lightning fast build tool) |
| **Styling** | Tailwind CSS (Utility-first, responsive design) |
| **Backend** | Firebase Cloud Functions (Scalable serverless logic) |
| **Database** | Firebase Realtime DB (Low-latency data sync) |
| **Icons** | Google Material Symbols, Lucide React |
| **Visualization** | Recharts (Interactive analytical charts) |
| **Deployment** | Firebase Hosting (Global CDN) |

---

## 📂 Architecture

```text
HisabKhata/
├── accounts/           # High-fidelity React frontend (The App)
│   ├── src/components/ # Reusable UI components & Drawers
│   ├── src/pages/      # Feature-rich modules (Admin, Profile, Ledger)
│   ├── src/contexts/   # Global state & Auth management
│   └── src/services/   # Firebase & Utility integrations
├── functions/          # Backend cloud functions (Node.js)
├── firebase.json       # Firebase multi-target deployment config
└── package.json        # Unified workspace configuration
```

---

## 🚀 Deployment

The project is optimized for Firebase and can be deployed with a single command:

```bash
# From the root directory
npm run build && firebase deploy
```

Live Environment: [https://hisabkhata-sumanonline.web.app](https://hisabkhata-sumanonline.web.app)

---

## 🤝 Development & Contribution
HisabKhata is built with a focus on modularity and high-performance frontend patterns.
1. **Clone**: `git clone https://github.com/SumanCH8514/HisabKhata.git`
2. **Install**: `npm run install:all`
3. **Develop**: `npm run dev`

---

## ⚖️ License & Credits
Distributed under the **MIT License**.
Built with ❤️ by **Suman** for the Indian Merchant Community.

**Contact**: [SumanOnline.Com](https://SumanOnline.Com) | [hisabkhata@sumanonline.com](mailto:hisabkhata@sumanonline.com)
