import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * PublicRoute prevents authenticated users from accessing login/signup pages.
 * If a user is already logged in, it redirects them to the main app dashboard.
 */
const PublicRoute = ({ children }) => {
    const { currentUser } = useAuth();

    if (currentUser) {
        // If logged in, redirect to dashboard
        return <Navigate to="/customers" replace />;
    }

    return children;
};

export default PublicRoute;
