import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import AppMobileHeader from '../components/AppMobileHeader';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';
import { 
    Bell, 
    Lock, 
    Globe, 
    Database, 
    Eye, 
    EyeOff,
    ChevronRight,
    LogOut,
    ShieldCheck,
    Palette,
    Download,
    Trash2
} from 'lucide-react';

const Settings = () => {
    const { currentUser, userData, globalSettings } = useAuth();
    const [activeTab, setActiveTab] = useState('General');

    const settingSections = [
        {
            title: 'Account & Security',
            icon: <ShieldCheck className="w-5 h-5" />,
            settings: [
                { id: 'password', label: 'Change Password', desc: 'Update your login credentials', icon: <Lock className="w-4 h-4" />, type: 'link' },
                { id: '2fa', label: 'Two-Factor Auth', desc: 'Add an extra layer of security', icon: <ShieldCheck className="w-4 h-4" />, type: 'toggle', enabled: false },
            ]
        },
        {
            title: 'App Preferences',
            icon: <Palette className="w-5 h-5" />,
            settings: [
                { id: 'language', label: 'App Language', desc: 'English (US)', icon: <Globe className="w-4 h-4" />, type: 'link' },
                { id: 'notifications', label: 'Notifications', desc: 'Manage alerts and reminders', icon: <Bell className="w-4 h-4" />, type: 'toggle', enabled: true },
                { id: 'currency', label: 'Currency Display', desc: 'Show ₹ symbol in reports', icon: <Eye className="w-4 h-4" />, type: 'toggle', enabled: true },
            ]
        },
        {
            title: 'Data & Backup',
            icon: <Database className="w-5 h-5" />,
            settings: [
                { id: 'backup', label: 'Auto Backup', desc: 'Keep your data synced to cloud', icon: <Download className="w-4 h-4" />, type: 'toggle', enabled: true },
                { id: 'export', label: 'Export All Data', desc: 'Download CSV of all ledgers', icon: <Download className="w-4 h-4" />, type: 'button' },
            ]
        },
        {
            title: 'Danger Zone',
            icon: <Trash2 className="w-5 h-5 text-red-500" />,
            settings: [
                { id: 'delete', label: 'Delete Account', desc: 'Permanently remove your data', icon: <Trash2 className="w-4 h-4 text-red-500" />, type: 'danger' },
            ]
        }
    ];

    return (
        <div className="flex min-h-screen bg-[#F8FAFC] overflow-x-hidden">
            <Sidebar />
            
            <main className="flex-1 ml-0 md:ml-[260px] pb-20 md:pb-0 flex flex-col min-h-screen min-w-0">
                {/* Mobile Branded Header */}
                <AppMobileHeader />

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
                    MOBILE VIEW (< md) — Exact Existing Layout Preserved
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
