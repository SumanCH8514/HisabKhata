import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminRoute = ({ children }) => {
    const { currentUser, isAdmin, userDataLoading } = useAuth();

    // If still loading user data
    if (currentUser && userDataLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!currentUser || !isAdmin) {
        return <Navigate to="/reports" replace />;
    }

    return children;
};

export default AdminRoute;
