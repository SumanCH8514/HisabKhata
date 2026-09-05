import React, { useState, useEffect } from 'react';
import { db, dbService } from '../services/firebase';
import { ref, onValue, update, set, push } from 'firebase/database';
import { useAuth } from '../contexts/AuthContext';
import { 
    CheckCircle2, 
    XCircle, 
    Clock, 
    User, 
    Search, 
    Eye,
    AlertCircle,
    ArrowUpRight,
    CreditCard,
    Copy,
    Check,
    ShieldCheck,
    X,
    Filter,
    ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import AppMobileHeader from '../components/AppMobileHeader';

const getInitialColor = (name) => {
    if (!name) return '#0057BB';
    const colors = ['#0057BB', '#0284c7', '#0891b2', '#059669', '#d97706', '#e11d48', '#7c3aed', '#4f46e5'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const PaymentsDashboard = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [payments, setPayments] = useState([]);
    const [customersMap, setCustomersMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
    const [processing, setProcessing] = useState(null); // stores paymentId being processed
    const [viewImage, setViewImage] = useState(null);
    const [copiedId, setCopiedId] = useState(null);

    useEffect(() => {
        if (!currentUser) return;

        const paymentsRef = ref(db, 'pending_payments');
        const unsubPayments = onValue(paymentsRef, (snapshot) => {
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

        const unsubCustomers = dbService.listenUserCustomers(currentUser.uid, (data) => {
            const map = {};
            data.forEach(c => {
                map[c.id] = c;
            });
            setCustomersMap(map);
        });

        return () => {
            unsubPayments();
            if (typeof unsubCustomers === 'function') unsubCustomers();
        };
    }, [currentUser]);

    const handleCopyRef = (text, id) => {
        if (!text || text === 'N/A') return;
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleApprove = async (payment) => {
        if (processing) return;
        setProcessing(payment.id);
        try {
            const txData = {
                customerId: payment.customerId,
                amount: Number(payment.amount),
                description: `Online Payment Received (Ref: ${payment.transactionId || 'N/A'})`,
                date: new Date(payment.timestamp).toISOString().split('T')[0],
                timestamp: payment.timestamp,
                attachments: payment.screenshot ? [payment.screenshot] : [],
                attachment: payment.screenshot || null
            };

            await dbService.addTransaction(currentUser.uid, payment.customerId, txData);
            await update(ref(db, `pending_payments/${payment.id}`), {
                status: 'approved',
                processedAt: Date.now()
            });
        } catch (err) {
            console.error(err);
            alert("Failed to approve payment: " + err.message);
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async (payment) => {
        if (processing) return;
        if (!window.confirm(`Reject payment of ₹${Number(payment.amount).toLocaleString('en-IN')} from ${payment.customerName}?`)) return;
        
        setProcessing(payment.id);
        try {
            // Queue email notification
            if (payment.customerEmail) {
                await set(ref(db, `services/email_queue/${push(ref(db, 'services/email_queue')).key}`), {
                    to_email: payment.customerEmail, 
                    to_name: payment.customerName,
                    merchant_name: currentUser?.displayName || 'Merchant',
                    amount: payment.amount,
                    type: 'PAYMENT_REJECTED',
                    timestamp: Date.now()
                });
            }

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

    // Metrics calculations
    const pendingList = payments.filter(p => p.status === 'pending');
    const approvedList = payments.filter(p => p.status === 'approved');
    const rejectedList = payments.filter(p => p.status === 'rejected');

    const totalPendingAmount = pendingList.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalApprovedAmount = approvedList.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    const filteredPayments = payments.filter(p => {
        const matchesSearch = 
            p.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.transactionId && p.transactionId.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.customerEmail && p.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
            p.amount?.toString().includes(searchTerm);
        
        if (!matchesSearch) return false;
        if (statusFilter === 'all') return true;
        return p.status === statusFilter;
    });

    const formatDateTime = (ts) => {
        if (!ts) return '—';
        const d = new Date(ts);
        return d.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
            <Sidebar />

            <div className="flex flex-1 ml-0 md:ml-[260px] flex-col overflow-hidden">
                {/* Mobile Header */}
                <AppMobileHeader />

                {/* Desktop Top Header */}
                <header className="hidden md:flex bg-white border-b border-slate-200/80 px-8 py-4 items-center justify-between flex-shrink-0">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                            Online Payment Submissions
                            {pendingList.length > 0 && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                    {pendingList.length} Action Needed
                                </span>
                            )}
                        </h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Review and verify UPI / bank transfer proofs submitted by your customers
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative w-72">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                            <input 
                                type="text" 
                                placeholder="Search by name, ref, amount..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white rounded-lg pl-9 pr-8 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                            />
                            {searchTerm && (
                                <button 
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto custom-scrollbar p-3.5 sm:p-5 md:p-8 pb-28 md:pb-12">
                    <div className="max-w-6xl mx-auto space-y-3.5 sm:space-y-4 md:space-y-6">

                        {/* Top Metrics Cards - 3 Equal Columns */}
                        <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                            {/* Pending Review Card */}
                            <div 
                                onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
                                className={`cursor-pointer rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 md:p-4 border transition-all select-none ${statusFilter === 'pending' 
                                    ? 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-300 shadow-xs' 
                                    : 'bg-white border-slate-200 hover:border-amber-200'}`}
                            >
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-[11px] sm:text-xs font-semibold text-slate-600 truncate">Pending</span>
                                    <span className={`w-2 h-2 shrink-0 rounded-full ${pendingList.length > 0 ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`}></span>
                                </div>
                                <div className="mt-1 sm:mt-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-0.5">
                                    <p className="text-base sm:text-xl md:text-2xl font-black text-slate-900 leading-tight">{pendingList.length}</p>
                                    <p className="text-[10px] sm:text-xs font-bold text-amber-700 truncate">₹{totalPendingAmount.toLocaleString('en-IN')}</p>
                                </div>
                            </div>

                            {/* Approved Card */}
                            <div 
                                onClick={() => setStatusFilter(statusFilter === 'approved' ? 'all' : 'approved')}
                                className={`cursor-pointer rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 md:p-4 border transition-all select-none ${statusFilter === 'approved' 
                                    ? 'bg-emerald-50/90 border-emerald-300 ring-1 ring-emerald-300 shadow-xs' 
                                    : 'bg-white border-slate-200 hover:border-emerald-200'}`}
                            >
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-[11px] sm:text-xs font-semibold text-slate-600 truncate">Approved</span>
                                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                                </div>
                                <div className="mt-1 sm:mt-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-0.5">
                                    <p className="text-base sm:text-xl md:text-2xl font-black text-slate-900 leading-tight">{approvedList.length}</p>
                                    <p className="text-[10px] sm:text-xs font-bold text-emerald-700 truncate">₹{totalApprovedAmount.toLocaleString('en-IN')}</p>
                                </div>
                            </div>

                            {/* Rejected Card */}
                            <div 
                                onClick={() => setStatusFilter(statusFilter === 'rejected' ? 'all' : 'rejected')}
                                className={`cursor-pointer rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 md:p-4 border transition-all select-none ${statusFilter === 'rejected' 
                                    ? 'bg-rose-50/90 border-rose-300 ring-1 ring-rose-300 shadow-xs' 
                                    : 'bg-white border-slate-200 hover:border-rose-200'}`}
                            >
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-[11px] sm:text-xs font-semibold text-slate-600 truncate">Rejected</span>
                                    <XCircle size={13} className="text-rose-400 shrink-0" />
                                </div>
                                <div className="mt-1 sm:mt-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-0.5">
                                    <p className="text-base sm:text-xl md:text-2xl font-black text-slate-900 leading-tight">{rejectedList.length}</p>
                                    <span className="text-[10px] sm:text-xs text-slate-400 font-medium truncate">Recorded</span>
                                </div>
                            </div>
                        </div>

                        {/* Filter Tabs & Mobile Search */}
                        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3">
                            {/* Filter Pills */}
                            <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl overflow-x-auto no-scrollbar scroll-smooth">
                                {[
                                    { id: 'all', label: 'All', fullLabel: 'All Submissions', count: payments.length },
                                    { id: 'pending', label: 'Pending', fullLabel: 'Pending Review', count: pendingList.length },
                                    { id: 'approved', label: 'Approved', fullLabel: 'Approved', count: approvedList.length },
                                    { id: 'rejected', label: 'Rejected', fullLabel: 'Rejected', count: rejectedList.length }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setStatusFilter(tab.id)}
                                        className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 flex-1 justify-center sm:flex-initial ${
                                            statusFilter === tab.id
                                                ? 'bg-white text-slate-900 shadow-xs font-bold'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                                        }`}
                                    >
                                        <span className="sm:hidden">{tab.label}</span>
                                        <span className="hidden sm:inline">{tab.fullLabel}</span>
                                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                            statusFilter === tab.id ? 'bg-slate-100 text-slate-800' : 'bg-slate-300/70 text-slate-600'
                                        }`}>
                                            {tab.count}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Mobile Search Bar */}
                            <div className="md:hidden relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
                                <input 
                                    type="text" 
                                    placeholder="Search by customer or ref..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
                                />
                                {searchTerm && (
                                    <button 
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 p-0.5"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* List Section */}
                        {loading ? (
                            <div className="bg-white rounded-xl border border-slate-200/80 p-16 flex flex-col items-center justify-center gap-3">
                                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-xs font-semibold text-slate-500">Loading payment submissions...</p>
                            </div>
                        ) : filteredPayments.length === 0 ? (
                            <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center">
                                <div className="w-14 h-14 bg-slate-50 border border-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3.5 shadow-sm">
                                    <ShieldCheck size={28} className="text-slate-400" />
                                </div>
                                <h3 className="text-base font-bold text-slate-800 mb-1">
                                    {searchTerm ? 'No matching submissions' : 'No payments found'}
                                </h3>
                                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                    {searchTerm 
                                        ? `No payment records matched "${searchTerm}". Try a different name or reference number.`
                                        : 'When customers make payments using your shared payment link, their proof submissions will appear here for verification.'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredPayments.map((payment) => {
                                    const isPending = payment.status === 'pending';
                                    const isApproved = payment.status === 'approved';
                                    const isRejected = payment.status === 'rejected';
                                    const customer = customersMap[payment.customerId];
                                    const photo = customer?.photoURL || payment.customerPhoto || payment.photoURL;

                                    return (
                                        <div 
                                            key={payment.id}
                                            className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                                                isPending 
                                                    ? 'border-amber-200/90 shadow-sm hover:border-amber-300' 
                                                    : 'border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-sm'
                                            }`}
                                        >
                                            <div className="p-3.5 sm:p-4 md:p-5 flex flex-col gap-3">
                                                
                                                {/* Top Row: Avatar + Info + Amount & Status */}
                                                <div className="flex items-center justify-between gap-3">
                                                    
                                                    {/* Avatar & Customer Details */}
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div 
                                                            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs overflow-hidden border border-slate-100"
                                                            style={{ backgroundColor: !photo ? getInitialColor(payment.customerName) : '#f8fafc' }}
                                                        >
                                                            {photo ? (
                                                                <img 
                                                                    src={photo} 
                                                                    alt={payment.customerName} 
                                                                    className="w-full h-full object-cover" 
                                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                                />
                                                            ) : (
                                                                <span>{payment.customerName?.charAt(0).toUpperCase() || 'C'}</span>
                                                            )}
                                                        </div>

                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 truncate leading-snug">
                                                                    {payment.customerName}
                                                                </h3>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 mt-0.5">
                                                                <span className="whitespace-nowrap">{formatDateTime(payment.timestamp)}</span>
                                                                {payment.customerEmail && (
                                                                    <span className="hidden sm:inline text-slate-400 truncate">• {payment.customerEmail}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Amount & Status Badge */}
                                                    <div className="flex flex-col items-end shrink-0 pl-1">
                                                        <span className="text-base sm:text-lg md:text-xl font-black text-slate-900 tracking-tight leading-tight">
                                                            ₹{Number(payment.amount).toLocaleString('en-IN')}
                                                        </span>
                                                        
                                                        <div className="mt-1">
                                                            {isPending && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                                                    Pending
                                                                </span>
                                                            )}
                                                            {isApproved && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                                                    <CheckCircle2 size={11} className="text-emerald-600" />
                                                                    Approved
                                                                </span>
                                                            )}
                                                            {isRejected && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
                                                                    <XCircle size={11} className="text-rose-500" />
                                                                    Rejected
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Middle Row: Ref ID Chip & Receipt Preview */}
                                                <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100 bg-slate-50/60 -mx-3.5 -mb-3.5 p-3 sm:-mx-4 sm:-mb-4 sm:p-3 md:-mx-5 md:-mb-5 md:p-3.5 rounded-b-2xl">
                                                    {/* Ref / UTR */}
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">Ref:</span>
                                                        {payment.transactionId && payment.transactionId !== 'NOT_PROVIDED' ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCopyRef(payment.transactionId, payment.id)}
                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200/70 text-slate-700 font-mono text-[11px] font-semibold transition-colors active:scale-95 group max-w-[150px] sm:max-w-[200px]"
                                                                title="Click to copy Transaction ID"
                                                            >
                                                                <span className="truncate">{payment.transactionId}</span>
                                                                {copiedId === payment.id ? (
                                                                    <Check size={11} className="text-emerald-600 shrink-0" />
                                                                ) : (
                                                                    <Copy size={10} className="text-slate-400 group-hover:text-slate-600 shrink-0" />
                                                                )}
                                                            </button>
                                                        ) : (
                                                            <span className="text-[11px] text-slate-400 italic">None</span>
                                                        )}
                                                    </div>

                                                    {/* Screenshot / Ledger Link / Actions */}
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {payment.screenshot ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => setViewImage(payment.screenshot)}
                                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200/80 hover:border-blue-300 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-semibold transition-all shadow-xs group"
                                                            >
                                                                <div className="w-4 h-4 rounded overflow-hidden bg-slate-100 shrink-0">
                                                                    <img 
                                                                        src={payment.screenshot} 
                                                                        alt="" 
                                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform" 
                                                                    />
                                                                </div>
                                                                <span>View Proof</span>
                                                                <Eye size={12} className="text-slate-400 group-hover:text-blue-600" />
                                                            </button>
                                                        ) : null}

                                                        {!isPending && (
                                                            <button 
                                                                onClick={() => navigate('/customers', { state: { selectedCustomerId: payment.customerId } })}
                                                                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 px-2.5 py-1 rounded-lg transition-colors"
                                                            >
                                                                <span>Ledger</span>
                                                                <ArrowRight size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Bottom Actions if Pending */}
                                                {isPending && (
                                                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 mt-1">
                                                        <button
                                                            onClick={() => handleReject(payment)}
                                                            disabled={processing === payment.id}
                                                            className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors active:scale-95 disabled:opacity-50 text-center"
                                                        >
                                                            Reject
                                                        </button>
                                                        <button
                                                            onClick={() => handleApprove(payment)}
                                                            disabled={processing === payment.id}
                                                            className="flex-[2] py-2 px-3 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                                                        >
                                                            <Check size={14} strokeWidth={2.5} />
                                                            <span>{processing === payment.id ? 'Approving...' : 'Approve & Record Entry'}</span>
                                                        </button>
                                                    </div>
                                                )}

                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </main>
            </div>

            <BottomNav />

            {/* Proof Preview Modal */}
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
                        alt="Payment Proof Fullscreen" 
                        className="max-w-full max-h-[82vh] object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};

export default PaymentsDashboard;
