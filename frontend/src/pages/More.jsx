import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import AppMobileHeader from '../components/AppMobileHeader';
import Footer from '../components/Footer';
import {
    ChevronRight,
    Settings,
    Banknote,
    BookText,
    FileText,
    Package,
    Users,
    CalendarClock,
    ShieldCheck,
    Wallet,
    Store,
    Download,
    CheckCircle2,
    Sparkles,
    Shield,
    LayoutGrid,
    SlidersHorizontal,
    ArrowUpRight
} from 'lucide-react';
import { calculateProfileStrength } from '../utils/profileUtils';
import { usePWAInstall } from '../utils/pwaUtils';

const More = () => {
    const { currentUser, userData, isAdmin } = useAuth();
    const { canInstall, isInstalled, triggerInstall } = usePWAInstall();
    const navigate = useNavigate();

    const displayName = userData?.name || currentUser?.displayName || 'Merchant';
    const shopName = userData?.businessName || userData?.name || 'My Shop';
    const initial = (displayName.charAt(0) || 'M').toUpperCase();

    const strength = calculateProfileStrength(userData);

    // Business Tools & Apps
    const coreApps = [
        {
            id: 'pos',
            title: 'POS Billing System',
            shortLabel: 'POS',
            desc: 'High-speed cloud billing, barcode scanning, and thermal receipt printing for your shop.',
            icon: <Store size={22} className="text-emerald-600" />,
            iconBg: 'bg-emerald-50 text-emerald-600',
            badge: 'OFFICIAL APP',
            badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
            isExternal: true,
            url: 'https://pos.hisabkhata.sumanonline.com/signup?ref=HK-3-POS',
            actionText: 'Open POS System'
        },
        {
            id: 'cashbook',
            title: 'Daily Cashbook',
            shortLabel: 'Cashbook',
            desc: 'Track petty cash flow, counter expenses, and daily cash-in-hand balancing.',
            icon: <BookText size={22} className="text-blue-600" />,
            iconBg: 'bg-blue-50 text-blue-600',
            badge: 'COMING SOON',
            badgeColor: 'bg-slate-100 text-slate-500 border-slate-200',
            actionText: 'Preview'
        },
        {
            id: 'bills',
            title: 'Invoices & Bills',
            shortLabel: 'Bills',
            desc: 'Generate professional GST-ready invoices and share digital bill receipts via WhatsApp.',
            icon: <FileText size={22} className="text-rose-600" />,
            iconBg: 'bg-rose-50 text-rose-600',
            badge: 'COMING SOON',
            badgeColor: 'bg-slate-100 text-slate-500 border-slate-200',
            actionText: 'Preview'
        },
        {
            id: 'items',
            title: 'Inventory & Items',
            shortLabel: 'Items',
            desc: 'Catalog your products, manage unit prices, stock levels, and get low-inventory alerts.',
            icon: <Package size={22} className="text-purple-600" />,
            iconBg: 'bg-purple-50 text-purple-600',
            badge: 'COMING SOON',
            badgeColor: 'bg-slate-100 text-slate-500 border-slate-200',
            actionText: 'Preview'
        },
    ];

    // Finance & Growth Tools
    const growthTools = [
        {
            id: 'loans',
            title: 'Merchant Loans',
            shortLabel: 'Loans',
            desc: 'Collateral-free instant business credit & loans tailored for active shop owners.',
            icon: <Banknote size={22} className="text-emerald-600" />,
            iconBg: 'bg-emerald-50 text-emerald-600',
            badge: 'PARTNERED',
            badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
            actionText: 'Learn More'
        },
        {
            id: 'collection',
            title: 'Payment Collections',
            shortLabel: 'Collection',
            desc: 'Automate WhatsApp & SMS payment reminders with integrated one-click UPI pay links.',
            icon: <CalendarClock size={22} className="text-amber-600" />,
            iconBg: 'bg-amber-50 text-amber-600',
            badge: 'COMING SOON',
            badgeColor: 'bg-slate-100 text-slate-500 border-slate-200',
            actionText: 'Preview'
        },
        {
            id: 'staff',
            title: 'Staff & Salary Ledger',
            shortLabel: 'Staff',
            desc: 'Record employee attendance, salary advances, payroll history, and commissions.',
            icon: <Users size={22} className="text-indigo-600" />,
            iconBg: 'bg-indigo-50 text-indigo-600',
            badge: 'COMING SOON',
            badgeColor: 'bg-slate-100 text-slate-500 border-slate-200',
            actionText: 'Preview'
        },
        {
            id: 'insurance',
            title: 'Shop Insurance',
            shortLabel: 'Shop Insurance',
            desc: 'Protect your store stock, equipment, and assets against fire, theft, and natural hazards.',
            icon: <ShieldCheck size={22} className="text-pink-600" />,
            iconBg: 'bg-pink-50 text-pink-600',
            badge: 'COMING SOON',
            badgeColor: 'bg-slate-100 text-slate-500 border-slate-200',
            actionText: 'Preview'
        },
    ];

    if (isAdmin) {
        growthTools.push({
            id: 'admin',
            title: 'Admin Control Console',
            shortLabel: 'Admin Panel',
            desc: 'System health diagnostics, Cloudflare R2 storage explorer, user management, and logs.',
            icon: <Shield size={22} className="text-amber-600" />,
            iconBg: 'bg-amber-50 text-amber-600',
            badge: 'ADMIN ONLY',
            badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
            actionText: 'Open Console'
        });
    }

    const allMobileItems = [...coreApps, ...growthTools];

    const handleItemClick = (item) => {
        if (item.isExternal && item.url) {
            window.open(item.url, '_blank', 'noopener,noreferrer');
        } else if (item.id === 'admin') {
            navigate('/admin');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex overflow-x-hidden">
            {/* Sidebar Desktop */}
            <Sidebar />

            <div className="flex-1 md:ml-[260px] pb-16 md:pb-0 flex flex-col min-w-0 overflow-x-hidden">
                {/* Mobile Header */}
                <AppMobileHeader />

                <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 lg:p-10 space-y-6">
                    {/* Desktop Page Title Header */}
                    <div className="hidden md:flex items-center justify-between pb-4 border-b border-slate-200/80">
                        <div>
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                <span>Platform</span>
                                <span>/</span>
                                <span className="text-[#0057BB]">Ecosystem Hub</span>
                            </div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
                                <LayoutGrid size={24} className="text-[#0057BB]" />
                                Business Hub & Services
                            </h1>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Extend your ledger with integrated POS billing, team utilities, business services, and app extensions.
                            </p>
                        </div>

                        <div className="flex items-center gap-2.5">
                            <button
                                onClick={() => navigate('/settings')}
                                className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-xs transition-colors cursor-pointer"
                            >
                                <Settings size={15} className="text-slate-500" />
                                <span>Settings</span>
                            </button>
                            <button
                                onClick={() => navigate('/profile')}
                                className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#0057BB] text-white rounded-xl text-xs font-bold hover:bg-[#004291] shadow-xs shadow-blue-500/15 transition-colors cursor-pointer"
                            >
                                <span>Edit Profile</span>
                            </button>
                        </div>
                    </div>

                    {/* =========================================================================
                        MOBILE ONLY HEADER & STRENGTH BAR (< md)
                       ========================================================================= */}
                    <div className="md:hidden space-y-4">
                        {/* Profile Card */}
                        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 flex items-center justify-between w-full overflow-hidden">
                            <div className="flex items-center gap-3.5 min-w-0">
                                <div className="w-14 h-14 min-w-[56px] min-h-[56px] rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white text-lg font-black overflow-hidden shadow-xs shrink-0 aspect-square">
                                    {userData?.photoURL ? (
                                        <img 
                                            key={userData.photoURL}
                                            src={userData.photoURL} 
                                            alt="Shop" 
                                            className="w-full h-full object-cover" 
                                        />
                                    ) : (
                                        initial
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-sm font-black text-slate-900 leading-tight truncate">{shopName}</h2>
                                    <p className="text-[11px] font-bold text-slate-400 truncate mt-0.5">{displayName}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/profile')}
                                className="px-3 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-xs font-black hover:bg-blue-50 transition-colors shrink-0"
                            >
                                Edit
                            </button>
                        </div>

                        {/* Profile Strength */}
                        <div className="space-y-1.5 px-0.5">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-500">Profile strength : <span className={strength.color}>{strength.label}</span></span>
                                <span className={`font-black ${strength.color}`}>{strength.percentage}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                <div className={`h-full ${strength.barColor} transition-all duration-500 rounded-full`} style={{ width: `${strength.percentage}%` }} />
                            </div>
                        </div>

                        {/* Mobile Grid */}
                        <div className="grid grid-cols-3 gap-2.5 pt-1">
                            {allMobileItems.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => handleItemClick(item)}
                                    className="bg-white p-3.5 py-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer relative overflow-hidden group hover:border-slate-300"
                                >
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.iconBg} group-hover:scale-105 transition-transform`}>
                                        {item.icon}
                                    </div>
                                    <span className="text-[11px] font-black text-slate-700 text-center leading-tight">
                                        {item.shortLabel}
                                    </span>

                                    {item.badge && item.badge === 'OFFICIAL APP' ? (
                                        <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded-bl-lg tracking-tighter">
                                            NEW
                                        </div>
                                    ) : item.id !== 'admin' && (
                                        <div className="absolute top-0 right-0 bg-slate-100 text-slate-400 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-bl-lg tracking-tighter">
                                            Soon
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Mobile Settings Row */}
                        <button
                            onClick={() => navigate('/settings')}
                            className="w-full bg-white px-4 py-3.5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between active:bg-slate-50 transition-colors"
                        >
                            <div className="flex items-center gap-3.5">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <Settings size={18} />
                                </div>
                                <span className="text-xs font-black text-slate-800">Account & Ledger Settings</span>
                            </div>
                            <ChevronRight size={18} className="text-slate-400" />
                        </button>
                    </div>

                    {/* =========================================================================
                        DESKTOP VIEW (md:grid 2-Column Responsive SaaS Dashboard)
                       ========================================================================= */}
                    <div className="hidden md:grid md:grid-cols-12 gap-8 items-start">
                        {/* LEFT COLUMN: 8 Columns - Service Cards */}
                        <div className="md:col-span-7 lg:col-span-8 space-y-8">
                            
                            {/* Section 1: Billing & Retail Operations */}
                            <div>
                                <div className="flex items-center justify-between mb-3.5">
                                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Store size={14} className="text-emerald-600" />
                                        <span>Billing & Retail Operations</span>
                                    </h2>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {coreApps.map((item) => (
                                        <div
                                            key={item.id}
                                            onClick={() => handleItemClick(item)}
                                            className={`bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer relative overflow-hidden ${
                                                item.isExternal ? 'ring-1 ring-emerald-500/20' : ''
                                            }`}
                                        >
                                            <div>
                                                <div className="flex items-start justify-between gap-2 mb-3">
                                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.iconBg} group-hover:scale-105 transition-transform`}>
                                                        {item.icon}
                                                    </div>
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                                                        {item.badge}
                                                    </span>
                                                </div>

                                                <h3 className="text-sm font-black text-slate-900 group-hover:text-[#0057BB] transition-colors flex items-center gap-1.5">
                                                    {item.title}
                                                    {item.isExternal && <ArrowUpRight size={14} className="text-slate-400 group-hover:text-[#0057BB]" />}
                                                </h3>
                                                <p className="text-xs text-slate-500 leading-relaxed mt-1.5">
                                                    {item.desc}
                                                </p>
                                            </div>

                                            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-[#0057BB] transition-colors">
                                                <span>{item.actionText}</span>
                                                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Section 2: Financial Growth & Store Management */}
                            <div>
                                <div className="flex items-center justify-between mb-3.5">
                                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Banknote size={14} className="text-blue-600" />
                                        <span>Credit, Growth & Store Utilities</span>
                                    </h2>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {growthTools.map((item) => (
                                        <div
                                            key={item.id}
                                            onClick={() => handleItemClick(item)}
                                            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer relative overflow-hidden"
                                        >
                                            <div>
                                                <div className="flex items-start justify-between gap-2 mb-3">
                                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.iconBg} group-hover:scale-105 transition-transform`}>
                                                        {item.icon}
                                                    </div>
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                                                        {item.badge}
                                                    </span>
                                                </div>

                                                <h3 className="text-sm font-black text-slate-900 group-hover:text-[#0057BB] transition-colors flex items-center gap-1.5">
                                                    {item.title}
                                                </h3>
                                                <p className="text-xs text-slate-500 leading-relaxed mt-1.5">
                                                    {item.desc}
                                                </p>
                                            </div>

                                            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-[#0057BB] transition-colors">
                                                <span>{item.actionText}</span>
                                                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: 4 Columns - Pro App & Account Status Cards */}
                        <div className="md:col-span-5 lg:col-span-4 space-y-6">
                            
                            {/* Pro Desktop App Card */}
                            <div className="bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0057BB] text-white rounded-2xl p-6 border border-slate-800 shadow-sm relative overflow-hidden">
                                <div className="relative z-10 space-y-4">
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-wider text-blue-200 border border-white/10">
                                        <Sparkles size={12} className="text-amber-300" />
                                        <span>HisabKhata Pro</span>
                                    </div>

                                    <div>
                                        <h3 className="text-base font-black tracking-tight text-white">
                                            Install HisabKhata Pro App
                                        </h3>
                                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                            Install and use the full-featured HisabKhata Ledger natively on your desktop or mobile for free.
                                        </p>
                                    </div>

                                    <div className="space-y-2 pt-1">
                                        <div className="flex items-center gap-2 text-xs text-slate-200 font-medium">
                                            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                                            <span>Full offline support & instant sync</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-200 font-medium">
                                            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                                            <span>Fast thermal printing & PDF export</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-200 font-medium">
                                            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                                            <span>Bank-grade 256-bit encrypted ledger</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={triggerInstall}
                                        className="w-full mt-2 bg-white text-blue-700 hover:bg-blue-50 active:scale-[0.98] font-black text-xs uppercase tracking-wider py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <Download size={16} className="stroke-[2.5]" />
                                        <span>INSTALL NOW</span>
                                    </button>
                                </div>
                                <Wallet size={120} className="absolute -right-8 -bottom-8 opacity-5 rotate-12 pointer-events-none" />
                            </div>

                            {/* Account Health & Strength Card */}
                            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                                        Account Health
                                    </h3>
                                    <span className={`text-xs font-black ${strength.color}`}>
                                        {strength.percentage}%
                                    </span>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                        <span>Profile Completeness:</span>
                                        <span className={`font-bold ${strength.color}`}>{strength.label}</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full ${strength.barColor} transition-all duration-500 rounded-full`} style={{ width: `${strength.percentage}%` }} />
                                    </div>
                                </div>

                                <div className="pt-2 text-xs text-slate-500 space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Shop:</span>
                                        <span className="font-bold text-slate-700 truncate max-w-[180px]">{shopName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Owner:</span>
                                        <span className="font-bold text-slate-700 truncate max-w-[180px]">{displayName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Account Type:</span>
                                        <span className="font-bold text-emerald-600">Merchant (Pro)</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => navigate('/profile')}
                                    className="w-full mt-2 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    <span>Manage Profile & KYC</span>
                                    <ChevronRight size={14} />
                                </button>
                            </div>

                            {/* Quick Preferences Shortcut */}
                            <div className="bg-slate-100/70 rounded-2xl p-4 border border-slate-200/60 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                                        <SlidersHorizontal size={16} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-800">Preferences</h4>
                                        <p className="text-[10px] text-slate-500">Security, reports & backups</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate('/settings')}
                                    className="text-xs font-bold text-[#0057BB] hover:underline"
                                >
                                    Configure
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Pro Banner */}
                    <div className="md:hidden bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-4 text-white flex items-center justify-between overflow-hidden relative shadow-xs">
                        <div className="relative z-10">
                            <h3 className="text-xs font-black uppercase tracking-widest text-blue-100">HisabKhata Pro</h3>
                            <p className="text-[11px] font-medium mt-0.5 text-white/90">Install and use the HisabKhata Ledger for free</p>
                            <button 
                                onClick={triggerInstall}
                                className="mt-2.5 bg-white text-blue-600 px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider shadow-xs hover:bg-blue-50 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5"
                            >
                                <Download size={13} className="stroke-[2.5]" />
                                INSTALL NOW
                            </button>
                        </div>
                        <Wallet size={70} className="absolute -right-4 -bottom-4 opacity-10 rotate-12 pointer-events-none" />
                    </div>
                </main>

                {/* Modern Bottom-Anchored Footer */}
                <Footer className="py-4 md:py-5 mt-auto" />
            </div>

            {/* Mobile Nav */}
            <BottomNav />
        </div>
    );
};

export default More;
