import React from 'react';

const Footer = () => {
    return (
        <footer className="w-full py-8 px-6 flex flex-col md:flex-row justify-between items-center gap-4 mt-auto border-t border-slate-200 bg-slate-50">
            <div className="flex flex-col gap-1 items-center md:items-start">
                <div className="text-lg font-bold text-slate-700 font-manrope">HisabKhata</div>
                <div className="font-manrope text-[10px] tracking-wide uppercase font-medium text-slate-500">
                    Designed and Created by SumanOnline.Com
                </div>
            </div>
            <div className="flex flex-wrap justify-center gap-6">
                <a className="font-manrope text-xs tracking-wide uppercase font-medium text-slate-500 hover:text-secondary transition-colors" href="#">Privacy Policy</a>
                <a className="font-manrope text-xs tracking-wide uppercase font-medium text-slate-500 hover:text-secondary transition-colors" href="#">Terms of Service</a>
                <a className="font-manrope text-xs tracking-wide uppercase font-medium text-slate-500 hover:text-secondary transition-colors" href="#">Security Architecture</a>
                <a className="font-manrope text-xs tracking-wide uppercase font-medium text-slate-500 hover:text-secondary transition-colors" href="#">Contact Support</a>
            </div>
            <div className="text-slate-500 font-manrope text-[10px] tracking-wide uppercase font-medium">
                © 2024 HisabKhata Financial Systems. All rights reserved.
            </div>
        </footer>
    );
};

export default Footer;
