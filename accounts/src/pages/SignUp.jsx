import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const SignUp = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [terms, setTerms] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { register, loginWithGoogle, globalSettings } = useAuth();
    const navigate = useNavigate();

    const handleGoogleLogin = async () => {
        try {
            setError('');
            setLoading(true);
            await loginWithGoogle();
            navigate('/customers');
        } catch (err) {
            setError('Failed to sign up with Google. ' + err.message);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (globalSettings?.newRegistrations === false) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-slate-100 text-center space-y-6">
                    <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                        <span className="material-symbols-outlined text-4xl">person_add_disabled</span>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black text-slate-900">Registrations Closed</h2>
                        <p className="text-slate-500 text-sm">New user registrations are currently disabled by the administrator. Please contact support or try again later.</p>
                    </div>
                    <button onClick={() => navigate('/login')} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all">
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!terms) return setError('You must agree to the Terms of Service.');
        if (!phone) return setError('Mobile number is required.');
        if (phone.length < 10) return setError('Please enter a valid mobile number.');

        try {
            setError('');
            setLoading(true);
            await register(name, email, password, phone);
            navigate('/customers');
        } catch (err) {
            setError('Failed to create an account. ' + err.message);
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
                <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-2xl tracking-tight">HisabKhata</span>
                    <span className="pro-badge">PRO</span>
                </div>
                <div className="space-y-6">
                    <h2 className="text-3xl font-bold text-white leading-tight">
                        Start managing your<br />business ledger today
                    </h2>
                    <p className="text-[#9bbdd4] text-base leading-relaxed">
                        Simple, powerful credit-debit tracking for small businesses. Free to get started.
                    </p>
                    <ul className="space-y-3">
                        {['Track customer balances in real-time', 'Send payment reminders easily', 'Secure & private data storage'].map(item => (
                            <li key={item} className="flex items-center gap-2.5 text-[#9bbdd4] text-sm">
                                <span className="material-symbols-outlined text-green-400 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
                <p className="text-[#5a7a95] text-xs">© 2024-2026 HisabKhata. All rights reserved.</p>
            </div>

            {/* Right signup panel */}
            <div className="flex-1 flex lg:items-center items-start lg:justify-center justify-start pt-8 pb-20 px-6 bg-white overflow-y-auto">
                <div className="w-full max-w-[400px]">
                    <div className="lg:hidden flex items-center gap-2 mb-6 justify-center">
                        <span className="font-bold text-2xl text-gray-900">HisabKhata</span>
                        <span className="pro-badge">PRO</span>
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h1>
                    <p className="text-gray-500 text-sm mb-8">Get started — it's free!</p>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm mb-5">
                            {error}
                        </div>
                    )}

                    {globalSettings?.signupWithMail !== false ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Full Name</label>
                                <input id="name" type="text" required placeholder="Enter your full name"
                                    className="w-full px-4 py-3 border border-gray-300 rounded text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all"
                                    value={name} onChange={e => setName(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email Address</label>
                                <input id="email" type="email" required placeholder="name@company.com"
                                    className="w-full px-4 py-3 border border-gray-300 rounded text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all"
                                    value={email} onChange={e => setEmail(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Mobile Number</label>
                                <input id="phone" type="tel" required placeholder="Enter 10 digit number"
                                    className="w-full px-4 py-3 border border-gray-300 rounded text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all"
                                    value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Password</label>
                                <div className="relative">
                                    <input id="password" type={showPassword ? 'text' : 'password'} required placeholder="••••••••"
                                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all"
                                        value={password} onChange={e => setPassword(e.target.value)} />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        <span className="material-symbols-outlined text-[20px]">
                                            {showPassword ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Must be at least 8 characters</p>
                            </div>
                            <div className="flex items-start gap-2.5 py-1">
                                <input id="terms" type="checkbox"
                                    className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                    checked={terms} onChange={e => setTerms(e.target.checked)} />
                                <label htmlFor="terms" className="text-xs text-gray-500 leading-relaxed">
                                    I agree to the <Link to="/terms-of-condition" className="text-blue-600 hover:underline">Terms of Service</Link> and <Link to="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</Link>
                                </label>
                            </div>
                            <button disabled={loading} type="submit"
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded text-sm font-semibold transition-colors shadow-sm">
                                {loading ? 'Creating Account...' : 'Sign Up'}
                            </button>
                        </form>
                    ) : (
                        <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-3">
                            <span className="material-symbols-outlined text-slate-400">mail_lock</span>
                            <p className="text-xs font-bold text-slate-600 uppercase tracking-widest leading-relaxed">Email signup is disabled.<br/><span className="text-[10px] text-slate-400 font-medium">Please use Google login below.</span></p>
                        </div>
                    )}

                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-gray-200"></div>
                        <span className="text-xs text-gray-400 uppercase tracking-wider">Or continue with</span>
                        <div className="flex-1 h-px bg-gray-200"></div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button disabled={loading} onClick={handleGoogleLogin} type="button" className="flex items-center justify-center gap-2 py-2.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            Google
                        </button>
                        <button type="button" className="flex items-center justify-center gap-2 py-2.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                            </svg>
                            GitHub
                        </button>
                    </div>

                    <p className="text-center text-sm text-gray-500 mt-6">
                        Already have an account?{' '}
                        <Link to="/login" className="text-blue-600 font-semibold hover:underline">Login here</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SignUp;
