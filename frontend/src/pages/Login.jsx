import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getFirebaseErrorMessage } from '../utils/errorHandlers';
import { ref, get, update } from 'firebase/database';
import { db, sendEmailNotification } from '../services/firebase';
import { verifyTotpCode } from '../utils/totpUtils';
import { Smartphone, KeyRound, ArrowLeft, Loader2, ShieldCheck, AlertCircle, Mail, RotateCw } from 'lucide-react';
import SecurityCaptcha from '../components/SecurityCaptcha';

let globalLastOtpSentTime = 0;

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
    const [captchaResetKey, setCaptchaResetKey] = useState(0);

    const [is2FaRequired, setIs2FaRequired] = useState(false);
    const [totpCode, setTotpCode] = useState('');
    const [pendingUser, setPendingUser] = useState(null);
    const [useBackupCode, setUseBackupCode] = useState(false);
    const [totpLoading, setTotpLoading] = useState(false);

    const [isEmailOtpRequired, setIsEmailOtpRequired] = useState(false);
    const [emailOtpCode, setEmailOtpCode] = useState('');
    const [pendingEmailUser, setPendingEmailUser] = useState(null);
    const [otpLoading, setOtpLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);
    const otpSentForUidRef = useRef(null);

    const { login, logout, loginWithGoogle, globalSettings, currentUser, userData, isSecurityVerified, markSecurityVerified } = useAuth();
    const navigate = useNavigate();

    const isAuthedUnverified = Boolean(currentUser && !isSecurityVerified);
    const show2Fa = is2FaRequired || (isAuthedUnverified && (userData?.twoFactorAuth || userData?.preferences?.twoFactorAuth) && Boolean(userData?.twoFactorSecret) && !userData?.emailOtpLogin && !userData?.preferences?.emailOtpLogin);
    const showEmailOtp = !show2Fa && (isEmailOtpRequired || isAuthedUnverified);
    const displayEmail = pendingEmailUser?.email || currentUser?.email || email;

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const interval = setInterval(() => {
            setResendCooldown(prev => prev - 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [resendCooldown]);

    const sendLoginOtpEmail = async (userId, userEmail, userName) => {
        const now = Date.now();
        if (now - globalLastOtpSentTime < 5000) {
            return;
        }
        globalLastOtpSentTime = now;

        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = now + 10 * 60 * 1000;
        await update(ref(db, `users/${userId}`), {
            loginOtp: {
                code: generatedOtp,
                expiresAt,
                createdAt: now
            }
        });

        await sendEmailNotification({
            to_email: userEmail,
            to_name: userName || 'User',
            subject: `🔐 Your HisabKhata Login Verification OTP: ${generatedOtp}`,
            message: `Your login verification code is ${generatedOtp}. This OTP is valid for 10 minutes. If you did not request this login, please change your password immediately.`,
            type: 'OTP',
            template: 'OTP',
            otp: generatedOtp,
            purpose: 'login verification',
            expiry: '10 minutes'
        });
    };

    useEffect(() => {
        if (!showEmailOtp) {
            otpSentForUidRef.current = null;
            return;
        }

        const activeUser = pendingEmailUser?.user || currentUser;
        if (activeUser && activeUser.uid && otpSentForUidRef.current !== activeUser.uid) {
            otpSentForUidRef.current = activeUser.uid;
            setResendCooldown(60);
            sendLoginOtpEmail(
                activeUser.uid,
                activeUser.email,
                pendingEmailUser?.name || activeUser.displayName || userData?.name
            );
        }
    }, [showEmailOtp, pendingEmailUser, currentUser, userData]);

    const checkAuthSecurityAndProceed = async (user) => {
        if (!user) return;
        try {
            const userSnap = await get(ref(db, `users/${user.uid}`));
            const profileData = userSnap.exists() ? userSnap.val() : {};
            const is2FaEnabled = (profileData.twoFactorAuth === true || profileData.preferences?.twoFactorAuth === true) && Boolean(profileData.twoFactorSecret);
            const isEmailOtpEnabled = profileData.emailOtpLogin === true || profileData.preferences?.emailOtpLogin === true;

            if (isEmailOtpEnabled) {
                setPendingEmailUser({
                    user,
                    email: user.email,
                    name: profileData.name || user.displayName,
                    secret: profileData.twoFactorSecret,
                    backupCodes: profileData.twoFactorBackupCodes || [],
                    is2FaEnabled
                });
                setIsEmailOtpRequired(true);
                setEmailOtpCode('');
                setError('');
                return;
            }

            if (is2FaEnabled) {
                setPendingUser({
                    user,
                    secret: profileData.twoFactorSecret,
                    backupCodes: profileData.twoFactorBackupCodes || []
                });
                setIs2FaRequired(true);
                setError('');
                setTotpCode('');
                return;
            }

            markSecurityVerified(user.uid);
            navigate('/customers');
        } catch (err) {
            markSecurityVerified(user.uid);
            navigate('/customers');
        }
    };

    const handleGoogleLogin = async () => {
        try {
            setError('');
            setLoading(true);
            const user = await loginWithGoogle();
            
            if (!user) {
                setError('Google login failed. Please try again.');
                return;
            }

            await checkAuthSecurityAndProceed(user);
        } catch (err) {
            setError(getFirebaseErrorMessage(err));
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (globalSettings?.captcha && !isCaptchaVerified) {
            setError('Please complete the security verification challenge.');
            return;
        }

        try {
            setError('');
            setLoading(true);
            const userCredential = await login(email, password);
            const user = userCredential.user;

            if (!user.emailVerified) {
                await logout();
                setError('Please verify your email before logging in. Check your inbox for the verification link.');
                return;
            }

            await checkAuthSecurityAndProceed(user);
        } catch (err) {
            setError(getFirebaseErrorMessage(err));
            console.error(err);
            if (globalSettings?.captcha) {
                setCaptchaResetKey(k => k + 1);
                setIsCaptchaVerified(false);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyEmailOtp = async (e) => {
        e.preventDefault();
        setError('');

        const activeUser = pendingEmailUser?.user || currentUser;
        if (!activeUser) {
            setError('Session expired. Please log in again.');
            return;
        }

        if (!emailOtpCode.trim() || emailOtpCode.trim().length !== 6) {
            setError('Please enter the 6-digit email OTP.');
            return;
        }

        setOtpLoading(true);
        try {
            const otpSnap = await get(ref(db, `users/${activeUser.uid}/loginOtp`));
            const otpData = otpSnap.exists() ? otpSnap.val() : null;

            if (!otpData || otpData.code !== emailOtpCode.trim() || Date.now() > otpData.expiresAt) {
                setError('Invalid or expired verification code. Please request a new one.');
                setOtpLoading(false);
                return;
            }

            await update(ref(db, `users/${activeUser.uid}`), { loginOtp: null });

            const userSnap = await get(ref(db, `users/${activeUser.uid}`));
            const profileData = userSnap.exists() ? userSnap.val() : {};
            const is2FaEnabled = (profileData.twoFactorAuth === true || profileData.preferences?.twoFactorAuth === true) && Boolean(profileData.twoFactorSecret);

            if (is2FaEnabled) {
                setIsEmailOtpRequired(false);
                setPendingUser({
                    user: activeUser,
                    secret: profileData.twoFactorSecret,
                    backupCodes: profileData.twoFactorBackupCodes || []
                });
                setIs2FaRequired(true);
                setTotpCode('');
                return;
            }

            markSecurityVerified(activeUser.uid);
            navigate('/customers');
        } catch (err) {
            setError('Verification failed. Please try again.');
        } finally {
            setOtpLoading(false);
        }
    };

    const handleResendEmailOtp = async () => {
        const activeUser = pendingEmailUser?.user || currentUser;
        if (resendCooldown > 0 || !activeUser || resendLoading) return;
        setResendLoading(true);
        setError('');
        try {
            globalLastOtpSentTime = 0;
            await sendLoginOtpEmail(activeUser.uid, activeUser.email, activeUser.displayName || userData?.name);
            setResendCooldown(60);
            setResendSuccess(true);
            setTimeout(() => setResendSuccess(false), 4000);
        } catch (err) {
            setError('Failed to resend OTP email. Please try again.');
        } finally {
            setResendLoading(false);
        }
    };

    const handleVerify2FA = async (e) => {
        e.preventDefault();
        setError('');

        const activeUser = pendingUser?.user || currentUser;
        if (!activeUser) {
            setError('Session expired. Please log in again.');
            return;
        }

        const userSnap = await get(ref(db, `users/${activeUser.uid}`));
        const profileData = userSnap.exists() ? userSnap.val() : {};
        const userSecret = pendingUser?.secret || profileData.twoFactorSecret;
        const userBackupCodes = pendingUser?.backupCodes || profileData.twoFactorBackupCodes || [];

        if (!userSecret) {
            setError('Two-factor secret not found. Please log in again.');
            return;
        }

        if (!totpCode.trim()) {
            setError(useBackupCode ? 'Please enter a backup recovery code.' : 'Please enter the 6-digit authentication code.');
            return;
        }

        setTotpLoading(true);
        try {
            const verification = await verifyTotpCode(totpCode, userSecret, userBackupCodes);
            if (!verification.valid) {
                setError(useBackupCode ? 'Invalid backup recovery code.' : 'Invalid code. Check your Google Authenticator and try again.');
                setTotpLoading(false);
                return;
            }

            if (verification.isBackup && verification.usedCode) {
                const remaining = userBackupCodes.filter(c => c !== verification.usedCode);
                await update(ref(db, `users/${activeUser.uid}`), {
                    twoFactorBackupCodes: remaining
                });
            }

            markSecurityVerified(activeUser.uid);
            navigate('/customers');
        } catch (err) {
            setError('Verification failed. Please try again.');
        } finally {
            setTotpLoading(false);
        }
    };

    const handleCancelAuth = async () => {
        globalLastOtpSentTime = 0;
        otpSentForUidRef.current = null;
        setIsEmailOtpRequired(false);
        setIs2FaRequired(false);
        setPendingEmailUser(null);
        setPendingUser(null);
        setEmailOtpCode('');
        setTotpCode('');
        setError('');
        await logout();
    };

    return (
        <div className="min-h-screen flex" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
            <div className="hidden lg:flex flex-col justify-between w-[520px] flex-shrink-0 p-12 text-white relative overflow-hidden"
                style={{ backgroundColor: '#1c2b3a' }}>
                <div className="flex flex-col select-none">
                    <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-2xl tracking-tight leading-none">HisabKhata</span>
                        <span className="pro-badge">PRO</span>
                    </div>
                    <span className="text-[11px] text-[#9bbdd4] font-medium tracking-wide mt-1">
                        a SumanOnline Project
                    </span>
                </div>

                <div className="space-y-6">
                    <h2 className="text-3xl font-bold text-white leading-tight">
                        Manage your business<br />with confidence
                    </h2>
                    <p className="text-[#9bbdd4] text-base leading-relaxed">
                        Track credits, debits, and outstanding balances with your customers in real-time.
                    </p>

                    <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="bg-white/10 rounded-xl p-4">
                            <p className="text-2xl font-bold text-white">₹10Cr+</p>
                            <p className="text-[#9bbdd4] text-xs mt-1">Transactions tracked</p>
                        </div>
                        <div className="bg-white/10 rounded-xl p-4">
                            <p className="text-2xl font-bold text-white">50K+</p>
                            <p className="text-[#9bbdd4] text-xs mt-1">Active businesses</p>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                        <span className="material-symbols-outlined text-emerald-400 text-[20px] shrink-0">cloud_done</span>
                        <p className="text-xs text-[#9bbdd4] leading-relaxed">
                            Your ledger is continuously backed up and synced across all your devices.
                        </p>
                    </div>
                </div>

                <p className="text-[#5a7a95] text-xs">
                    © 2024-2026 HisabKhata. All rights reserved.
                </p>
            </div>

            <div className="flex-1 flex lg:items-center items-start lg:justify-center justify-start pt-8 pb-20 px-6 bg-white overflow-y-auto">
                <div className="w-full max-w-[400px]">
                    <div className="lg:hidden flex flex-col items-center mb-6 justify-center select-none">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-2xl text-gray-900 tracking-tight leading-none">HisabKhata</span>
                            <span className="pro-badge">PRO</span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-semibold tracking-wide mt-1">
                            a SumanOnline Project
                        </span>
                    </div>

                    {!showEmailOtp && !show2Fa ? (
                        <>
                            <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
                            <p className="text-gray-500 text-sm mb-8">Sign in to your account to continue</p>

                            {error && (
                                <div key={error} className="bg-red-50/90 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2.5 shadow-sm animate-shake mb-5">
                                    <AlertCircle size={18} className="shrink-0 text-red-500" />
                                    <span className="leading-snug">{error}</span>
                                </div>
                            )}

                            {globalSettings?.signupWithMail !== false ? (
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                            Email Address
                                        </label>
                                        <input
                                            id="email"
                                            type="email"
                                            required
                                            placeholder="name@company.com"
                                            className="w-full px-4 py-3 border border-gray-300 rounded text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Password
                                            </label>
                                            <Link to="/forgot-password" size="sm" className="text-xs text-blue-600 hover:underline">Forgot Password?</Link>
                                        </div>
                                        <div className="relative">
                                            <input
                                                id="password"
                                                type={showPassword ? 'text' : 'password'}
                                                required
                                                placeholder="••••••••"
                                                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                <span className="material-symbols-outlined text-[20px]">
                                                    {showPassword ? 'visibility_off' : 'visibility'}
                                                </span>
                                            </button>
                                        </div>
                                    </div>

                                    {globalSettings?.captcha && (
                                        <SecurityCaptcha
                                            onVerify={setIsCaptchaVerified}
                                            resetKey={captchaResetKey}
                                        />
                                    )}

                                    <button
                                        disabled={loading || (globalSettings?.captcha && !isCaptchaVerified)}
                                        type="submit"
                                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed"
                                    >
                                        {loading ? 'Signing in...' : 'Login'}
                                    </button>
                                </form>
                            ) : (
                                <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-3">
                                    <span className="material-symbols-outlined text-slate-400">mail_lock</span>
                                    <p className="text-xs font-bold text-slate-600 uppercase tracking-widest leading-relaxed">Email login is disabled.<br/><span className="text-[10px] text-slate-400 font-medium">Please use Google login below.</span></p>
                                </div>
                            )}

                            <div className="flex items-center gap-4 my-6">
                                <div className="flex-1 h-px bg-gray-200"></div>
                                <span className="text-xs text-gray-400 uppercase tracking-wider">Or continue with</span>
                                <div className="flex-1 h-px bg-gray-200"></div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    disabled={loading} 
                                    onClick={handleGoogleLogin} 
                                    type="button" 
                                    className="flex items-center justify-center gap-2 py-2.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50 hover:shadow-sm active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {loading ? (
                                        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                                    ) : (
                                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                        </svg>
                                    )}
                                    {loading ? 'Authenticating...' : 'Google'}
                                </button>
                                <button type="button" className="flex items-center justify-center gap-2 py-2.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                                    </svg>
                                    GitHub
                                </button>
                            </div>

                            <p className="text-center text-sm text-gray-500 mt-8">
                                Don't have an account?{' '}
                                <Link to="/signup" className="text-blue-600 font-semibold hover:underline">Sign Up</Link>
                            </p>
                        </>
                    ) : showEmailOtp ? (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                            <div className="text-center space-y-2">
                                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0057BB] flex items-center justify-center mx-auto shadow-sm border border-blue-100">
                                    <Mail size={28} />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900">
                                    Verify Email OTP
                                </h2>
                                <p className="text-gray-500 text-xs leading-relaxed max-w-xs mx-auto">
                                    A 6-digit verification code has been sent to <strong className="text-slate-800">{displayEmail}</strong>.
                                </p>
                            </div>

                            {resendSuccess && (
                                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2.5 rounded-xl text-xs font-bold text-center animate-in fade-in">
                                    New OTP sent to your email! ✉️
                                </div>
                            )}

                            {error && (
                                <div key={error} className="bg-red-50/90 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-sm animate-shake">
                                    <AlertCircle size={16} className="shrink-0 text-red-500" />
                                    <span className="leading-snug">{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleVerifyEmailOtp} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 text-center">
                                        Enter 6-Digit Email OTP
                                    </label>
                                    <input
                                        type="text"
                                        autoFocus
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={30}
                                        value={emailOtpCode}
                                        onPaste={e => {
                                            e.preventDefault();
                                            const pasted = (e.clipboardData ? e.clipboardData.getData('text') : '').replace(/\D/g, '').slice(0, 6);
                                            setEmailOtpCode(pasted);
                                            setError('');
                                        }}
                                        onChange={e => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                            setEmailOtpCode(val);
                                            setError('');
                                        }}
                                        placeholder="000000"
                                        className="w-full h-13 text-center font-mono text-2xl font-bold tracking-widest bg-slate-50 border border-gray-300 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300"
                                    />
                                </div>

                                <button
                                    disabled={otpLoading || emailOtpCode.length !== 6}
                                    type="submit"
                                    className="w-full py-3.5 bg-[#0057BB] hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-500/20 active:scale-[0.99] flex items-center justify-center gap-2"
                                >
                                    {otpLoading && <Loader2 size={16} className="animate-spin" />}
                                    <span>Verify & Sign In</span>
                                </button>
                            </form>

                            <div className="space-y-3 pt-2 text-center">
                                <button
                                    type="button"
                                    disabled={resendCooldown > 0 || resendLoading}
                                    onClick={handleResendEmailOtp}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0057BB] hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                                >
                                    {resendLoading ? <Loader2 size={12} className="animate-spin" /> : <RotateCw size={12} />}
                                    <span>{resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Email OTP'}</span>
                                </button>

                                <div>
                                    <button
                                        type="button"
                                        onClick={handleCancelAuth}
                                        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
                                    >
                                        <ArrowLeft size={13} />
                                        <span>Back to Login</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                            <div className="text-center space-y-2">
                                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0057BB] flex items-center justify-center mx-auto shadow-sm border border-blue-100">
                                    {useBackupCode ? <KeyRound size={28} /> : <Smartphone size={28} />}
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {useBackupCode ? 'Enter Recovery Code' : 'Two-Factor Verification'}
                                </h2>
                                <p className="text-gray-500 text-xs leading-relaxed max-w-xs mx-auto">
                                    {useBackupCode 
                                        ? 'Enter one of your 8-character backup recovery codes.' 
                                        : 'Open your Google Authenticator app and enter the 6-digit code for HisabKhata.'}
                                </p>
                            </div>

                            {error && (
                                <div key={error} className="bg-red-50/90 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-sm animate-shake">
                                    <AlertCircle size={16} className="shrink-0 text-red-500" />
                                    <span className="leading-snug">{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleVerify2FA} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 text-center">
                                        {useBackupCode ? 'Backup Code' : '6-Digit Authentication Code'}
                                    </label>
                                    <input
                                        type="text"
                                        autoFocus
                                        inputMode={useBackupCode ? 'text' : 'numeric'}
                                        pattern={useBackupCode ? undefined : '[0-9]*'}
                                        maxLength={30}
                                        value={totpCode}
                                        onPaste={e => {
                                            if (!useBackupCode) {
                                                e.preventDefault();
                                                const pasted = (e.clipboardData ? e.clipboardData.getData('text') : '').replace(/\D/g, '').slice(0, 6);
                                                setTotpCode(pasted);
                                                setError('');
                                            }
                                        }}
                                        onChange={e => {
                                            const val = useBackupCode 
                                                ? e.target.value.toUpperCase().slice(0, 9)
                                                : e.target.value.replace(/\D/g, '').slice(0, 6);
                                            setTotpCode(val);
                                            setError('');
                                        }}
                                        placeholder={useBackupCode ? 'XXXX-XXXX' : '000000'}
                                        className="w-full h-13 text-center font-mono text-2xl font-bold tracking-widest bg-slate-50 border border-gray-300 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300 uppercase"
                                    />
                                </div>

                                <button
                                    disabled={totpLoading || !totpCode.trim()}
                                    type="submit"
                                    className="w-full py-3.5 bg-[#0057BB] hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-500/20 active:scale-[0.99] flex items-center justify-center gap-2"
                                >
                                    {totpLoading && <Loader2 size={16} className="animate-spin" />}
                                    <span>Verify & Continue</span>
                                </button>
                            </form>

                            <div className="space-y-3 pt-2 text-center">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setUseBackupCode(!useBackupCode);
                                        setTotpCode('');
                                        setError('');
                                    }}
                                    className="text-xs font-bold text-[#0057BB] hover:underline cursor-pointer"
                                >
                                    {useBackupCode ? '← Use Google Authenticator App' : 'Lost your phone? Use Backup Code'}
                                </button>

                                <div>
                                    <button
                                        type="button"
                                        onClick={handleCancelAuth}
                                        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
                                    >
                                        <ArrowLeft size={13} />
                                        <span>Back to Login</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
