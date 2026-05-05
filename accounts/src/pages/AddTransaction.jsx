import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { dbService } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { getFirebaseErrorMessage } from '../utils/errorHandlers';
import { ArrowLeft, Calendar, Camera, ChevronDown } from 'lucide-react';

const AddTransaction = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { currentUser } = useAuth();
    
    const initialType = searchParams.get('type') === 'payment' ? 'payment' : 'credit';
    const customerId = searchParams.get('customerId');

    const [type, setType] = useState(initialType);
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [note, setNote] = useState('');
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (customerId) {
            const fetchCustomer = async () => {
                const data = await dbService.getCustomer(customerId);
                setCustomer(data);
            };
            fetchCustomer();
        }
    }, [customerId]);

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setError('');
        
        if (!amount || isNaN(amount) || Number(amount) <= 0) {
            return setError('Please enter a valid amount.');
        }

        try {
            setLoading(true);
            await dbService.addTransaction(currentUser.uid, customerId, {
                type: type === 'payment' ? 'GOT' : 'GAVE',
                amount: Number(amount),
                date: date,
                note: note,
                timestamp: new Date(date).getTime()
            });

            navigate(`/customer/${customerId}`);
        } catch (err) {
            console.error(err);
            setError(getFirebaseErrorMessage(err));
            setLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const isGave = type === 'credit';
    const headerRed = '#A02C2C';
    const buttonRed = '#F39696';

    return (
        <div className="flex flex-col min-h-screen bg-[#F0F2F5] text-slate-800 antialiased">
            {/* Header */}
            <header className="bg-white px-4 py-6 flex items-start gap-4 border-b border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <button 
                    onClick={() => navigate(-1)}
                    style={{ color: headerRed }}
                    className="mt-1 active:scale-95 transition-all p-1"
                >
                    <ArrowLeft size={34} strokeWidth={3} />
                </button>
                <div className="flex-1">
                    <h1 
                        style={{ color: headerRed }}
                        className="text-[26px] font-extrabold leading-[1.2] tracking-tight"
                    >
                        You {isGave ? 'gave' : 'got'} ₹ {amount || 0} to {customer?.name || 'Loading...'}
                    </h1>
                </div>
            </header>

            <div className="flex-1 px-5 py-8 max-w-lg mx-auto w-full space-y-10">
                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-3xl text-sm font-black border border-red-100 shadow-sm">
                        {error}
                    </div>
                )}

                {/* Amount Entry Section */}
                <div className="space-y-4">
                    <label className="text-[14px] font-black text-slate-400 ml-2 tracking-wide">Amount (₹)</label>
                    <div className="bg-white px-5 py-4 border border-slate-300 rounded-[28px] shadow-sm flex items-center group focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50 transition-all duration-300">
                        <span className="text-[44px] font-bold text-slate-300 mr-5 select-none leading-none">₹</span>
                        <input 
                            autoFocus
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            className="flex-1 bg-transparent text-[52px] font-black text-slate-700 border-none outline-none p-0 m-0 placeholder-slate-200 leading-none h-auto w-full"
                            value={amount}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                    setAmount(val);
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Details Entry Section */}
                <div className="space-y-4">
                    <label className="text-[14px] font-black text-slate-400 ml-2 tracking-wide">Transaction Details (Optional)</label>
                    <div className="bg-white border border-slate-300 rounded-[28px] shadow-sm overflow-hidden focus-within:border-blue-500 transition-all duration-300">
                        <textarea 
                            placeholder="Enter details (Items, bill no., quantity, etc.)"
                            className="w-full p-6 min-h-[160px] border-none outline-none text-slate-700 font-bold text-xl placeholder-slate-300 resize-none leading-relaxed"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>
                </div>

                {/* Date & Bills Grid */}
                <div className="grid grid-cols-2 gap-5">
                    <div className="relative group">
                        <input 
                            type="date"
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                        <div className="bg-white p-5 h-20 rounded-[24px] border border-slate-200 shadow-sm flex items-center justify-between pointer-events-none group-hover:border-slate-400 transition-all duration-300">
                            <div className="flex items-center gap-4">
                                <Calendar className="text-slate-500" size={28} />
                                <span className="text-[16px] font-extrabold text-slate-700">{formatDate(date)}</span>
                            </div>
                            <ChevronDown size={20} className="text-slate-400" />
                        </div>
                    </div>

                    <button className="bg-white p-5 h-20 rounded-[24px] border border-slate-200 shadow-sm flex items-center justify-center gap-4 group hover:border-slate-400 transition-all duration-300 active:scale-[0.98]">
                        <Camera style={{ color: headerRed }} size={28} />
                        <span className="text-[16px] font-extrabold text-slate-700">Attach Bills</span>
                    </button>
                </div>
            </div>

            {/* Final SAVE Action */}
            <div className="p-6 bg-[#F0F2F5] mt-auto sticky bottom-0 border-t border-slate-200/50">
                <button 
                    disabled={loading || !amount}
                    onClick={handleSubmit}
                    style={{ backgroundColor: buttonRed }}
                    className={`w-full py-6 rounded-[24px] font-black text-white text-2xl tracking-[0.08em] shadow-xl shadow-red-200/50 transition-all duration-300 ${
                        loading || !amount 
                        ? 'opacity-40 cursor-not-allowed grayscale' 
                        : 'hover:scale-[1.01] hover:brightness-105 active:scale-[0.98]'
                    }`}
                >
                    {loading ? 'SAVING...' : 'SAVE'}
                </button>
            </div>
        </div>
    );
};

export default AddTransaction;
