import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PublicRoute = ({ children }) => {
    const { currentUser, isSecurityVerified, userDataLoading } = useAuth();

    if (userDataLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
                <div className="animate-spin rounded-full h-10 w-10 border-3 border-[#0057BB] border-t-transparent"></div>
            </div>
        );
    }

    if (currentUser && isSecurityVerified) {
        return <Navigate to="/customers" replace />;
    }

    return children;
};

export default PublicRoute;
