<div align="center">

# 📒 HisabKhata PRO

**A modern, high-fidelity digital ledger & payment recovery platform for smart merchants.**

[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Cloudflare R2](https://img.shields.io/badge/Cloudflare_R2-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://www.cloudflare.com/developer-platform/r2/)
[![Firebase](https://img.shields.io/badge/Firebase_RTDB-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

[**Explore Live Demo »**](https://hisabkhata.sumanonline.com/) · [Report Bug](https://github.com/SumanCH8514/HisabKhata/issues) · [Request Feature](https://github.com/SumanCH8514/HisabKhata/issues)

</div>

---

## 🌟 Overview

**HisabKhata PRO** replaces traditional, error-prone paper ledgers (*Bahi-Khata*) with a seamless, cloud-synced, mobile-first web app. Built specifically for Indian MSMEs, shopkeepers, and independent business owners, it empowers merchants to track daily credits/debits, accelerate customer dues recovery with instant UPI QR codes, generate GST-ready statements, and share real-time balance portals with customers.

---

## ✨ Key Features

- **⚡ High-Velocity Ledger Management**:
  - Record **"Gave" (Credit)** and **"Got" (Debit)** entries in seconds with mobile drawers.
  - Automatic real-time balance calculations with instantaneous audit log updates.

- **💳 Integrated UPI Payments & QR Posters**:
  - Dynamic QR code generation for any outstanding or custom amount (`upi://pay`).
  - Downloadable branded store-counter "Scan & Pay" payment posters.
  - In-app payment verification queue for merchant approval.

- **🔗 Shareable Customer Portal**:
  - Secure, public read-only statement links (`/customer/share/:id`) requiring no customer login.
  - Transparent transaction timelines, invoice downloads, and 1-tap WhatsApp/UPI payment buttons.

- **☁️ Cloudflare R2 & Edge Worker Architecture**:
  - High-speed image and invoice bill attachments served via global edge CDN (`http://cdn.backend.hisabkhata.sumanonline.com/`).
  - Automatic client-side image downscaling and compression before upload.
  - Automatic deletion of outdated images to prevent storage bloat.

- **📄 Enterprise Reports & Exports**:
  - 1-click GST-ready PDF account statements with opening/closing balances.
  - Excel spreadsheet exports formatted for accounting software and tax audits.

- **👑 Super Admin Command Center**:
  - Merchant lifecycle governance, database backup/restore tools, and live system monitoring.
  - 1-click base64 to Cloudflare R2 migration engine.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS, Lucide Icons | Responsive SPA, smooth drawers, modern glassmorphism UI |
| **Backend API** | Cloudflare Workers, Hono | Ultra-fast edge REST API (`backend.hisabkhata.sumanonline.com`) |
| **Database** | Firebase Realtime Database | Real-time synchronized state with fine-grained security rules |
| **Storage & CDN** | Cloudflare R2 Object Storage | S3-compatible asset storage for avatars, proofs, and bills |
| **Authentication** | Firebase Auth | Secure Google OAuth and Email/Password sessions |
| **Reporting** | jsPDF, SheetJS (xlsx), Recharts | Dynamic client-side PDF generation and business analytics |

---

## 📂 Project Structure

```text
HisabKhata/
├── frontend/               # React 19 Client Web Application
│   ├── src/pages/          # Feature Pages (Customers, Payments, Reports, Admin)
│   ├── src/components/     # Drawers, Header, Navbars, Route Protectors
│   ├── src/services/       # Cloudflare Worker Client & Firebase SDK
│   └── src/utils/          # Image downscaling, compression & error handlers
├── backend/                # Production Cloudflare Worker Edge API
│   ├── src/index.js        # Hono REST API, CORS middleware & R2 handlers
│   └── wrangler.toml       # Custom domain & bucket configuration
├── functions/              # Firebase Cloud Functions (Background triggers)
├── database.rules.json     # Strict Firebase RTDB security rules
├── firebase.json           # Firebase Hosting configuration (frontend/dist)
└── package.json            # Root workspace orchestrator
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Git](https://git-scm.com/)
- [Cloudflare Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (for backend deployment)

### 1. Clone the Repository
```bash
git clone https://github.com/SumanCH8514/HisabKhata.git
cd HisabKhata
```

### 2. Install Dependencies
```bash
npm run install:all
```

### 3. Configure Environment Variables
Create a `.env` file inside the `frontend/` directory based on the example:
```bash
cp frontend/.env.example frontend/.env
```
Update your Firebase configuration and backend URL:
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_BACKEND_WORKER_URL=https://backend.hisabkhata.sumanonline.com
VITE_R2_PUBLIC_URL=http://cdn.backend.hisabkhata.sumanonline.com
```

### 4. Run Development Servers
```bash
# Start Frontend Dev Server (http://localhost:5173)
npm run dev

# Start Backend Cloudflare Worker locally (optional)
npm run backend:dev
```

---

## 📖 Usage & Deployment

### Build Frontend for Production
```bash
npm run build
```

### Deploy to Hosting & Edge
```bash
# Deploy Cloudflare Worker Backend
npm run backend:deploy

# Deploy Frontend to Firebase Hosting
firebase deploy --only hosting
```

---

## 📸 Preview

| Merchant Dashboard | Customer Statement View |
| :---: | :---: |
| <img src="https://raw.githubusercontent.com/SumanCH8514/HisabKhata/main/frontend/public/hero.png" width="450" alt="Dashboard Preview" /> | <img src="https://raw.githubusercontent.com/SumanCH8514/HisabKhata/main/frontend/public/security.png" width="450" alt="Statement Preview" /> |

---

## 🤝 Contributing

Contributions make the open-source community an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

## 👨‍💻 Author & Contact

**Suman**  
- **GitHub**: [@SumanCH8514](https://github.com/SumanCH8514)  
- **Website**: [SumanOnline.Com](https://sumanonline.com)  
- **Email**: [hisabkhata@sumanonline.com](mailto:hisabkhata@sumanonline.com)  
- **Live Application**: [https://hisabkhata.sumanonline.com](https://hisabkhata.sumanonline.com)
