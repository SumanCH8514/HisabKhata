import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getFirebaseErrorMessage } from '../utils/errorHandlers';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { login, logout, loginWithGoogle, globalSettings } = useAuth();
    const navigate = useNavigate();

    const handleGoogleLogin = async () => {
        try {
            setError('');
            setLoading(true);
            const userCredential = await loginWithGoogle();
            const user = userCredential.user;

            if (!user.emailVerified) {
                await logout();
                setError('Your Google account email is not verified. Please verify it to continue.');
                return;
            }

            navigate('/customers');
        } catch (err) {
            setError(getFirebaseErrorMessage(err));
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
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

            navigate('/customers');
        } catch (err) {
            setError(getFirebaseErrorMessage(err));
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
            {/* Left branding panel */}
            <div className="hidden lg:flex flex-col justify-between w-[520px] flex-shrink-0 p-12 text-white relative overflow-hidden"
                style={{ backgroundColor: '#1c2b3a' }}>
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-2xl tracking-tight">HisabKhata</span>
                    <span className="pro-badge">PRO</span>
                </div>

                {/* Center content */}
                <div className="space-y-6">
                    <h2 className="text-3xl font-bold text-white leading-tight">
                        Manage your business<br/>with ease
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
                </div>

                {/* Bottom text */}
                <p className="text-[#5a7a95] text-xs">
                    © 2024-2026 HisabKhata. All rights reserved.
                </p>
            </div>

            {/* Right login panel */}
            <div className="flex-1 flex lg:items-center items-start lg:justify-center justify-start pt-8 pb-20 px-6 bg-white overflow-y-auto">
                <div className="w-full max-w-[400px]">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center gap-2 mb-6 justify-center">
                        <span className="font-bold text-2xl text-gray-900">HisabKhata</span>
                        <span className="pro-badge">PRO</span>
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
                    <p className="text-gray-500 text-sm mb-8">Sign in to your account to continue</p>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm mb-5">
                            {error}
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

                            <button
                                disabled={loading}
                                type="submit"
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded text-sm font-semibold transition-colors shadow-sm"
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
                </div>
            </div>
        </div>
    );
};

export default Login;
