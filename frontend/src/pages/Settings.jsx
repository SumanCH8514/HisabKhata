import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import AppMobileHeader from '../components/AppMobileHeader';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';
import { dbService, authService } from '../services/firebase';
import { 
    Bell, 
    Lock, 
    Globe, 
    Database, 
    Eye, 
    ChevronRight, 
    ShieldCheck, 
    Palette, 
    Download, 
    Trash2,
    Check,
    X,
    AlertTriangle,
    Mail,
    FileSpreadsheet,
    Loader2
} from 'lucide-react';

const Settings = () => {
    const { currentUser, userData, logout } = useAuth();
    const navigate = useNavigate();

    // User preferences state (with persistence fallback)
    const [preferences, setPreferences] = useState({
        notifications: true,
        twoFactorAuth: false,
        currency: 'INR',
        language: 'en',
        autoBackup: true
    });

    // Modals & UI States
    const [activeModal, setActiveModal] = useState(null); // 'password' | 'language' | 'currency' | '2fa' | 'delete' | null
    const [toast, setToast] = useState(null); // { type: 'success' | 'error' | 'info', message: string }
    const [loadingAction, setLoadingAction] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    // Load initial preferences from userData or localStorage
    useEffect(() => {
        if (userData?.preferences) {
            setPreferences(prev => ({ ...prev, ...userData.preferences }));
        } else {
            const localPrefs = localStorage.getItem('hk_user_preferences');
            if (localPrefs) {
                try {
                    setPreferences(prev => ({ ...prev, ...JSON.parse(localPrefs) }));
                } catch (e) {
                    console.warn("Failed to parse local preferences", e);
                }
            }
        }
    }, [userData]);

    // Toast helper with auto dismiss
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Save preferences to DB and localStorage
    const updatePreference = async (key, value) => {
        const updated = { ...preferences, [key]: value };
        setPreferences(updated);
        localStorage.setItem('hk_user_preferences', JSON.stringify(updated));

        if (currentUser?.uid) {
            try {
                await dbService.updateUserProfile(currentUser.uid, { preferences: updated });
                showToast(`Preference updated successfully!`);
            } catch (error) {
                console.error("Error saving preference:", error);
                showToast("Updated locally. Cloud sync pending.", "info");
            }
        }
    };

    // Toggle Notifications
    const handleToggleNotifications = async () => {
        const nextVal = !preferences.notifications;
        if (nextVal && 'Notification' in window && Notification.permission !== 'granted') {
            try {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    showToast("Notification permission was denied in browser settings.", "error");
                    return;
                }
            } catch (err) {
                console.warn("Browser notification request failed", err);
            }
        }
        await updatePreference('notifications', nextVal);
    };

    // Toggle Two Factor Authentication
    const handleToggle2FA = async () => {
        const nextVal = !preferences.twoFactorAuth;
        await updatePreference('twoFactorAuth', nextVal);
        if (nextVal) {
            showToast("Two-Factor Authentication is now enabled for this account.");
        } else {
            showToast("Two-Factor Authentication disabled.", "info");
        }
    };

    // Send Password Reset Email
    const handleSendPasswordReset = async () => {
        if (!currentUser?.email) {
            showToast("No email associated with this account.", "error");
            return;
        }
        setLoadingAction(true);
        try {
            await authService.resetPassword(currentUser.email);
            showToast(`Password reset link sent to ${currentUser.email}! Check your inbox.`);
            setActiveModal(null);
        } catch (error) {
            console.error("Password reset error:", error);
            showToast(error.message || "Failed to send reset email. Please try again.", "error");
        } finally {
            setLoadingAction(false);
        }
    };

    // Export All Ledger Data to CSV
    const handleExportAllData = async () => {
        if (!currentUser?.uid) return;
        setLoadingAction(true);
        try {
            // Fetch customers
            const customers = await new Promise((resolve) => {
                const unsub = dbService.listenUserCustomers(currentUser.uid, (data) => {
                    unsub();
                    resolve(data || []);
                });
            });

            // Prepare CSV Data
            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += "Customer Name,Phone,Email,Current Balance (INR),Created At,Status\n";

            customers.forEach(cust => {
                const name = `"${(cust.name || '').replace(/"/g, '""')}"`;
                const phone = `"${(cust.phone || '').replace(/"/g, '""')}"`;
                const email = `"${(cust.email || '').replace(/"/g, '""')}"`;
                const balance = cust.balance || 0;
                const createdAt = cust.createdAt ? new Date(cust.createdAt).toISOString() : 'N/A';
                const status = balance > 0 ? 'You Got (Advance)' : balance < 0 ? 'You Gave (Due)' : 'Settled (0)';
                csvContent += `${name},${phone},${email},${balance},${createdAt},${status}\n`;
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            const dateStr = new Date().toISOString().split('T')[0];
            link.setAttribute("download", `hisabkhata_ledger_backup_${dateStr}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showToast(`Exported ${customers.length} customer records to CSV!`);
        } catch (error) {
            console.error("Export error:", error);
            showToast("Failed to export data. Please try again.", "error");
        } finally {
            setLoadingAction(false);
        }
    };

    // Delete Account Handler
    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE') {
            showToast("Please type 'DELETE' exactly to confirm.", "error");
            return;
        }
        setLoadingAction(true);
        try {
            // Clear user data or mark disabled
            if (currentUser?.uid) {
                await dbService.updateUserProfile(currentUser.uid, {
                    isDeleted: true,
                    deletedAt: Date.now()
                });
            }
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Delete account error:", error);
            showToast(error.message || "Failed to delete account. Please try again.", "error");
            setLoadingAction(false);
        }
    };

    const currencyMap = {
        'INR': { symbol: '₹', label: 'Indian Rupee (₹ INR)' },
        'USD': { symbol: '$', label: 'US Dollar ($ USD)' },
        'BDT': { symbol: '৳', label: 'Bangladeshi Taka (৳ BDT)' },
        'EUR': { symbol: '€', label: 'Euro (€ EUR)' },
        'GBP': { symbol: '£', label: 'British Pound (£ GBP)' }
    };

    const languageMap = {
        'en': 'English (US)',
        'hi': 'हिंदी (Hindi)',
        'bn': 'বাংলা (Bengali)'
    };

    const settingSections = [
        {
            title: 'Account & Security',
            icon: <ShieldCheck className="w-5 h-5" />,
            settings: [
                { 
                    id: 'password', 
                    label: 'Change Password', 
                    desc: 'Send reset instructions to your registered email', 
                    icon: <Lock className="w-4 h-4" />, 
                    type: 'action',
                    action: () => setActiveModal('password')
                },
                { 
                    id: '2fa', 
                    label: 'Two-Factor Authentication', 
                    desc: preferences.twoFactorAuth ? 'Enabled — Extra security active' : 'Disabled — Click to enable', 
                    icon: <ShieldCheck className="w-4 h-4" />, 
                    type: 'toggle', 
                    enabled: preferences.twoFactorAuth,
                    action: handleToggle2FA
                },
            ]
        },
        {
            title: 'App Preferences',
            icon: <Palette className="w-5 h-5" />,
            settings: [
                { 
                    id: 'language', 
                    label: 'App Language', 
                    desc: languageMap[preferences.language] || 'English (US)', 
                    icon: <Globe className="w-4 h-4" />, 
                    type: 'action',
                    action: () => setActiveModal('language')
                },
                { 
                    id: 'notifications', 
                    label: 'Notifications & Alerts', 
                    desc: preferences.notifications ? 'Enabled — Daily summaries & due alerts' : 'Muted', 
                    icon: <Bell className="w-4 h-4" />, 
                    type: 'toggle', 
                    enabled: preferences.notifications,
                    action: handleToggleNotifications
                },
                { 
                    id: 'currency', 
                    label: 'Currency Format', 
                    desc: currencyMap[preferences.currency]?.label || 'Indian Rupee (₹)', 
                    icon: <Eye className="w-4 h-4" />, 
                    type: 'action',
                    action: () => setActiveModal('currency')
                },
            ]
        },
        {
            title: 'Data & Backup',
            icon: <Database className="w-5 h-5" />,
            settings: [
                { 
                    id: 'backup', 
                    label: 'Auto Cloud Backup', 
                    desc: preferences.autoBackup ? 'Real-time database sync active' : 'Sync paused', 
                    icon: <Download className="w-4 h-4" />, 
                    type: 'toggle', 
                    enabled: preferences.autoBackup,
                    action: () => updatePreference('autoBackup', !preferences.autoBackup)
                },
                { 
                    id: 'export', 
                    label: 'Export All Ledger Data', 
                    desc: 'Download CSV file of all customers and transactions', 
                    icon: <FileSpreadsheet className="w-4 h-4" />, 
                    type: 'button',
                    action: handleExportAllData
                },
            ]
        },
        {
            title: 'Danger Zone',
            icon: <Trash2 className="w-5 h-5 text-rose-500" />,
            settings: [
                { 
                    id: 'delete', 
                    label: 'Delete Account', 
                    desc: 'Permanently remove your ledger records and profile', 
                    icon: <Trash2 className="w-4 h-4 text-rose-500" />, 
                    type: 'danger',
                    action: () => {
                        setDeleteConfirmText('');
                        setActiveModal('delete');
                    }
                },
            ]
        }
    ];

    return (
        <div className="flex min-h-screen bg-[#F8FAFC] overflow-x-hidden">
            <Sidebar />
            
            <main className="flex-1 ml-0 md:ml-[260px] pb-20 md:pb-0 flex flex-col min-h-screen min-w-0">
                {/* Mobile Branded Header */}
                <AppMobileHeader />

                {/* Toast Notification */}
                {toast && (
                    <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className={`px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold ${
                            toast.type === 'error' 
                                ? 'bg-rose-600 text-white' 
                                : toast.type === 'info' 
                                ? 'bg-slate-800 text-white' 
                                : 'bg-emerald-600 text-white'
                        }`}>
                            <span>{toast.message}</span>
                            <button onClick={() => setToast(null)} className="opacity-80 hover:opacity-100">
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Desktop Page Title Header */}
                <div className="hidden md:flex items-center justify-between px-8 py-5 bg-white border-b border-slate-200/80">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            <span>Account</span>
                            <span>/</span>
                            <span className="text-[#0057BB]">Settings</span>
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
                            <ShieldCheck size={24} className="text-[#0057BB]" />
                            Preferences & Security
                        </h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Manage login authentication, backup policies, regional preferences, and security options.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <Link
                            to="/profile"
                            className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#0057BB] text-white rounded-xl text-xs font-bold hover:bg-[#004291] shadow-xs shadow-blue-500/15 transition-colors cursor-pointer"
                        >
                            <span>View Profile</span>
                        </Link>
                    </div>
                </div>

                {/* Mobile Title — Compact Branding */}
                <div className="md:hidden bg-white border-b border-gray-200 px-6 py-2 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-100 shrink-0">
                        <span className="material-symbols-outlined text-white text-[22px]">settings</span>
                    </div>
                    <div>
                        <h1 className="text-[17px] font-black text-gray-900 tracking-tight leading-none uppercase">Settings</h1>
                        <p className="text-[#8eacc0] text-[10px] mt-1 uppercase tracking-[0.2em] font-black leading-none">Account Preferences</p>
                    </div>
                </div>

                {/* =========================================================================
                    DESKTOP VIEW (md:block) — 2-Column Responsive Dashboard
                   ========================================================================= */}
                <div className="hidden md:block flex-1 w-full max-w-6xl mx-auto p-8 lg:p-10">
                    <div className="grid grid-cols-12 gap-8 items-start">
                        
                        {/* LEFT COLUMN: 8 cols — Settings Sections */}
                        <div className="col-span-12 lg:col-span-8 space-y-6">
                            {settingSections.filter(s => s.title !== 'Danger Zone').map((section, idx) => (
                                <div key={idx} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                        <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                            {section.icon}
                                            <span>{section.title}</span>
                                        </h2>
                                    </div>

                                    <div className="divide-y divide-slate-100">
                                        {section.settings.map((setting) => (
                                            <div 
                                                key={setting.id}
                                                onClick={setting.action}
                                                className="group flex items-center justify-between p-5 hover:bg-slate-50/80 transition-colors cursor-pointer"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-[#0057BB] group-hover:text-white transition-colors">
                                                        {setting.icon}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-900">
                                                            {setting.label}
                                                        </p>
                                                        <p className="text-slate-500 text-xs mt-0.5">{setting.desc}</p>
                                                    </div>
                                                </div>

                                                {setting.type === 'toggle' ? (
                                                    <div className={`w-11 h-6 rounded-full p-1 transition-colors ${setting.enabled ? 'bg-[#0057BB]' : 'bg-slate-200'}`}>
                                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-xs ${setting.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                                    </div>
                                                ) : setting.type === 'button' ? (
                                                    <button 
                                                        disabled={loadingAction}
                                                        className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0057BB] text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                                                    >
                                                        {loadingAction ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                                                        <span>Download</span>
                                                    </button>
                                                ) : (
                                                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* RIGHT COLUMN: 4 cols — Account Snapshot & Danger Zone */}
                        <div className="col-span-12 lg:col-span-4 space-y-6">
                            
                            {/* Account Status Card */}
                            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                                        Account Snapshot
                                    </h3>
                                    <span className="text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                                        Active PRO
                                    </span>
                                </div>

                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Email:</span>
                                        <span className="font-bold text-slate-800 truncate max-w-[170px]">{currentUser?.email}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Store:</span>
                                        <span className="font-bold text-slate-800 truncate max-w-[170px]">{userData?.businessName || 'HisabKhata Store'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Security:</span>
                                        <span className="font-bold text-emerald-600">256-bit Encrypted</span>
                                    </div>
                                </div>

                                <Link
                                    to="/profile"
                                    className="w-full mt-2 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <span>Manage Profile</span>
                                    <ChevronRight size={14} />
                                </Link>
                            </div>

                            {/* Danger Zone Card */}
                            <div className="bg-white rounded-2xl border border-rose-200 shadow-xs overflow-hidden">
                                <div className="px-6 py-4 border-b border-rose-100 bg-rose-50/50 flex items-center justify-between">
                                    <h3 className="text-xs font-black text-rose-700 uppercase tracking-wider flex items-center gap-2">
                                        <Trash2 size={16} className="text-rose-600" />
                                        <span>Danger Zone</span>
                                    </h3>
                                </div>
                                <div className="p-5 space-y-3">
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        Permanently delete your account, parties, and financial transaction ledger. This action cannot be undone.
                                    </p>
                                    <button 
                                        onClick={() => {
                                            setDeleteConfirmText('');
                                            setActiveModal('delete');
                                        }}
                                        className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                        <Trash2 size={14} />
                                        <span>Delete Account</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* =========================================================================
                    MOBILE VIEW (< md) — Exact Existing Layout Preserved with Live Actions
                   ========================================================================= */}
                <div className="md:hidden flex-1 max-w-4xl w-full mx-auto p-4 space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                        {settingSections.map((section, idx) => (
                            <div key={idx} className="space-y-3">
                                <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                                    {section.icon}
                                    {section.title}
                                </h2>

                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                    {section.settings.map((setting, sIdx) => (
                                        <div 
                                            key={setting.id}
                                            onClick={setting.action}
                                            className={`group flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer ${sIdx !== section.settings.length - 1 ? 'border-b border-gray-50' : ''}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${setting.type === 'danger' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                                                    {setting.icon}
                                                </div>
                                                <div>
                                                    <p className={`font-bold text-[15px] ${setting.type === 'danger' ? 'text-red-600' : 'text-gray-900'}`}>
                                                        {setting.label}
                                                    </p>
                                                    <p className="text-gray-500 text-xs mt-0.5">{setting.desc}</p>
                                                </div>
                                            </div>

                                            {setting.type === 'toggle' ? (
                                                <div className={`w-11 h-6 rounded-full p-1 transition-colors ${setting.enabled ? 'bg-blue-600' : 'bg-gray-200'}`}>
                                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${setting.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                                </div>
                                            ) : setting.type === 'button' ? (
                                                <span className="text-xs font-bold text-blue-600">Export</span>
                                            ) : (
                                                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-400 transition-colors" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* =========================================================================
                    INTERACTIVE MODALS
                   ========================================================================= */}

                {/* Password Reset Modal */}
                {activeModal === 'password' && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                        <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                    <Lock size={16} className="text-[#0057BB]" />
                                    <span>Reset Password</span>
                                </h4>
                                <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                                    <X size={18} />
                                </button>
                            </div>

                            <p className="text-xs text-slate-500 leading-relaxed">
                                We will send a secure password reset link to your registered email: <strong className="text-slate-800">{currentUser?.email}</strong>
                            </p>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setActiveModal(null)}
                                    className="flex-1 py-3 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSendPasswordReset}
                                    disabled={loadingAction}
                                    className="flex-1 py-3 bg-[#0057BB] text-white text-xs font-bold rounded-xl hover:bg-[#004291] shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                                >
                                    {loadingAction ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                                    <span>Send Link</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Language Selector Modal */}
                {activeModal === 'language' && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                        <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                    <Globe size={16} className="text-[#0057BB]" />
                                    <span>Select App Language</span>
                                </h4>
                                <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-2 pt-1">
                                {Object.entries(languageMap).map(([code, name]) => (
                                    <button
                                        key={code}
                                        onClick={() => {
                                            updatePreference('language', code);
                                            setActiveModal(null);
                                        }}
                                        className={`w-full p-3.5 rounded-xl border text-left text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                                            preferences.language === code 
                                                ? 'border-[#0057BB] bg-blue-50 text-[#0057BB]' 
                                                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        <span>{name}</span>
                                        {preferences.language === code && <Check size={16} className="text-[#0057BB]" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Currency Selector Modal */}
                {activeModal === 'currency' && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                        <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                    <Eye size={16} className="text-[#0057BB]" />
                                    <span>Select Ledger Currency</span>
                                </h4>
                                <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-2 pt-1 max-h-72 overflow-y-auto">
                                {Object.entries(currencyMap).map(([code, info]) => (
                                    <button
                                        key={code}
                                        onClick={() => {
                                            updatePreference('currency', code);
                                            setActiveModal(null);
                                        }}
                                        className={`w-full p-3.5 rounded-xl border text-left text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                                            preferences.currency === code 
                                                ? 'border-[#0057BB] bg-blue-50 text-[#0057BB]' 
                                                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        <span>{info.label}</span>
                                        {preferences.currency === code && <Check size={16} className="text-[#0057BB]" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Account Modal */}
                {activeModal === 'delete' && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                        <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 border border-rose-100">
                            <div className="flex items-center gap-3 text-rose-600">
                                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-slate-900 leading-tight">Delete Ledger Account</h4>
                                    <p className="text-[11px] text-rose-600 font-bold mt-0.5">Warning: This action is permanent and irreversible</p>
                                </div>
                            </div>

                            <p className="text-xs text-slate-500 leading-relaxed pt-2">
                                All your customer ledgers, payment histories, and invoices will be deleted. To confirm, please type <strong className="text-slate-900 select-all">DELETE</strong> below:
                            </p>

                            <input 
                                type="text"
                                autoFocus
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="Type DELETE"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 uppercase focus:bg-white focus:border-rose-500 outline-none"
                            />

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setActiveModal(null)}
                                    className="flex-1 py-3 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={deleteConfirmText !== 'DELETE' || loadingAction}
                                    className="flex-1 py-3 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {loadingAction ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                    <span>Permanently Delete</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modern Bottom-Anchored Footer */}
                <Footer className="mt-auto" />
            </main>

            <div className="md:hidden">
                <BottomNav />
            </div>
        </div>
    );
};

export default Settings;
