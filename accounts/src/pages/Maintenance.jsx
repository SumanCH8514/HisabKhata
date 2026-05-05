import React from 'react';
import { ShieldAlert } from 'lucide-react';

const Maintenance = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl shadow-slate-200 border border-slate-100">
        <div className="w-20 h-20 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert size={40} />
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-4">Under Maintenance</h1>
        <p className="text-slate-500 mb-8 leading-relaxed">
          HisabKhata is currently undergoing scheduled maintenance to improve our services. 
          We'll be back shortly. Thank you for your patience!
        </p>
        <div className="pt-6 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Expected back soon</p>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
