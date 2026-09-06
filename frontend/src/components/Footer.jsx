import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ExternalLink } from 'lucide-react';

const Footer = ({ className = "" }) => {
    return (
        <footer className={`w-full mt-auto border-t border-slate-200/80 bg-white/70 backdrop-blur-xs py-5 px-4 sm:px-6 md:px-8 text-xs text-slate-500 transition-colors ${className}`}>
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                
                {/* Left: Brand, Version & Status */}
                <div className="flex items-center gap-2.5 text-slate-600 flex-wrap justify-center sm:justify-start">
                    <div className="flex items-center gap-2 font-semibold text-slate-800">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Systems Normal" />
                        <span className="font-bold tracking-tight">HisabKhata</span>
                    </div>
                    <span className="text-slate-300">•</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] font-mono font-medium border border-slate-200">
                        v0.1.4
                    </span>
                    <span className="hidden md:inline text-slate-300">•</span>
                    <span className="hidden md:flex items-center gap-1 text-[11px] text-slate-500">
                        <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
                        <span>256-bit Encrypted</span>
                    </span>
                </div>

                {/* Center: Legal & Navigation Links */}
                <div className="flex items-center gap-x-4 gap-y-1 text-[11px] font-medium text-slate-500">
                    <Link to="/privacy-policy" className="hover:text-[#0057BB] transition-colors">
                        Privacy Policy
                    </Link>
                    <span className="text-slate-300">•</span>
                    <Link to="/terms-of-condition" className="hover:text-[#0057BB] transition-colors">
                        Terms of Service
                    </Link>
                </div>

                {/* Right: Maintainer Credit */}
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span>Maintained by</span>
                    <a 
                        href="https://sumanonline.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-semibold text-slate-700 hover:text-[#0057BB] transition-colors inline-flex items-center gap-0.5 underline decoration-slate-300 hover:decoration-[#0057BB] underline-offset-2"
                    >
                        <span>SumanOnline.Com</span>
                        <ExternalLink size={10} className="text-slate-400" />
                    </a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;

