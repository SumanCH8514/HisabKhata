import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { db, dbService } from '../services/firebase';
import { ref, get, set, update, push } from 'firebase/database';
import { useAuth } from '../contexts/AuthContext';
import { 
    CheckCircle2, 
    XCircle, 
    Clock, 
    Smartphone, 
    User, 
    ArrowLeft, 
    Check, 
    X,
    Eye,
    ShieldCheck,
    Copy,
    ArrowRight
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import AppMobileHeader from '../components/AppMobileHeader';

const PaymentVerification = () => {
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    
    const [pendingPayment, setPendingPayment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [viewImage, setViewImage] = useState(null);
    const [copied, setCopied] = useState(false);

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

    const handleCopyRef = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleApprove = async () => {
        if (!pendingPayment || processing) return;
        setProcessing(true);
        try {
            const txData = {
                customerId: pendingPayment.customerId,
                amount: Number(pendingPayment.amount), // Positive for Got
                description: `Online Payment Received (Ref: ${pendingPayment.transactionId || 'N/A'})`,
                date: new Date(pendingPayment.timestamp).toISOString().split('T')[0],
                timestamp: pendingPayment.timestamp,
                attachments: pendingPayment.screenshot ? [pendingPayment.screenshot] : [],
                attachment: pendingPayment.screenshot || null
            };

            await dbService.addTransaction(pendingPayment.merchantId, pendingPayment.customerId, txData);
            
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
            if (pendingPayment.customerEmail) {
                await set(ref(db, `services/email_queue/${push(ref(db, 'services/email_queue')).key}`), {
                    to_email: pendingPayment.customerEmail, 
                    to_name: pendingPayment.customerName,
                    merchant_name: currentUser?.displayName || 'Merchant',
                    amount: pendingPayment.amount,
                    type: 'PAYMENT_REJECTED',
                    timestamp: Date.now()
                });
            }

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
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-slate-500 font-semibold text-xs">Loading Payment Details...</p>
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-4 border border-rose-100">
                <XCircle size={28} />
            </div>
            <h1 className="text-lg font-bold text-slate-900 mb-1">Verification Error</h1>
            <p className="text-xs text-slate-500 max-w-xs">{error}</p>
            <button 
                onClick={() => navigate('/payments')} 
                className="mt-6 text-blue-600 font-semibold text-xs hover:underline inline-flex items-center gap-1"
            >
                <ArrowLeft size={14} /> Back to Payments
            </button>
        </div>
    );

    const isPending = pendingPayment.status === 'pending';
    const isApproved = pendingPayment.status === 'approved';
    const isRejected = pendingPayment.status === 'rejected';

    return (
        <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
            <Sidebar />

            <div className="flex flex-col flex-1 ml-0 md:ml-[260px] overflow-hidden relative">
                <AppMobileHeader />

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 pb-28 md:pb-12 flex flex-col items-center">
                    <div className="max-w-3xl w-full space-y-4">
                        
                        {/* Navigation Top link */}
                        <div className="flex items-center justify-between">
                            <button 
                                onClick={() => navigate('/payments')} 
                                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                            >
                                <ArrowLeft size={16} />
                                <span>Back to Payments</span>
                            </button>

                            {isPending && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                    <Clock size={13} /> Pending Verification
                                </span>
                            )}
                        </div>

                        {/* Card Container */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            {/* Card Top Banner */}
                            <div className="bg-slate-900 text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Payment Amount</p>
                                    <h2 className="text-3xl md:text-4xl font-extrabold text-white mt-0.5 tracking-tight">
                                        ₹{Number(pendingPayment.amount).toLocaleString('en-IN')}
                                    </h2>
                                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                                        <Clock size={13} />
                                        <span>Submitted on {new Date(pendingPayment.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                    </p>
                                </div>

                                <div className="text-right">
                                    <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold border ${
                                        isApproved 
                                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                                            : isRejected 
                                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                    }`}>
                                        {isApproved && <CheckCircle2 size={14} />}
                                        {isRejected && <XCircle size={14} />}
                                        {isPending && <Clock size={14} />}
                                        <span className="uppercase tracking-wider">
                                            {pendingPayment.status || 'Pending'}
                                        </span>
                                    </span>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-6 md:p-8 space-y-6">
                                
                                {/* Info Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Customer info */}
                                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                                            <User size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Customer</p>
                                            <p className="text-sm font-bold text-slate-800 truncate">{pendingPayment.customerName}</p>
                                            {pendingPayment.customerEmail && (
                                                <p className="text-xs text-slate-500 truncate mt-0.5">{pendingPayment.customerEmail}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Reference ID */}
                                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                                            <Smartphone size={18} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">UTR / Transaction Ref</p>
                                            {pendingPayment.transactionId ? (
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-sm font-mono font-bold text-slate-800 truncate">{pendingPayment.transactionId}</span>
                                                    <button 
                                                        onClick={() => handleCopyRef(pendingPayment.transactionId)}
                                                        className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                                                        title="Copy Reference ID"
                                                    >
                                                        {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                                    </button>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-400 italic mt-0.5">Not provided</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Proof Preview */}
                                {pendingPayment.screenshot ? (
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-slate-700">Payment Screenshot / Receipt</p>
                                        <div 
                                            onClick={() => setViewImage(pendingPayment.screenshot)}
                                            className="rounded-xl border border-slate-200 overflow-hidden bg-slate-100 cursor-pointer relative group max-h-96 flex items-center justify-center"
                                        >
                                            <img 
                                                src={pendingPayment.screenshot} 
                                                alt="Payment Proof" 
                                                className="max-h-96 w-auto object-contain group-hover:scale-102 transition-transform duration-300"
                                            />
                                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold backdrop-blur-[2px]">
                                                <Eye size={18} /> Click to View Full Size
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                                        No payment screenshot was uploaded for this submission.
                                    </div>
                                )}

                                {/* Action Buttons for Pending */}
                                {isPending ? (
                                    <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
                                        <button
                                            onClick={handleReject}
                                            disabled={processing}
                                            className="w-full sm:w-1/3 py-3 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            Reject Submission
                                        </button>
                                        <button
                                            onClick={handleApprove}
                                            disabled={processing}
                                            className="w-full sm:w-2/3 py-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            <Check size={16} strokeWidth={2.5} />
                                            <span>{processing ? 'Processing...' : 'Approve & Record in Customer Ledger'}</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                        <p className="text-xs text-slate-500">
                                            {pendingPayment.processedAt && `Processed on ${new Date(pendingPayment.processedAt).toLocaleString()}`}
                                        </p>
                                        <button
                                            onClick={() => navigate('/customers', { state: { selectedCustomerId: pendingPayment.customerId } })}
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700"
                                        >
                                            <span>Open Customer Ledger</span>
                                            <ArrowRight size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <BottomNav />

            {/* Proof Modal */}
            {viewImage && (
                <div 
                    className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setViewImage(null)}
                >
                    <div className="absolute top-4 inset-x-4 max-w-4xl mx-auto flex items-center justify-between z-10">
                        <span className="text-white text-xs md:text-sm font-semibold bg-white/10 px-3.5 py-1.5 rounded-full backdrop-blur-md border border-white/10">
                            Payment Proof Screenshot
                        </span>
                        <button 
                            onClick={() => setViewImage(null)}
                            className="text-white p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X size={22} />
                        </button>
                    </div>

                    <img 
                        src={viewImage} 
                        alt="Full Payment Proof" 
                        className="max-w-full max-h-[82vh] object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};

export default PaymentVerification;
