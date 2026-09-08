import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, dbService } from '../services/firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [globalSettings, setGlobalSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [userDataLoading, setUserDataLoading] = useState(false);
    const [isSecurityVerified, setIsSecurityVerified] = useState(false);

    useEffect(() => {
        const unsubSettings = dbService.listenGlobalSettings((settings) => {
            setGlobalSettings(settings);
        });

        let unsubUser = null;

        const unsubscribe = authService.onAuthStateChanged(async (user) => {
            setCurrentUser(user);
            if (user) {
                setUserDataLoading(true);
                let initialLoadDone = false;
                const safetyTimer = setTimeout(() => {
                    if (!initialLoadDone) {
                        initialLoadDone = true;
                        setUserDataLoading(false);
                        setLoading(false);
                    }
                }, 2000);

                unsubUser = dbService.listenToUserProfile(user.uid, (data) => {
                    setUserData(data);
                    setUserDataLoading(false);

                    const hasEmailOtp = data?.emailOtpLogin === true || data?.preferences?.emailOtpLogin === true;
                    const has2Fa = (data?.twoFactorAuth === true || data?.preferences?.twoFactorAuth === true) && Boolean(data?.twoFactorSecret);
                    const isVerifiedInStorage = localStorage.getItem(`hk_auth_verified_${user.uid}`) === 'true' || sessionStorage.getItem(`hk_auth_verified_${user.uid}`) === 'true';

                    if (hasEmailOtp || has2Fa) {
                        setIsSecurityVerified(isVerifiedInStorage);
                    } else {
                        setIsSecurityVerified(true);
                    }

                    if (!initialLoadDone) {
                        initialLoadDone = true;
                        clearTimeout(safetyTimer);
                        setLoading(false);
                    }
                });
            } else {
                if (typeof unsubUser === 'function') unsubUser();
                setUserData(null);
                setUserDataLoading(false);
                setIsSecurityVerified(true);
                setLoading(false);
            }
        });

        return () => {
            unsubscribe();
            if (typeof unsubSettings === 'function') unsubSettings();
            if (typeof unsubUser === 'function') unsubUser();
        };
    }, []);

    const markSecurityVerified = (uid) => {
        const targetUid = uid || currentUser?.uid;
        if (targetUid) {
            localStorage.setItem(`hk_auth_verified_${targetUid}`, 'true');
            sessionStorage.setItem(`hk_auth_verified_${targetUid}`, 'true');
        }
        setIsSecurityVerified(true);
    };

    const login = (email, password) => {
        return authService.login(email, password);
    };

    const register = async (name, email, password, phone) => {
        const res = await authService.register(name, email, password, phone);
        if (res?.user?.uid) {
            localStorage.setItem(`hk_auth_verified_${res.user.uid}`, 'true');
            sessionStorage.setItem(`hk_auth_verified_${res.user.uid}`, 'true');
            setIsSecurityVerified(true);
        }
        return res;
    };

    const logout = () => {
        if (currentUser?.uid) {
            localStorage.removeItem(`hk_auth_verified_${currentUser.uid}`);
            sessionStorage.removeItem(`hk_auth_verified_${currentUser.uid}`);
        }
        setIsSecurityVerified(false);
        return authService.logout();
    };

    const value = {
        currentUser,
        userData,
        userDataLoading,
        globalSettings,
        isSecurityVerified,
        markSecurityVerified,
        isAdmin: userData?.role === 'admin',
        isBlocked: userData?.isBlocked === true,
        login,
        register,
        resetPassword: authService.resetPassword,
        sendVerification: authService.sendVerification,
        loginWithGoogle: authService.loginWithGoogle,
        logout
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
                <div className="animate-spin rounded-full h-10 w-10 border-3 border-[#0057BB] border-t-transparent"></div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
