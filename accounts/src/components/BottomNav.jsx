import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const BottomNav = () => {
    const location = useLocation();

    const isActive = (path) => {
        if (path === '/customers') return location.pathname === '/customers' || location.pathname.startsWith('/customer/');
        return location.pathname === path;
    };

    const navItems = [
        { to: '/customers', label: 'Parties', icon: 'person' },
        { to: '/more', label: 'More', icon: 'more_horiz' },
    ];

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around z-[90] pb-safe">
            {navItems.map((item) => (
                <Link
                    key={item.to}
                    to={item.to}
                    className={`flex flex-col items-center py-2 px-4 transition-colors ${
                        isActive(item.to) ? 'text-blue-600' : 'text-gray-400'
                    }`}
                >
                    <span className={`material-symbols-outlined text-[24px] ${isActive(item.to) ? 'fill-current' : ''}`}>
                        {item.icon}
                    </span>
                    <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
                </Link>
            ))}
        </nav>
    );
};

export default BottomNav;
