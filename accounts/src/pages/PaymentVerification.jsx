import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { db, dbService } from '../services/firebase';
import { ref, get, set, update, remove, push } from 'firebase/database';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle2, XCircle, Clock, Smartphone, User, ArrowLeft } from 'lucide-react';

const PaymentVerification = () => {
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    
    const [pendingPayment, setPendingPayment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!id) {
            setError("Invalid Verification Link");
            setLoading(false);
            return;
        }

        const fetchPendingPayment = async () => {
            try {
                const snap = await get(ref(db, `pending_payments/${id}`));
                if (snap.exists()) {
                    const data = snap.val();
                    setPendingPayment(data);
                } else {
                    setError("Payment record not found or already processed.");
                }
            } catch (err) {
                console.error(err);
                setError("Failed to fetch payment details.");
            } finally {
                setLoading(false);
            }
        };

        fetchPendingPayment();
    }, [id]);

    const handleApprove = async () => {
        if (!pendingPayment || processing) return;
        setProcessing(true);
        try {
            // Add to transactions
            const txData = {
                customerId: pendingPayment.customerId,
                amount: pendingPayment.amount, // Positive for Credit/Got
                description: `Paid via Online Link (Ref: ${pendingPayment.transactionId || 'N/A'})`,
                date: new Date(pendingPayment.timestamp).toISOString().split('T')[0],
                timestamp: pendingPayment.timestamp,
                attachment: pendingPayment.screenshot || null
            };

            // Use the established dbService to add transaction
            // signature: addTransaction(userId, customerId, transactionData)
            await dbService.addTransaction(pendingPayment.merchantId, pendingPayment.customerId, txData);
            
            // Update status atomically
            await update(ref(db, `pending_payments/${id}`), {
                status: 'approved',
                processedAt: Date.now()
            });
            
            alert("Payment Approved & Ledger Updated! ✅");
            navigate('/customers', { state: { selectedCustomerId: pendingPayment.customerId } });
        } catch (err) {
            console.error(err);
            alert("Failed to approve payment. Please ensure you are logged in.");
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!pendingPayment || processing) return;
        if (!window.confirm("Are you sure you want to REJECT this payment? The customer will be notified.")) return;
        
        setProcessing(true);
        try {
            // Notify merchant rejected (we store in email_queue for potential background worker/EmailJS pick)
            await set(ref(db, `services/email_queue/${push(ref(db, 'services/email_queue')).key}`), {
                to_email: pendingPayment.customerEmail || '', 
                to_name: pendingPayment.customerName,
                merchant_name: currentUser?.displayName || 'Merchant',
                type: 'PAYMENT_REJECTED',
                timestamp: Date.now()
            });

            // Update status atomically
            await update(ref(db, `pending_payments/${id}`), {
                status: 'rejected',
                processedAt: Date.now()
            });
            
            alert("Payment Rejected. ❌");
            navigate('/customers', { state: { selectedCustomerId: pendingPayment.customerId } });
        } catch (err) {
            console.error(err);
            alert("Failed to reject payment.");
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Verifying Payment Request...</p>
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                <XCircle size={32} />
            </div>
            <h1 className="text-xl font-black text-slate-900 mb-2">Verification Error</h1>
            <p className="text-slate-500 max-w-xs">{error}</p>
            <button onClick={() => navigate('/customers')} className="mt-8 text-blue-600 font-bold uppercase tracking-widest text-xs hover:underline">Back to Dashboard</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-10 flex flex-col items-center antialiased font-sans">
            <div className="max-w-xl w-full">
                <button onClick={() => navigate('/customers')} className="mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors group">
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[11px] font-black uppercase tracking-widest">Back to Ledger</span>
                </button>

                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200 overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
                    <div className="bg-[#0057BB] p-10 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full bg-black/5 pointer-events-none"></div>
                        <div className="relative z-10">
                            <p className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Payment Verification Request</p>
                            <h2 className="text-4xl font-black text-white">₹{pendingPayment.amount.toLocaleString('en-IN')}</h2>
                            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full text-white">
                                <Clock size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">{new Date(pendingPayment.timestamp).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 md:p-10 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-[#0057BB]">
                                    <User size={20} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Customer</p>
                                    <p className="text-sm font-bold text-slate-800 truncate">{pendingPayment.customerName}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-[#0057BB]">
                                    <Smartphone size={20} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Ref ID</p>
                                    <p className="text-sm font-bold text-slate-800 truncate">{pendingPayment.transactionId || 'Not Provided'}</p>
                                </div>
                            </div>
                        </div>

                        {pendingPayment.screenshot && (
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Proof (Screenshot)</p>
                                <div 
                                    className="rounded-3xl border-4 border-slate-50 overflow-hidden shadow-lg group cursor-pointer relative" 
                                    onClick={() => window.open(pendingPayment.screenshot, '_blank')}
                                >
                                    <img src={pendingPayment.screenshot} alt="Payment Proof" className="w-full h-auto group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                        <span className="opacity-0 group-hover:opacity-100 bg-white px-4 py-2 rounded-full text-[10px] font-black uppercase shadow-lg transition-all">View Full Image</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="pt-6">
                            {pendingPayment.status === 'pending' ? (
                                <div className="flex flex-col gap-4">
                                    <button 
                                        onClick={handleApprove}
                                        disabled={processing}
                                        className="w-full bg-green-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-green-100 hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        <CheckCircle2 size={20} />
                                        {processing ? 'Processing...' : 'Approve & Add to Ledger'}
                                    </button>
                                    <button 
                                        onClick={handleReject}
                                        disabled={processing}
                                        className="w-full bg-white text-red-500 border-2 border-red-50 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-50 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        <XCircle size={20} />
                                        Reject Payment
                                    </button>
                                </div>
                            ) : (
                                <div className={`p-6 rounded-3xl border-2 flex flex-col items-center gap-3 ${
                                    pendingPayment.status === 'approved' 
                                        ? 'bg-green-50 border-green-100 text-green-600' 
                                        : 'bg-red-50 border-red-100 text-red-600'
                                }`}>
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                                        {pendingPayment.status === 'approved' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Payment Status</p>
                                        <h3 className="text-lg font-black uppercase tracking-tight">
                                            Successfully {pendingPayment.status}
                                        </h3>
                                        {pendingPayment.processedAt && (
                                            <p className="text-[10px] font-bold mt-1 opacity-60">
                                                Processed on {new Date(pendingPayment.processedAt).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-10 text-center">
                    <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase tracking-widest">
                        Platform Security Verified • HisabKhata Digital Ledger
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PaymentVerification;
