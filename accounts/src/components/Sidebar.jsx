import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authService } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Sidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { currentUser, isAdmin, userData } = useAuth();

    const isActive = (path) => {
        if (path === '/customers') return location.pathname === '/customers' || location.pathname.startsWith('/customer/');
        return location.pathname === path;
    };

    const navLinkClass = (path) => `flex items-center gap-3 px-3 py-2.5 rounded mb-0.5 text-sm font-medium transition-all ${isActive(path)
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-[#b8cfe0] hover:bg-white/10 hover:text-white'
        }`;

    const handleLogout = async () => {
        try {
            await authService.logout();
            navigate('/login');
        } catch (err) {
            console.error(err);
        }
    };

    // Get display name and initial
    const displayName = userData?.name || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
    const initial = (displayName.charAt(0) || 'U').toUpperCase();
    const phone = userData?.phone || userData?.mobile || currentUser?.phoneNumber || '';

    return (
        <aside
            className="hidden md:flex fixed left-0 top-0 h-full flex-col z-40 w-[260px] border-r border-[#1a2d42]"
            style={{ backgroundColor: '#1c2b3a' }}
        >
            {/* Logo */}
            <div className="px-5 py-4 border-b border-[#243446]">
                <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-xl tracking-tight">HisabKhata</span>
                    <span className="pro-badge">PRO</span>
                </div>
            </div>

            {/* User Profile - Centered Vertical Layout */}
            <div className="px-4 py-5 border-b border-[#243446] relative group">
                <Link to="/profile" className="flex flex-col items-center text-center gap-3 relative">
                    {/* Avatar */}
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-xl flex-shrink-0 group-hover:scale-105 transition-all shadow-xl overflow-hidden border-2 border-white/5"
                        style={{ backgroundColor: '#e91e63' }}
                    >
                        {userData?.photoURL ? (
                            <img 
                                key={userData.photoURL}
                                src={userData.photoURL} 
                                alt="Profile" 
                                className="w-full h-full object-cover" 
                            />
                        ) : (
                            initial
                        )}
                    </div>

                    {/* Text Details */}
                    <div className="flex flex-col items-center gap-0.5 w-full px-2">
                        <p className="text-white font-black text-sm leading-tight break-words w-full">
                            {displayName}
                        </p>
                        <p className="text-[#7a9bb5] text-[10px] font-bold truncate w-full">
                            {currentUser?.email}
                        </p>
                        <p className="text-blue-400 text-[11px] font-black tracking-tight">
                            {phone}
                        </p>
                        
                        {/* Verified Badge */}
                        <div className="mt-1.5 flex items-center gap-1.5 bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full border border-green-500/20">
                            <span className="material-symbols-outlined text-[12px]">verified</span>
                            <span className="text-[9px] font-black uppercase tracking-widest">Verified</span>
                        </div>
                    </div>

                    {/* Chevron Indicator */}
                    <span className="absolute right-[-8px] top-1/2 -translate-y-1/2 material-symbols-outlined text-[#4a6a80] group-hover:text-white transition-colors text-[20px]">
                        chevron_right
                    </span>
                </Link>
            </div>

            {/* LEDGER MANAGEMENT Section */}
            <div className="px-3 pt-4 flex-1 overflow-y-auto custom-scrollbar">
                <p className="text-[#4a6a80] text-[10px] font-bold uppercase tracking-widest px-2 mb-1">Ledger Management</p>

                <Link to="/customers" className={navLinkClass('/customers')}>
                    <span className="material-symbols-outlined text-[20px]">person</span>
                    <span>Customers</span>
                </Link>

                <Link to="/payments" className={navLinkClass('/payments')}>
                    <span className="material-symbols-outlined text-[20px]">payments</span>
                    <span>Payments</span>
                </Link>

                <Link to="/reports" className={navLinkClass('/reports')}>
                    <span className="material-symbols-outlined text-[20px]">bar_chart_4_bars</span>
                    <span>Reports - Parties</span>
                </Link>

                <Link to="/settings" className={navLinkClass('/settings')}>
                    <span className="material-symbols-outlined text-[20px]">settings</span>
                    <span>Settings</span>
                </Link>

                {isAdmin && (
                    <Link to="/admin" className={navLinkClass('/admin')}>
                        <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
                        <span>Admin Panel</span>
                    </Link>
                )}
            </div>

            {/* Bottom logout */}
            <div className="px-3 pb-4 border-t border-[#243446] pt-3">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded text-sm font-medium text-[#9bbdd4] hover:bg-white/5 hover:text-white transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px]">logout</span>
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
