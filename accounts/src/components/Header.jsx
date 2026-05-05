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
                <div className="flex items-center gap-1.5">
                    <span className="text-lg font-bold tracking-tight text-gray-900">HisabKhata</span>
                    <span className="pro-badge">PRO</span>
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
