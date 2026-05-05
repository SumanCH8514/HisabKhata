import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Reports from './pages/Reports';
import Customers from './pages/Customers';
import ForgotPassword from './pages/ForgotPassword';
import Transactions from './pages/Transactions';
import EditCustomer from './pages/EditCustomer';
import { Settings, Support } from './pages/Placeholders';
import CustomerLedgerDetail from './pages/CustomerLedgerDetail';
import CustomerShareableView from './pages/CustomerShareableView';
import AddTransaction from './pages/AddTransaction';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import LandingPage from './pages/LandingPage';
import AdminDashboard from './pages/AdminDashboard';
import Maintenance from './pages/Maintenance';
import Profile from './pages/Profile';
import More from './pages/More';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfCondition from './pages/TermsOfCondition';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { globalSettings, isAdmin } = useAuth();

  // Redirect to maintenance if enabled and user is not an admin
  if (globalSettings?.maintenanceMode && !isAdmin) {
    return (
      <Router>
        <Routes>
          <Route path="*" element={<Maintenance />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/more" element={<ProtectedRoute><More /></ProtectedRoute>} />
        <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
        <Route path="/customer/:id" element={<ProtectedRoute><CustomerLedgerDetail /></ProtectedRoute>} />
        <Route path="/customer/edit/:id" element={<ProtectedRoute><EditCustomer /></ProtectedRoute>} />
        <Route path="/customer/share/:id" element={<CustomerShareableView />} />
        <Route path="/add-transaction" element={<ProtectedRoute><AddTransaction /></ProtectedRoute>} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-condition" element={<TermsOfCondition />} />
        
        {/* Fallback routes */}
        <Route path="/dashboard" element={<Navigate to="/reports" replace />} />
        <Route path="*" element={<Navigate to="/reports" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
