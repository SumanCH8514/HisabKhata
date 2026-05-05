import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/firebase';

const ProtectedRoute = ({ children }) => {
    const { currentUser, isAdmin, isBlocked, globalSettings } = useAuth();

    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    // Blocked user enforcement
    if (isBlocked && !isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="material-symbols-outlined text-4xl">block</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 mb-4">Account Blocked</h1>
                    <p className="text-slate-500 mb-8">Your account has been suspended due to policy violations. Please contact support if you believe this is a mistake.</p>
                    <button 
                        onClick={() => authService.logout()} 
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all"
                    >
                        Logout
                    </button>
                </div>
            </div>
        );
    }

    // Maintenance mode enforcement (Admins bypass)
    if (globalSettings?.maintenanceMode && !isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6 text-white text-center">
                <div className="max-w-md w-full">
                    <div className="w-24 h-24 bg-blue-600/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
                        <span className="material-symbols-outlined text-5xl">engineering</span>
                    </div>
                    <h1 className="text-4xl font-black mb-4">Under Maintenance</h1>
                    <p className="text-slate-400 mb-10 leading-relaxed">We're performing scheduled maintenance to improve your experience. We'll be back online shortly!</p>
                    <div className="flex justify-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-.15s]"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-.3s]"></div>
                    </div>
                </div>
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;
