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
        <header className="md:hidden sticky top-0 z-30 flex h-14 w-full items-center justify-between px-4 bg-white border-b border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
                <button className="p-1 rounded text-gray-500 hover:bg-gray-100" onClick={() => setIsDrawerOpen(true)}>
                    <span className="material-symbols-outlined">menu</span>
                </button>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#0057BB] rounded flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-[20px]">account_balance_wallet</span>
                    </div>
                    <h1 className="text-[#0057BB] font-black text-[19px] tracking-tight">Hisab Khata <span className="text-orange-500 italic">PRO</span></h1>
                </div>
            </div>
            <button onClick={handleLogout} className="p-1 rounded text-gray-500 hover:bg-gray-100">
                <span className="material-symbols-outlined">logout</span>
            </button>
        </header>
        <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
        </>
    );
};

export default Header;
