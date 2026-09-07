import React, { useState, useEffect } from 'react';
import { 
    ShieldCheck, 
    ShieldAlert, 
    QrCode, 
    KeyRound, 
    Copy, 
    Check, 
    X, 
    AlertCircle, 
    Loader2, 
    Smartphone, 
    Download, 
    RefreshCw,
    ExternalLink
} from 'lucide-react';
import { 
    generateTotpSecret, 
    generateBackupCodes, 
    getTotpUri, 
    getQrCodeUrl, 
    verifyTotpCode 
} from '../utils/totpUtils';

const TwoFactorModal = ({ 
    isOpen, 
    onClose, 
    isEnabled, 
    userEmail, 
    currentSecret, 
    currentBackupCodes = [], 
    onEnable, 
    onDisable 
}) => {
    const [step, setStep] = useState(1);
    const [setupMode, setSetupMode] = useState('key');
    const [secret, setSecret] = useState('');
    const [backupCodes, setBackupCodes] = useState([]);
    const [verificationCode, setVerificationCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [copiedKey, setCopiedKey] = useState(false);
    const [copiedCodes, setCopiedCodes] = useState(false);
    const [showDisableConfirm, setShowDisableConfirm] = useState(false);
    const [showBackupCodes, setShowBackupCodes] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setError('');
            setVerificationCode('');
            setShowDisableConfirm(false);
            setShowBackupCodes(false);
            setSetupMode('key');

            if (!isEnabled) {
                setStep(1);
                const newSecret = generateTotpSecret(16);
                const newCodes = generateBackupCodes(6);
                setSecret(newSecret);
                setBackupCodes(newCodes);
            }
        }
    }, [isOpen, isEnabled]);

    if (!isOpen) return null;

    const totpUri = getTotpUri(secret, userEmail || 'Account', 'HisabKhata');
    const qrUrl = getQrCodeUrl(totpUri, 200);

    const handleCopyKey = () => {
        if (!secret) return;
        navigator.clipboard.writeText(secret);
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
    };

    const handleCopyBackupCodes = () => {
        const codesToCopy = isEnabled ? currentBackupCodes : backupCodes;
        if (!codesToCopy || codesToCopy.length === 0) return;
        navigator.clipboard.writeText(codesToCopy.join('\n'));
        setCopiedCodes(true);
        setTimeout(() => setCopiedCodes(false), 2000);
    };

    const handleDownloadBackupCodes = () => {
        const codesToDownload = isEnabled ? currentBackupCodes : backupCodes;
        const textContent = `HisabKhata 2FA Backup Recovery Codes\nGenerated: ${new Date().toLocaleString()}\nAccount: ${userEmail}\n\n` +
            codesToDownload.map((c, i) => `${i + 1}. ${c}`).join('\n') +
            `\n\nEach code can be used once if you lose access to your authenticator app.`;
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `hisabkhata-backup-codes-${Date.now()}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleRegenerate = () => {
        const newSecret = generateTotpSecret(16);
        const newCodes = generateBackupCodes(6);
        setSecret(newSecret);
        setBackupCodes(newCodes);
        setVerificationCode('');
        setError('');
    };

    const handleVerifyAndEnable = async (e) => {
        e.preventDefault();
        setError('');

        if (verificationCode.trim().length !== 6) {
            setError('Please enter the 6-digit authentication code.');
            return;
        }

        setLoading(true);
        try {
            const verification = await verifyTotpCode(verificationCode, secret);
            if (!verification.valid) {
                setError('Invalid 6-digit code. Check your Google Authenticator app and try again.');
                setLoading(false);
                return;
            }

            await onEnable({
                secret,
                backupCodes,
                enabledAt: Date.now()
            });

            setStep(2);
        } catch (err) {
            setError(err.message || 'Failed to verify authentication code.');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmDisable = async () => {
        setLoading(true);
        try {
            await onDisable();
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to disable 2FA.');
        } finally {
            setLoading(false);
        }
    };

    const formatSecret = (s) => {
        if (!s) return '';
        return s.match(/.{1,4}/g)?.join(' ') || s;
    };

    return (
        <div className="fixed inset-0 z-[250] flex items-end md:items-center justify-center">
            <div 
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300"
                onClick={onClose}
            />

            <div className="relative w-full md:max-w-lg bg-white rounded-t-[32px] md:rounded-3xl shadow-2xl border-t md:border border-slate-100 overflow-hidden z-10 animate-in slide-in-from-bottom-6 md:zoom-in-95 duration-200 flex flex-col max-h-[92vh] md:max-h-[90vh]">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-2.5 mb-1 md:hidden" />

                <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 bg-gradient-to-r from-blue-50/90 via-sky-50/50 to-white border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0057BB]/10 text-[#0057BB] flex items-center justify-center shrink-0">
                            <Smartphone size={20} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate">
                                Two-Factor Authentication
                            </h3>
                            <p className="text-[11px] text-slate-500 font-medium">
                                Google Authenticator & TOTP
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                    {isEnabled ? (
                        <div className="space-y-4">
                            <div className="p-4 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-start gap-3">
                                <div className="p-2 rounded-xl bg-emerald-500 text-white shrink-0 shadow-xs">
                                    <ShieldCheck size={20} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-sm font-bold text-emerald-950">
                                        Google Authenticator Active
                                    </h4>
                                    <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed font-medium">
                                        Your account requires a 6-digit code from Google Authenticator to log in.
                                    </p>
                                </div>
                            </div>

                            {!showDisableConfirm ? (
                                <div className="space-y-3">
                                    <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                                <KeyRound size={16} className="text-[#0057BB]" />
                                                <span>Backup Recovery Codes</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setShowBackupCodes(!showBackupCodes)}
                                                className="text-xs font-bold text-[#0057BB] hover:underline cursor-pointer"
                                            >
                                                {showBackupCodes ? 'Hide Codes' : 'Show Codes'}
                                            </button>
                                        </div>

                                        {showBackupCodes && (
                                            <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                                                <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-xl border border-slate-200">
                                                    {currentBackupCodes && currentBackupCodes.length > 0 ? (
                                                        currentBackupCodes.map((code, idx) => (
                                                            <div key={idx} className="font-mono text-xs font-bold text-slate-800 tracking-wider bg-slate-50 px-2.5 py-1.5 rounded text-center border border-slate-100">
                                                                {code}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="col-span-2 text-xs text-slate-400 text-center py-1">No backup codes stored</p>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleCopyBackupCodes}
                                                        className="flex-1 py-2 px-3 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                                    >
                                                        {copiedCodes ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                                        <span>{copiedCodes ? 'Copied' : 'Copy Codes'}</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleDownloadBackupCodes}
                                                        className="flex-1 py-2 px-3 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                                    >
                                                        <Download size={14} />
                                                        <span>Download TXT</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setShowDisableConfirm(true)}
                                        className="w-full py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl text-xs font-bold transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <ShieldAlert size={16} />
                                        <span>Disable Two-Factor Authentication</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3 animate-in fade-in duration-200">
                                    <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                                        <AlertCircle size={18} className="text-rose-600" />
                                        <span>Turn off 2FA protection?</span>
                                    </div>
                                    <p className="text-xs text-rose-700 leading-relaxed">
                                        Disabling 2FA reduces account security. You will only need a password to log in.
                                    </p>
                                    <div className="flex items-center gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setShowDisableConfirm(false)}
                                            className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            disabled={loading}
                                            onClick={handleConfirmDisable}
                                            className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            {loading && <Loader2 size={14} className="animate-spin" />}
                                            <span>Yes, Turn Off</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : step === 1 ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 p-1 bg-slate-100/80 rounded-xl gap-1">
                                <button
                                    type="button"
                                    onClick={() => setSetupMode('key')}
                                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                        setupMode === 'key' 
                                            ? 'bg-white text-[#0057BB] shadow-xs' 
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <KeyRound size={14} />
                                    <span>Setup Key</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSetupMode('qr')}
                                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                        setupMode === 'qr' 
                                            ? 'bg-white text-[#0057BB] shadow-xs' 
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <QrCode size={14} />
                                    <span>Scan QR Code</span>
                                </button>
                            </div>

                            {setupMode === 'key' ? (
                                <div className="bg-gradient-to-br from-blue-50/80 to-slate-50 border border-blue-100 rounded-2xl p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                            Your Secret Key
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleRegenerate}
                                            className="text-[11px] font-bold text-[#0057BB] hover:underline flex items-center gap-1 cursor-pointer"
                                        >
                                            <RefreshCw size={11} />
                                            <span>New Key</span>
                                        </button>
                                    </div>

                                    <div className="bg-white p-3 rounded-xl border border-blue-200/80 flex items-center justify-between gap-2 shadow-xs">
                                        <span className="font-mono text-sm sm:text-base font-black text-slate-900 tracking-wider select-all truncate">
                                            {formatSecret(secret)}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleCopyKey}
                                            className="py-1.5 px-3 bg-[#0057BB] hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-2xs cursor-pointer active:scale-95"
                                        >
                                            {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                                            <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                                        </button>
                                    </div>

                                    <div className="space-y-1 text-[11px] text-slate-600 font-medium">
                                        <p className="flex items-center gap-1.5">
                                            <span className="w-4 h-4 rounded-full bg-blue-100 text-[#0057BB] font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                                            <span>Tap <strong>Copy</strong> to copy your secret key.</span>
                                        </p>
                                        <p className="flex items-center gap-1.5">
                                            <span className="w-4 h-4 rounded-full bg-blue-100 text-[#0057BB] font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                                            <span>Open <strong>Google Authenticator</strong> & tap <strong>+ → Enter a setup key</strong>.</span>
                                        </p>
                                        <p className="flex items-center gap-1.5">
                                            <span className="w-4 h-4 rounded-full bg-blue-100 text-[#0057BB] font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                                            <span>Paste the key and type the 6-digit code below.</span>
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center space-y-3">
                                    <div className="w-44 h-44 bg-white p-2 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-center">
                                        <img 
                                            src={qrUrl} 
                                            alt="Google Authenticator QR Code" 
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 text-center font-medium max-w-xs">
                                        Scan with <strong>Google Authenticator</strong> or <strong>Microsoft Authenticator</strong> on another phone.
                                    </p>
                                </div>
                            )}

                            <form onSubmit={handleVerifyAndEnable} className="space-y-3 pt-1">
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                                        Enter 6-Digit Authenticator Code
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={30}
                                        value={verificationCode}
                                        onPaste={(e) => {
                                            e.preventDefault();
                                            const pasted = (e.clipboardData ? e.clipboardData.getData('text') : '').replace(/\D/g, '').slice(0, 6);
                                            setVerificationCode(pasted);
                                            setError('');
                                        }}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                            setVerificationCode(val);
                                            setError('');
                                        }}
                                        placeholder="000000"
                                        className="w-full h-12 text-center font-mono text-2xl font-black tracking-widest bg-slate-50 border border-slate-200 focus:border-[#0057BB] focus:ring-4 focus:ring-blue-500/10 rounded-xl outline-none transition-all placeholder:text-slate-300"
                                    />
                                </div>

                                {error && (
                                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2 animate-in fade-in">
                                        <AlertCircle size={15} className="shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <div className="flex items-center gap-2.5 pt-1">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading || verificationCode.length !== 6}
                                        className="flex-1 py-3 bg-gradient-to-r from-[#0057BB] to-[#1d4ed8] hover:from-[#00479e] hover:to-[#1e40af] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        {loading && <Loader2 size={16} className="animate-spin" />}
                                        <span>Verify & Activate</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-1">
                                <div className="w-11 h-11 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto mb-1.5 shadow-md">
                                    <Check size={24} strokeWidth={3} />
                                </div>
                                <h4 className="text-sm sm:text-base font-bold text-emerald-950">
                                    2FA Enabled Successfully!
                                </h4>
                                <p className="text-xs text-emerald-700 font-medium">
                                    Your Google Authenticator app is now linked.
                                </p>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                                <div>
                                    <p className="text-xs font-bold text-slate-900">Save Backup Recovery Codes</p>
                                    <p className="text-[11px] text-slate-500 font-medium">Use these one-time codes if you ever lose your phone.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                                    {backupCodes.map((code, idx) => (
                                        <div key={idx} className="font-mono text-xs font-bold text-slate-800 tracking-wider bg-slate-50 px-2 py-1.5 rounded text-center border border-slate-100">
                                            {code}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={handleCopyBackupCodes}
                                        className="flex-1 py-2 px-3 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                        {copiedCodes ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                        <span>{copiedCodes ? 'Copied' : 'Copy All'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDownloadBackupCodes}
                                        className="flex-1 py-2 px-3 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                        <Download size={14} />
                                        <span>Download</span>
                                    </button>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full py-3 bg-gradient-to-r from-[#0057BB] to-[#1d4ed8] hover:from-[#00479e] hover:to-[#1e40af] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-[0.99] cursor-pointer"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TwoFactorModal;
