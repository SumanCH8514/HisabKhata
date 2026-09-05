import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

const MobileDrawer = ({ isOpen, onClose }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { currentUser, isAdmin, userData } = useAuth();

    const handleLogout = async () => {
        try {
            await authService.logout();
            navigate('/login');
        } catch (err) {
            console.error(err);
        }
    };

    if (!isOpen) return null;

    const isActive = (path) => {
        if (path === '/customers') return location.pathname === '/customers' || location.pathname.startsWith('/customer/');
        return location.pathname === path;
    };

    const displayName = userData?.name || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
    const initial = (displayName.charAt(0) || 'U').toUpperCase();

    const menuItems = [
        { to: '/customers', label: 'Customers', icon: 'person' },
        { to: '/reports', label: 'Reports - Parties', icon: 'assessment' },
        { to: '/settings', label: 'Settings', icon: 'settings' },
    ];

    if (isAdmin) {
        menuItems.push({ to: '/admin', label: 'Admin Panel', icon: 'admin_panel_settings' });
    }

    return (
        <div className="fixed inset-0 z-[100] flex md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
            <aside className="relative w-64 h-full flex flex-col border-r border-[#1e2d42]" style={{ backgroundColor: '#0D1726' }}>
                {/* Logo */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2d42]">
                    <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-lg tracking-tight">HisabKhata</span>
                        <span className="pro-badge">PRO</span>
                    </div>
                    <button onClick={onClose} className="text-[#8899aa] hover:text-white p-1">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                {/* User profile */}
                <div className="px-4 py-4 border-b border-[#1e2d42]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold overflow-hidden">
                            {userData?.photoURL ? (
                                <img src={userData.photoURL} alt="" className="w-full h-full object-cover" />
                            ) : initial}
                        </div>
                        <div>
                            <p className="text-white text-sm font-semibold truncate max-w-[150px]">{displayName}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                                <span className="text-green-400 text-[10px]">Online</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 pt-4 space-y-0.5 overflow-y-auto custom-scrollbar">
                    <p className="text-[#6b7c8d] text-[10px] font-semibold uppercase tracking-widest px-2 mb-2">Ledger Management</p>
                    {menuItems.map(item => (
                        <Link
                            key={item.to}
                            to={item.to}
                            onClick={onClose}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                isActive(item.to)
                                    ? 'bg-white/10 text-white'
                                    : 'text-[#aab8c6] hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}
                </nav>

                {/* Logout */}
                <div className="px-3 pb-4 border-t border-[#1e2d42] pt-3">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-[#aab8c6] hover:bg-white/5 hover:text-white transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                        Logout
                    </button>
                </div>
            </aside>
        </div>
    );
};

export default MobileDrawer;
