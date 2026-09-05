import React from 'react';
import { authService } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

const AppMobileHeader = ({ rightElement, onBack, showLogout = true }) => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        if (window.confirm('Are you sure you want to logout?')) {
            try {
                await authService.logout();
                navigate('/login');
            } catch (err) {
                console.error('Logout error:', err);
            }
        }
    };

    return (
        <header className="md:hidden sticky top-0 z-30 flex h-14 w-full items-center justify-between px-4 bg-white border-b border-gray-100 shadow-sm shrink-0">
            <div className="flex items-center gap-2.5">
                {onBack && (
                    <button onClick={onBack} className="p-1 -ml-1 text-slate-500 hover:text-slate-800 transition-colors">
                        <span className="material-symbols-outlined text-[22px]">arrow_back</span>
                    </button>
                )}
                <div className="w-8 h-8 bg-[#0057BB] rounded-lg flex items-center justify-center shadow-sm shrink-0">
                    <span className="material-symbols-outlined text-white text-[20px]">account_balance_wallet</span>
                </div>
                <h1 className="text-[#0057BB] font-black text-[19px] tracking-tight leading-none select-none">
                    Hisab Khata <span className="text-orange-500 italic">PRO</span>
                </h1>
            </div>

            <div className="flex items-center gap-1.5">
                {rightElement !== undefined ? (
                    rightElement
                ) : showLogout ? (
                    <button 
                        onClick={handleLogout} 
                        className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 active:bg-slate-100 transition-colors"
                        title="Logout"
                    >
                        <LogOut size={19} />
                    </button>
                ) : null}
            </div>
        </header>
    );
};

export default AppMobileHeader;
