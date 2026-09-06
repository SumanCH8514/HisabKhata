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
        <div className="flex min-h-screen bg-[#F8FAFC]">
            <Sidebar />
            
            <main className="flex-1 ml-0 md:ml-[260px] pb-20 md:pb-0 flex flex-col min-h-screen min-w-0">
                {/* Mobile Branded Header */}
                <AppMobileHeader />

                {/* Page Title — Compact High Fidelity Branding */}
                <div className="bg-white border-b border-gray-200 px-6 py-2 md:py-3 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-100 shrink-0">
                        <span className="material-symbols-outlined text-white text-[22px]">settings</span>
                    </div>
                    <div>
                        <h1 className="text-[17px] md:text-[19px] font-black text-gray-900 tracking-tight leading-none uppercase">Settings</h1>
                        <p className="text-[#8eacc0] text-[10px] mt-1 uppercase tracking-[0.2em] font-black leading-none">Account Preferences</p>
                    </div>
                </div>

                {/* Settings Content Area */}
                <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 space-y-8">
                    <div className="grid grid-cols-1 gap-8">
                        {settingSections.map((section, idx) => (
                            <div key={idx} className="space-y-4">
                                <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                                    {section.icon}
                                    {section.title}
                                </h2>

                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                    {section.settings.map((setting, sIdx) => (
                                        <div 
                                            key={setting.id}
                                            className={`group flex items-center justify-between p-4 md:p-5 hover:bg-slate-50 transition-colors cursor-pointer ${sIdx !== section.settings.length - 1 ? 'border-b border-gray-50' : ''}`}
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
                <Footer />
            </main>

            <div className="md:hidden">
                <BottomNav />
            </div>
        </div>
    );
};

export default Settings;
