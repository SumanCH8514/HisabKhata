import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import PublicRoute from './components/PublicRoute';
import LandingPage from './pages/LandingPage';
import PWAInstallBanner from './components/PWAInstallBanner';
import OfflineIndicator from './components/OfflineIndicator';
import { useAuth } from './contexts/AuthContext';

const Login = lazy(() => import('./pages/Login'));
const SignUp = lazy(() => import('./pages/SignUp'));
const Reports = lazy(() => import('./pages/Reports'));
const CustomerReport = lazy(() => import('./pages/CustomerReport'));
const Customers = lazy(() => import('./pages/Customers'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Transactions = lazy(() => import('./pages/Transactions'));
const EditCustomer = lazy(() => import('./pages/EditCustomer'));
const Support = lazy(() => import('./pages/Placeholders').then(m => ({ default: m.Support })));
const Settings = lazy(() => import('./pages/Settings'));
const CustomerLedgerDetail = lazy(() => import('./pages/CustomerLedgerDetail'));
const CustomerShareableView = lazy(() => import('./pages/CustomerShareableView'));
const AddTransaction = lazy(() => import('./pages/AddTransaction'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Maintenance = lazy(() => import('./pages/Maintenance'));
const Profile = lazy(() => import('./pages/Profile'));
const More = lazy(() => import('./pages/More'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfCondition = lazy(() => import('./pages/TermsOfCondition'));
const PaymentVerification = lazy(() => import('./pages/PaymentVerification'));
const Payments = lazy(() => import('./pages/Payments'));

const RouteLoader = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

function App() {
  const { globalSettings, isAdmin } = useAuth();

  if (globalSettings?.maintenanceMode && !isAdmin) {
    return (
      <Router>
        <OfflineIndicator />
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="*" element={<Maintenance />} />
          </Routes>
        </Suspense>
      </Router>
    );
  }

  return (
    <Router>
      <OfflineIndicator />
      <PWAInstallBanner />
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/reports/customer/:id" element={<ProtectedRoute><CustomerReport /></ProtectedRoute>} />
          <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/more" element={<ProtectedRoute><More /></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
          <Route path="/customer/:id" element={<ProtectedRoute><CustomerLedgerDetail /></ProtectedRoute>} />
          <Route path="/customer/edit/:id" element={<ProtectedRoute><EditCustomer /></ProtectedRoute>} />
          <Route path="/customer/share/:id" element={<CustomerShareableView />} />
          <Route path="/verify-payment" element={<ProtectedRoute><PaymentVerification /></ProtectedRoute>} />
          <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
          <Route path="/add-transaction" element={<ProtectedRoute><AddTransaction /></ProtectedRoute>} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-condition" element={<TermsOfCondition />} />
          <Route path="/dashboard" element={<Navigate to="/reports" replace />} />
          <Route path="*" element={<Navigate to="/reports" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
