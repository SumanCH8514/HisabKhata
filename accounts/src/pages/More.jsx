import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import { 
    ChevronRight, 
    Settings, 
    Banknote, 
    BookText, 
    FileText, 
    Package, 
    Users, 
    CalendarClock, 
    ShieldCheck, 
    Wallet
} from 'lucide-react';

const More = () => {
    const { currentUser, userData, isAdmin } = useAuth();
    const navigate = useNavigate();

    const displayName = userData?.name || currentUser?.displayName || 'Merchant';
    const shopName = userData?.businessName || userData?.name || 'My Shop';
    const initial = (displayName.charAt(0) || 'M').toUpperCase();

    const calculateStrength = () => {
        if (!userData) return { percentage: 0, label: 'Weak', color: 'text-red-500', barColor: 'bg-red-500' };
        
        const fields = [
            userData.photoURL,
            userData.name,
            userData.phone || userData.mobile,
            userData.businessName,
            userData.address,
            userData.category,
            userData.type,
            userData.gstin,
            userData.bankAccount,
            userData.staffDetails
        ];
        
        const filledFields = fields.filter(f => f && f.toString().trim() !== '').length;
        const percentage = Math.round((filledFields / fields.length) * 100);
        
        let label = 'Weak';
        let color = 'text-red-500';
        let barColor = 'bg-red-500';
        
        if (percentage > 70) {
            label = 'Strong';
            color = 'text-green-600';
            barColor = 'bg-green-500';
        } else if (percentage > 30) {
            label = 'Good';
            color = 'text-yellow-600';
            barColor = 'bg-yellow-500';
        }
        
        return { percentage, label, color, barColor };
    };

    const strength = calculateStrength();

    const menuItems = [
        { id: 'loans', label: 'Loans', icon: <Banknote size={24} />, color: 'bg-green-50 text-green-600' },
        { id: 'cashbook', label: 'Cashbook', icon: <BookText size={24} />, color: 'bg-blue-50 text-blue-600' },
        { id: 'bills', label: 'Bills', icon: <FileText size={24} />, color: 'bg-red-50 text-red-600' },
        { id: 'items', label: 'Items', icon: <Package size={24} />, color: 'bg-purple-50 text-purple-600' },
        { id: 'staff', label: 'Staff', icon: <Users size={24} />, color: 'bg-yellow-50 text-yellow-600' },
        { id: 'collection', label: 'Collection', icon: <CalendarClock size={24} />, color: 'bg-orange-50 text-orange-600' },
        { id: 'insurance', label: 'Shop Insurance', icon: <ShieldCheck size={24} />, color: 'bg-pink-50 text-pink-600' },
    ];

    if (isAdmin) {
        menuItems.push({ id: 'admin', label: 'Admin Panel', icon: <ShieldCheck size={24} />, color: 'bg-amber-50 text-amber-600' });
    }

    return (
        <div className="min-h-screen bg-slate-50 flex overflow-x-hidden">
            {/* Sidebar Desktop */}
            <Sidebar />

            <div className="flex-1 md:ml-[260px] pb-24 md:pb-0 flex flex-col min-w-0 overflow-x-hidden">
                {/* Mobile Header - Standard Branding */}
                <div className="md:hidden bg-white px-4 py-3 flex items-center justify-between border-b border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
                            <BookText size={18} className="text-white" />
                        </div>
                        <div className="flex items-center">
                            <span className="text-[#0051bb] font-black text-lg tracking-tight">Hisab Khata</span>
                            <span className="text-orange-500 font-black italic text-lg ml-1.5 uppercase">PRO</span>
                        </div>
                    </div>
                </div>

                <main className="flex-1 max-w-2xl mx-auto w-full p-4 md:p-8 space-y-6">
                    {/* Profile Section */}
                    <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100 flex items-center justify-between w-full overflow-hidden">
                        <div className="flex items-center gap-3 md:gap-4 min-w-0">
                            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-pink-500 border-2 border-pink-100 flex items-center justify-center text-white text-xl font-black overflow-hidden shadow-sm flex-shrink-0">
                                {userData?.photoURL ? (
                                    <img src={userData.photoURL} alt="Shop" className="w-full h-full object-cover" />
                                ) : (
                                    initial
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-base md:text-lg font-black text-slate-900 leading-tight truncate">{shopName}</h2>
                                <p className="text-xs md:text-sm font-bold text-slate-400 truncate">{displayName}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => navigate('/profile')}
                            className="ml-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-xs md:text-sm font-black hover:bg-blue-50 transition-colors flex-shrink-0 whitespace-nowrap"
                        >
                            Edit
                        </button>
                    </div>

                    {/* Profile Strength */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-bold text-slate-500">Profile strength : <span className={strength.color}>{strength.label}</span></span>
                            <span className={`text-xs font-black ${strength.color}`}>{strength.percentage}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div className={`h-full ${strength.barColor} transition-all duration-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]`} style={{ width: `${strength.percentage}%` }} />
                        </div>
                    </div>

                    {/* Utilities Grid */}
                    <div className="grid grid-cols-3 gap-3">
                        {menuItems.map((item) => (
                            <div 
                                key={item.id}
                                onClick={() => item.id === 'admin' ? navigate('/admin') : null}
                                className="bg-white p-4 py-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform cursor-pointer relative overflow-hidden"
                            >
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${item.color}`}>
                                    {item.icon}
                                </div>
                                <span className="text-[11px] font-black text-slate-700 text-center leading-tight">
                                    {item.label}
                                </span>
                                
                                {/* Coming Soon Badge */}
                                {item.id !== 'admin' && (
                                    <div className="absolute top-0 right-0 bg-slate-100 text-slate-400 text-[8px] font-black uppercase px-2 py-0.5 rounded-bl-lg tracking-tighter">
                                        Soon
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Bottom Settings Link */}
                    <div className="pt-4">
                        <button 
                            onClick={() => navigate('/settings')}
                            className="w-full bg-white px-5 py-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group active:bg-slate-50 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="text-blue-600">
                                    <Settings size={24} />
                                </div>
                                <span className="text-sm font-black text-slate-800">Settings</span>
                            </div>
                            <ChevronRight size={20} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                        </button>
                    </div>

                    {/* Promo Banner / Pro Upgrade */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-5 text-white flex items-center justify-between overflow-hidden relative">
                        <div className="relative z-10">
                            <h3 className="text-sm font-black uppercase tracking-widest opacity-80">HisabKhata Premium</h3>
                            <p className="text-xs font-medium mt-1">Get advanced reports & priority support</p>
                            <button className="mt-3 bg-white text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                                Upgrade Now
                            </button>
                        </div>
                        <Wallet size={80} className="absolute -right-4 -bottom-4 opacity-10 rotate-12" />
                    </div>

                    {/* Footer Section */}
                    <div className="pt-8 pb-12 space-y-6 px-4">
                        <div className="text-center">
                            <p className="text-[11px] font-black text-slate-400 tracking-tighter uppercase">HisabKhata V0.1.4</p>
                        </div>
                        
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-4">
                            <Link to="/privacy-policy" className="hover:text-blue-600 transition-colors">Privacy Policy</Link>
                            <Link to="/terms-of-condition" className="hover:text-blue-600 transition-colors">Terms of Condition</Link>
                        </div>

                        <div className="text-center space-y-1">
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Website Design & Maintained by</p>
                            <p className="text-[12px] font-black text-blue-600 tracking-tight leading-none">SumanOnline.Com</p>
                        </div>
                    </div>
                </main>
            </div>

            {/* Mobile Nav */}
            <BottomNav />
        </div>
    );
};

export default More;
