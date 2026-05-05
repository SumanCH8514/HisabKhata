import React from 'react';
import { Link } from 'react-router-dom';

const Navigation = () => {
    return (
        <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 py-4 max-w-full bg-white/80 backdrop-blur-md border-b border-slate-200">
            <Link to="/" className="text-2xl font-bold tracking-tight text-slate-900 font-headline-md">HisabKhata</Link>
            <div className="hidden md:flex items-center gap-8 font-manrope antialiased text-sm font-semibold">
                <a className="text-slate-600 hover:text-indigo-600 transition-colors" href="#">Features</a>
                <a className="text-slate-600 hover:text-indigo-600 transition-colors" href="#">Security</a>
                <a className="text-slate-600 hover:text-indigo-600 transition-colors" href="#">Pricing</a>
            </div>
            <div className="flex items-center gap-4">
                <Link className="text-slate-600 hover:text-indigo-600 transition-colors font-semibold text-sm" to="/login">Login</Link>
                <Link className="bg-primary text-white px-5 py-2 rounded-lg font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all" to="/signup">Sign Up</Link>
            </div>
        </nav>
    );
};

export default Navigation;
