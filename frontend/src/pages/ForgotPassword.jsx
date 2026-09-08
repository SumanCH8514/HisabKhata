import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getFirebaseErrorMessage } from '../utils/errorHandlers';
import { AlertCircle, ArrowLeft, Mail, ShieldCheck, CheckCircle2, RotateCw } from 'lucide-react';
import SecurityCaptcha from '../components/SecurityCaptcha';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [submittedEmail, setSubmittedEmail] = useState('');
    const [isSent, setIsSent] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
    const [captchaResetKey, setCaptchaResetKey] = useState(0);
    const { resetPassword, globalSettings } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (globalSettings?.captcha && !isCaptchaVerified) {
            setError('Please complete the security verification challenge.');
            return;
        }

        try {
            setError('');
            setLoading(true);
            await resetPassword(email);
            setSubmittedEmail(email);
            setIsSent(true);
        } catch (err) {
            setError(getFirebaseErrorMessage(err));
            if (globalSettings?.captcha) {
                setCaptchaResetKey(k => k + 1);
                setIsCaptchaVerified(false);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!submittedEmail || resendLoading) return;
        try {
            setResendLoading(true);
            setError('');
            await resetPassword(submittedEmail);
        } catch (err) {
            setError(getFirebaseErrorMessage(err));
        } finally {
            setResendLoading(false);
        }
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
                        Need help getting<br />back into your account?
                    </h2>
                    <p className="text-[#9bbdd4] text-base leading-relaxed">
                        Follow the simple steps below to reset your password and regain access to your ledger.
                    </p>

                    <div className="space-y-4 pt-2">
                        <div className="flex items-start gap-3.5">
                            <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                1
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">Enter your email</p>
                                <p className="text-xs text-[#9bbdd4] mt-0.5">Provide the email address linked to your HisabKhata account.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3.5">
                            <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                2
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">Check your inbox</p>
                                <p className="text-xs text-[#9bbdd4] mt-0.5">Open the password reset email and click the verification link.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3.5">
                            <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                3
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">Set a new password</p>
                                <p className="text-xs text-[#9bbdd4] mt-0.5">Choose your new secure password and log back into your dashboard.</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3 mt-4">
                        <span className="material-symbols-outlined text-[#9bbdd4] text-[20px] shrink-0 mt-0.5">help_outline</span>
                        <div className="text-xs text-[#9bbdd4] leading-relaxed">
                            <span>Having trouble accessing your email? Contact our support desk at </span>
                            <a href="mailto:hisabkhata@sumanonline.com" className="text-white font-medium underline underline-offset-2 hover:text-blue-300 transition-colors">hisabKhata@SumanOnline.Com</a>
                        </div>
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

                    {!isSent ? (
                        <>
                            <h1 className="text-2xl font-bold text-gray-900 mb-1">Reset your password</h1>
                            <p className="text-gray-500 text-sm mb-8">
                                Enter the email associated with your account and we will send you a link to reset your password.
                            </p>

                            {error && (
                                <div key={error} className="bg-red-50/90 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2.5 shadow-sm animate-shake mb-5">
                                    <AlertCircle size={18} className="shrink-0 text-red-500" />
                                    <span className="leading-snug">{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                        Email Address
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        required
                                        autoFocus
                                        placeholder="name@company.com"
                                        className="w-full px-4 py-3 border border-gray-300 rounded text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                    />
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
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                                    ) : null}
                                    <span>{loading ? 'Sending link...' : 'Send Reset Link'}</span>
                                </button>
                            </form>

                            <div className="mt-8 text-center space-y-4">
                                <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline">
                                    <ArrowLeft size={16} />
                                    <span>Return to sign in</span>
                                </Link>
                                <p className="text-center text-sm text-gray-500">
                                    Don't have an account?{' '}
                                    <Link to="/signup" className="text-blue-600 font-semibold hover:underline">Sign Up</Link>
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-6">
                            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100 shadow-xs">
                                <Mail size={26} />
                            </div>

                            <div className="text-center space-y-2">
                                <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
                                <p className="text-gray-500 text-sm leading-relaxed">
                                    We have sent a password reset link to <strong className="text-gray-900">{submittedEmail}</strong>. Follow the instructions in the email to set your new password.
                                </p>
                            </div>

                            {error && (
                                <div key={error} className="bg-red-50/90 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2.5 shadow-sm animate-shake">
                                    <AlertCircle size={18} className="shrink-0 text-red-500" />
                                    <span className="leading-snug">{error}</span>
                                </div>
                            )}

                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                                <p className="font-semibold text-slate-700">Didn't receive the email?</p>
                                <p>Check your spam or promotions folder, or click below to request a new link.</p>
                            </div>

                            <div className="space-y-3 pt-2">
                                <button
                                    type="button"
                                    disabled={resendLoading}
                                    onClick={handleResend}
                                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                                >
                                    {resendLoading ? (
                                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <RotateCw size={15} />
                                    )}
                                    <span>{resendLoading ? 'Resending...' : 'Resend Email'}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsSent(false);
                                        setError('');
                                    }}
                                    className="w-full py-2.5 text-slate-600 hover:text-slate-900 text-sm font-semibold transition-colors"
                                >
                                    Try another email address
                                </button>
                            </div>

                            <div className="pt-4 border-t border-gray-100 text-center">
                                <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline">
                                    <ArrowLeft size={16} />
                                    <span>Return to sign in</span>
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
