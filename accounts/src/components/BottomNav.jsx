import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const BottomNav = () => {
    const location = useLocation();

    const isActive = (path) => {
        if (path === '/customers') return location.pathname === '/customers' || location.pathname.startsWith('/customer/');
        if (path === '/more') return location.pathname === '/more' || location.pathname === '/profile' || location.pathname === '/settings';
        return location.pathname === path;
    };

    const navItems = [
        { to: '/customers', label: 'Parties', icon: 'person' },
        { to: '/more', label: 'More', icon: 'more_horiz' },
    ];

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center justify-around z-[90] pb-safe h-14">
            {navItems.map((item) => {
                const active = isActive(item.to);
                return (
                    <Link
                        key={item.to}
                        to={item.to}
                        className={`relative flex flex-col items-center justify-center w-full h-full transition-all duration-300 ${active ? 'text-blue-600' : 'text-gray-400'}`}
                    >
                        {/* Active Pill Background */}
                        {active && (
                            <div className="absolute inset-x-4 inset-y-1.5 bg-blue-50 rounded-xl -z-10 animate-in fade-in zoom-in-95 duration-200" />
                        )}

                        <span className={`material-symbols-outlined text-[24px] transition-transform duration-300 ${active ? 'scale-110' : ''}`} style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>
                            {item.icon}
                        </span>
                        <span className={`text-[10px] font-black mt-0.5 tracking-wide transition-all ${active ? 'opacity-100' : 'opacity-80'}`}>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
};

export default BottomNav;
