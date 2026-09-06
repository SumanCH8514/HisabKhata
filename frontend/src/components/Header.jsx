import React, { useState } from 'react';
import MobileDrawer from './MobileDrawer';
import { authService } from '../services/firebase';
import { useNavigate } from 'react-router-dom';

const Header = () => {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await authService.logout();
            navigate('/login');
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <>
        <header className="md:hidden sticky top-0 z-30 flex h-14 w-full items-center justify-between px-4 bg-white border-b border-gray-100 shadow-sm shrink-0">
            <div className="flex items-center gap-3">
                <button className="p-1 -ml-1 text-slate-500 hover:text-slate-800 transition-colors" onClick={() => setIsDrawerOpen(true)}>
                    <span className="material-symbols-outlined text-[24px]">menu</span>
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#0057BB] rounded-xl flex items-center justify-center shadow-xs shrink-0">
                        <span className="material-symbols-outlined text-white text-[22px]">account_balance_wallet</span>
                    </div>
                    <div className="flex flex-col justify-center select-none">
                        <div className="flex items-center gap-1.5">
                            <h1 className="text-[#0057BB] font-black text-[19px] tracking-tight leading-none">HisabKhata</h1>
                            <span className="pro-badge">PRO</span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-bold tracking-tight leading-none mt-1">
                            a SumanOnline Project
                        </span>
                    </div>
                </div>
            </div>
            <button 
                onClick={handleLogout} 
                className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 active:bg-slate-100 transition-colors"
                title="Logout"
            >
                <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
        </header>
        <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
        </>
    );
};

export default Header;
