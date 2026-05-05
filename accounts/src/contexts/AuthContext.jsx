import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, db, dbService } from '../services/firebase';
import { ref, get } from 'firebase/database';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [globalSettings, setGlobalSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [userDataLoading, setUserDataLoading] = useState(false);

    useEffect(() => {
        // Listen to global settings
        const unsubSettings = dbService.listenGlobalSettings((settings) => {
            setGlobalSettings(settings);
        });

        let unsubUser = null;

        const unsubscribe = authService.onAuthStateChanged(async (user) => {
            if (user) {
                setUserDataLoading(true);
                // Listen to user profile changes in real-time
                unsubUser = dbService.listenToUserProfile(user.uid, (data) => {
                    setUserData(data);
                    setUserDataLoading(false);
                });
            } else {
                if (typeof unsubUser === 'function') unsubUser();
                setUserData(null);
                setUserDataLoading(false);
            }
            setCurrentUser(user);
            setLoading(false);
        });

        return () => {
            unsubscribe();
            if (typeof unsubSettings === 'function') unsubSettings();
            if (typeof unsubUser === 'function') unsubUser();
        };
    }, []);

    const login = (email, password) => {
        return authService.login(email, password);
    };

    const register = (name, email, password, phone) => {
        return authService.register(name, email, password, phone);
    };

    const logout = () => {
        return authService.logout();
    };

    const value = {
        currentUser,
        userData,
        userDataLoading,
        globalSettings,
        isAdmin: userData?.role === 'admin',
        isBlocked: userData?.isBlocked === true,
        login,
        register,
        loginWithGoogle: authService.loginWithGoogle,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
