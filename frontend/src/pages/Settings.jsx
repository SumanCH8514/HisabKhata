import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
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
            icon: <Trash2 className="w-5 h-5" />,
            settings: [
                { id: 'delete', label: 'Delete Account', desc: 'Permanently remove your data', icon: <Trash2 className="w-4 h-4 text-red-500" />, type: 'danger' },
            ]
        }
    ];

    return (
        <div className="flex min-h-screen bg-[#F8FAFC]">
            <Sidebar />
            
            <main className="flex-1 ml-0 md:ml-[260px] pb-24 md:pb-0">
                {/* Mobile Branded Header - Ultra Compact */}
                <div className="md:hidden flex items-center justify-between px-4 py-1.5 bg-white border-b border-gray-100 sticky top-0 z-30">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-[#0057BB] rounded-md flex items-center justify-center shadow-sm">
                            <span className="material-symbols-outlined text-white text-[16px]">account_balance_wallet</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-[#0057BB] font-black text-[15px] tracking-tight">Hisab Khata</span>
                            <span className="text-[#FF6B00] font-black italic text-[10px]">PRO</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            if(window.confirm('Are you sure you want to logout?')) {
                                window.location.href = '/login'; 
                            }
                        }}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                    </button>
                </div>

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

                <div className="max-w-4xl mx-auto p-4 md:p-8">
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

                    {/* Footer Info */}
                    <div className="mt-12 text-center pb-12">
                        <p className="text-[#8eacc0] text-[11px] font-bold tracking-[0.2em] uppercase">HisabKhata v0.1.4</p>
                        
                        <div className="flex items-center justify-center gap-8 my-6">
                            <Link to="/privacy-policy" className="text-[#8eacc0] text-sm font-bold hover:text-blue-600 transition-colors">Privacy Policy</Link>
                            <Link to="/terms-of-condition" className="text-[#8eacc0] text-sm font-bold hover:text-blue-600 transition-colors">Terms of Condition</Link>
                        </div>

                        <div className="mt-8">
                            <p className="text-[#8eacc0]/60 text-[9px] font-black uppercase tracking-[0.15em]">Website Design & Maintained By</p>
                            <a 
                                href="https://sumanonline.com" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 font-bold text-[13px] mt-0.5 inline-block hover:underline"
                            >
                                SumanOnline.Com
                            </a>
                        </div>
                    </div>
                </div>
            </main>

            <div className="md:hidden">
                <BottomNav />
            </div>
        </div>
    );
};

export default Settings;
