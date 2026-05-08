import React, { useState, useEffect } from 'react';
import { db, dbService } from '../services/firebase';
import { ref, onValue, update, remove, set, push } from 'firebase/database';
import { useAuth } from '../contexts/AuthContext';
import { 
    CheckCircle2, 
    XCircle, 
    Clock, 
    User, 
    Search, 
    Filter, 
    ChevronRight, 
    IndianRupee, 
    Eye,
    AlertCircle,
    ArrowUpRight,
    CreditCard,
    LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';

const PaymentsDashboard = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [processing, setProcessing] = useState(null); // stores paymentId being processed
    const [viewImage, setViewImage] = useState(null);

    useEffect(() => {
        if (!currentUser) return;

        const paymentsRef = ref(db, 'pending_payments');
        const unsub = onValue(paymentsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const list = Object.values(data)
                    .filter(p => p.merchantId === currentUser.uid)
                    .sort((a, b) => b.timestamp - a.timestamp);
                setPayments(list);
            } else {
                setPayments([]);
            }
            setLoading(false);
        });

        return () => unsub();
    }, [currentUser]);

    const handleApprove = async (payment) => {
        if (processing) return;
        setProcessing(payment.id);
        try {
            const txData = {
                customerId: payment.customerId,
                amount: Number(payment.amount),
                description: `Paid via Online Link (Ref: ${payment.transactionId || 'N/A'})`,
                date: new Date(payment.timestamp).toISOString().split('T')[0],
                timestamp: payment.timestamp,
                attachment: payment.screenshot || null
            };

            await dbService.addTransaction(currentUser.uid, payment.customerId, txData);
            await update(ref(db, `pending_payments/${payment.id}`), {
                status: 'approved',
                processedAt: Date.now()
            });
        } catch (err) {
            console.error(err);
            alert("Failed to approve payment.");
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async (payment) => {
        if (processing) return;
        if (!window.confirm("Are you sure you want to REJECT this payment?")) return;
        
        setProcessing(payment.id);
        try {
            // Queue notification
            await set(ref(db, `services/email_queue/${push(ref(db, 'services/email_queue')).key}`), {
                to_email: payment.customerEmail || '', 
                to_name: payment.customerName,
                merchant_name: currentUser?.displayName || 'Merchant',
                type: 'PAYMENT_REJECTED',
                timestamp: Date.now()
            });

            await update(ref(db, `pending_payments/${payment.id}`), {
                status: 'rejected',
                processedAt: Date.now()
            });
        } catch (err) {
            console.error(err);
            alert("Failed to reject payment.");
        } finally {
            setProcessing(null);
        }
    };

    const filteredPayments = payments.filter(p => 
        p.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.transactionId && p.transactionId.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
            <Sidebar />

            <div className="flex flex-1 ml-0 md:ml-[260px] flex-col overflow-hidden">
                {/* Mobile Branded Header - Ultra Compact */}
                <div className="md:hidden flex items-center justify-between px-4 py-1.5 bg-white border-b border-gray-100 sticky top-0 z-30">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-[#0057BB] rounded-md flex items-center justify-center shadow-sm">
                            <CreditCard className="text-white w-4 h-4" />
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-[#0057BB] font-black text-[15px] tracking-tight">Hisab Khata</span>
                            <span className="text-[#FF6B00] font-black italic text-[10px]">PRO</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            if(window.confirm('Are you sure you want to logout?')) {
                                window.location.href = '/login'; 
                            }
                        }}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                    >
                        <LogOut size={18} />
                    </button>
                </div>

                {/* Premium Page Header */}
                <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-2 md:py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 md:w-10 md:h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-100 shrink-0">
                            <CreditCard className="text-white w-4 h-4 md:w-5 md:h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 md:gap-3">
                                <h1 className="text-[15px] md:text-[19px] font-black text-gray-900 tracking-tight leading-none uppercase">Online Payments</h1>
                                <span className="bg-blue-600 text-white text-[8px] md:text-[9px] font-black uppercase tracking-[0.1em] px-2 py-0.5 rounded-full">
                                    {payments.filter(p => p.status === 'pending').length} Pending
                                </span>
                            </div>
                            <p className="text-[#8eacc0] text-[9px] md:text-[10px] mt-1 uppercase tracking-[0.2em] font-black leading-none">Verify & Approve Submissions</p>
                        </div>
                    </div>

                    <div className="relative group max-w-xs w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={14} />
                        <input 
                            type="text" 
                            placeholder="Search by customer or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 md:py-2.5 text-[12px] md:text-[13px] font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all placeholder:text-slate-400 placeholder:font-medium"
                        />
                    </div>
                </div>

                {/* Content Scroll Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 pb-32">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : filteredPayments.length === 0 ? (
                        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-16 text-center shadow-xl shadow-slate-200/50 max-w-4xl mx-auto">
                            <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Clock size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-2">No Pending Payments</h2>
                            <p className="text-slate-400 font-medium max-w-xs mx-auto text-sm">
                                When customers pay using your online link, their submissions will appear here for verification.
                            </p>
                        </div>
                    ) : (
                        <div className="max-w-6xl mx-auto grid grid-cols-1 gap-6">
                            {filteredPayments.map((payment) => (
                                <div 
                                    key={payment.id}
                                    className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden hover:border-blue-200 transition-all group"
                                >
                                    <div className="p-3 md:p-8 flex flex-row md:flex-row items-center md:items-center gap-4 md:gap-8">
                                        {/* Thumbnail: Small on mobile, Large on desktop */}
                                        <div className="relative shrink-0">
                                            {payment.screenshot ? (
                                                <div 
                                                    onClick={() => setViewImage(payment.screenshot)}
                                                    className="w-14 h-14 md:w-40 md:h-40 bg-slate-50 rounded-xl md:rounded-[2rem] overflow-hidden cursor-pointer relative group/img border border-slate-100 shadow-sm"
                                                >
                                                    <img src={payment.screenshot} alt="Proof" className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-500" />
                                                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors hidden md:flex items-center justify-center">
                                                        <Eye className="text-white opacity-0 group-hover/img:opacity-100 transition-opacity" size={24} />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="w-14 h-14 md:w-40 md:h-40 bg-slate-50 rounded-xl md:rounded-[2rem] flex flex-col items-center justify-center text-slate-300 border border-slate-100 border-dashed">
                                                    <AlertCircle className="w-5 h-5 md:w-8 md:h-8" />
                                                    <span className="hidden md:block text-[9px] font-black uppercase tracking-widest mt-2">No Proof</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Info Section */}
                                        <div className="flex-1 min-w-0 space-y-1 md:space-y-4">
                                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-1 md:gap-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-0.5 md:mb-1">
                                                        <User size={14} className="text-blue-600 hidden md:block" />
                                                        <h3 className="font-black text-slate-900 text-sm md:text-xl uppercase tracking-tight truncate">{payment.customerName}</h3>
                                                        {payment.status !== 'pending' && (
                                                            <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                                                                payment.status === 'approved' 
                                                                    ? 'bg-green-50 text-green-600 border-green-100' 
                                                                    : 'bg-red-50 text-red-600 border-red-100'
                                                            }`}>
                                                                {payment.status}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-slate-400 text-[9px] md:text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                                                        <Clock size={12} className="hidden md:block" />
                                                        <span className="truncate md:whitespace-normal">{new Date(payment.timestamp).toLocaleString()}</span>
                                                    </p>
                                                </div>
                                                <div className="hidden md:block text-right">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Transaction Ref</p>
                                                    <p className="font-mono text-[11px] bg-slate-50 px-3 py-1 rounded-full text-slate-600 border border-slate-100">
                                                        {payment.transactionId || 'NOT PROVIDED'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center md:items-end justify-between md:border-t md:border-slate-50 md:pt-4">
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-[9px] md:text-xs font-black text-slate-400 uppercase">Amount:</span>
                                                    <span className="text-lg md:text-3xl font-black text-slate-900 leading-none">₹{Number(payment.amount).toLocaleString('en-IN')}</span>
                                                </div>
                                                
                                                <button 
                                                    onClick={() => navigate('/customers', { state: { selectedCustomerId: payment.customerId } })}
                                                    className="hidden md:flex bg-blue-50 text-[#0057BB] text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl items-center gap-1 hover:bg-blue-100 transition-colors"
                                                >
                                                    View Ledger <ArrowUpRight size={14} />
                                                </button>
                                                
                                                {/* Mobile Ledger Link */}
                                                <button 
                                                    onClick={() => navigate('/customers', { state: { selectedCustomerId: payment.customerId } })}
                                                    className="md:hidden text-blue-600 text-[10px] font-black uppercase tracking-widest"
                                                >
                                                    Ledger →
                                                </button>
                                            </div>
                                        </div>

                                        {/* Action Section - Desktop Only or Floating on Mobile */}
                                        <div className="flex flex-col md:w-48 gap-2 md:gap-3 md:border-l md:border-slate-100 md:pl-8">
                                            {payment.status === 'pending' ? (
                                                <>
                                                    <button 
                                                        onClick={() => handleApprove(payment)}
                                                        disabled={processing === payment.id}
                                                        className="w-10 h-10 md:w-full md:h-auto bg-green-600 hover:bg-green-700 text-white md:py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-green-100 flex items-center justify-center gap-2 disabled:opacity-50"
                                                    >
                                                        <CheckCircle2 size={16} />
                                                        <span className="hidden md:inline">{processing === payment.id ? '...' : 'Approve'}</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleReject(payment)}
                                                        disabled={processing === payment.id}
                                                        className="w-10 h-10 md:w-full md:h-auto bg-white hover:bg-red-50 text-red-600 border border-red-100 md:py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                                                    >
                                                        <XCircle size={16} />
                                                        <span className="hidden md:inline">Reject</span>
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="hidden md:flex flex-col items-center justify-center text-center p-2">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                                    <div className={`w-full py-2 rounded-lg font-black text-[10px] uppercase tracking-widest border ${
                                                        payment.status === 'approved' 
                                                            ? 'bg-green-50 text-green-600 border-green-100' 
                                                            : 'bg-red-50 text-red-600 border-red-100'
                                                    }`}>
                                                        {payment.status}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <BottomNav />

            {/* Image Modal */}
            {viewImage && (
                <div 
                    className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
                    onClick={() => setViewImage(null)}
                >
                    <img 
                        src={viewImage} 
                        alt="Payment Proof Full" 
                        className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300" 
                    />
                    <button 
                        className="absolute top-8 right-8 text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors"
                        onClick={() => setViewImage(null)}
                    >
                        <XCircle size={32} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default PaymentsDashboard;
