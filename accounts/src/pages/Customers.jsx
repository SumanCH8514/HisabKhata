import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import CustomerDrawer from '../components/CustomerDrawer';
import TransactionDrawer from '../components/TransactionDrawer';
import EntryDetailsDrawer from '../components/EntryDetailsDrawer';
import PartyProfileDrawer from '../components/PartyProfileDrawer';
import BottomNav from '../components/BottomNav';
import FilterDrawer from '../components/FilterDrawer';
import { dbService } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Customers = () => {
    const { currentUser, globalSettings, sendVerification } = useAuth();
    const [verificationSent, setVerificationSent] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterBy, setFilterBy] = useState('');
    const [sortBy, setSortBy] = useState('recent');
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
    const [isCustomerDrawerOpen, setIsCustomerDrawerOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [selectedCustomerTransactions, setSelectedCustomerTransactions] = useState([]);
    const [txLoading, setTxLoading] = useState(false);
    const [totalGet, setTotalGet] = useState(0);
    const [totalGive, setTotalGive] = useState(0);
    const [isTransactionDrawerOpen, setIsTransactionDrawerOpen] = useState(false);
    const [transactionType, setTransactionType] = useState('gave');
    const [activeTab, setActiveTab] = useState('customers'); // 'customers' | 'suppliers'
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [isEntryDetailsOpen, setIsEntryDetailsOpen] = useState(false);
    const [isPartyProfileOpen, setIsPartyProfileOpen] = useState(false);
    const [showContactDetails, setShowContactDetails] = useState(false);

    useEffect(() => {
        if (!currentUser) return;

        const unsubscribe = dbService.listenUserCustomers(currentUser.uid, (data) => {
            setCustomers(data);
            let get = 0;
            let give = 0;
            data.forEach(c => {
                if ((c.balance || 0) < 0) get += Math.abs(c.balance);
                else give += c.balance || 0;
            });
            setTotalGet(get);
            setTotalGive(give);
            setLoading(false);
        });

        return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
    }, [currentUser]);

    // Load transactions for selected customer
    useEffect(() => {
        if (!selectedCustomer) return;
        setTxLoading(true);
        const unsub = dbService.listenCustomerTransactions(selectedCustomer.id, (data) => {
            // Sort by timestamp descending (latest first)
            const sorted = data.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

            // Calculate running balances for display if missing in DB
            let currentRunning = selectedCustomer.balance || 0;
            const withBalance = sorted.map(tx => {
                const txWithBal = { ...tx };
                // If DB doesn't have balance, use calculated one
                if (txWithBal.balance === undefined || txWithBal.balance === null) {
                    txWithBal.balance = currentRunning;
                    // Subtract this transaction's amount to get the balance BEFORE this transaction
                    currentRunning -= (tx.amount || 0);
                }
                return txWithBal;
            });

            setSelectedCustomerTransactions(withBalance);
            setTxLoading(false);
        });
        return () => { if (typeof unsub === 'function') unsub(); };
    }, [selectedCustomer?.id]);

    // Apply search/filter/sort
    let filteredCustomers = customers.filter(c =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone?.includes(searchQuery)
    );
    if (filterBy === 'youllget') filteredCustomers = filteredCustomers.filter(c => (c.balance || 0) < 0);
    if (filterBy === 'youllgive') filteredCustomers = filteredCustomers.filter(c => (c.balance || 0) > 0);
    // Sort logic
    if (sortBy === 'name') filteredCustomers = [...filteredCustomers].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (sortBy === 'amount-high') filteredCustomers = [...filteredCustomers].sort((a, b) => Math.abs(b.balance || 0) - Math.abs(a.balance || 0));
    if (sortBy === 'amount-low') filteredCustomers = [...filteredCustomers].sort((a, b) => Math.abs(a.balance || 0) - Math.abs(b.balance || 0));
    if (sortBy === 'recent') {
        filteredCustomers = [...filteredCustomers].sort((a, b) => {
            const timeA = a.updatedAt || a.createdAt || 0;
            const timeB = b.updatedAt || b.createdAt || 0;
            return timeB - timeA;
        });
    }

    const handleAddEntry = (type) => {
        setTransactionType(type);
        setSelectedTransaction(null);
        setIsTransactionDrawerOpen(true);
    };

    const handleEntryClick = (tx) => {
        setSelectedTransaction(tx);
        setIsEntryDetailsOpen(true);
    };

    const handleEditEntry = (tx) => {
        setTransactionType(tx.type === 'GOT' ? 'got' : 'gave');
        setSelectedTransaction(tx);
        setIsEntryDetailsOpen(false);
        setIsTransactionDrawerOpen(true);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleCopyLink = () => {
        if (!selectedCustomer) return;
        const shareLink = `${window.location.origin}/customer/share/${selectedCustomer.id}`;
        navigator.clipboard.writeText(shareLink).then(() => {
            alert('Shareable link copied to clipboard!');
        });
    };

    const handleWhatsappReminder = () => {
        if (!selectedCustomer) return;
        const balance = Math.abs(selectedCustomer.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
        const shareLink = `${window.location.origin}/customer/share/${selectedCustomer.id}`;
        const isReceivable = (selectedCustomer.balance || 0) < 0;

        const wavingHand = String.fromCodePoint(0x1F44B);
        const megaphone = String.fromCodePoint(0x1F4E2);
        const linkIcon = String.fromCodePoint(0x1F517);
        const pray = String.fromCodePoint(0x1F64F);
        const documentIcon = String.fromCodePoint(0x1F4D1);

        let message = '';
        if (isReceivable) {
            message = `${wavingHand} *Hello ${selectedCustomer.name},*\n\n` +
                `${megaphone} *Payment Reminder from HisabKhata Web*\n\n` +
                `Your outstanding balance is: *₹${balance}*\n\n` +
                `${linkIcon} *View your full digital statement here:*\n` +
                `${shareLink}\n\n` +
                `${pray} Please verify your transactions. Thank you!`;
        } else {
            message = `${wavingHand} *Hello ${selectedCustomer.name},*\n\n` +
                `${documentIcon} *Statement Update from Hisab Khata*\n\n` +
                `Please find your latest digital ledger statement here:\n` +
                `${linkIcon} ${shareLink}\n\n` +
                `Current balance: *₹${balance}*\n\n` +
                `${pray} Thank you!`;
        }

        const encodedMsg = encodeURIComponent(message);
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${selectedCustomer.phone ? '91' + selectedCustomer.phone : ''}&text=${encodedMsg}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleSMSReminder = () => {
        if (!selectedCustomer) return;
        const balance = Math.abs(selectedCustomer.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
        const shareLink = `${window.location.origin}/customer/share/${selectedCustomer.id}`;
        const isReceivable = (selectedCustomer.balance || 0) < 0;

        let message = "";
        if (isReceivable) {
            message = `Hello ${selectedCustomer.name}, Payment Reminder. Your outstanding balance is: ₹${balance}. View full statement here: ${shareLink}`;
        } else {
            message = `Hello ${selectedCustomer.name}, your latest statement from Hisab Khata is ready. View it here: ${shareLink}`;
        }

        const smsUrl = `sms:+91${selectedCustomer.phone}?body=${encodeURIComponent(message)}`;
        window.open(smsUrl, '_blank');
    };

    const handleResendVerification = async () => {
        setVerifying(true);
        try {
            await sendVerification();
            setVerificationSent(true);
            setTimeout(() => setVerificationSent(false), 5000);
        } catch (error) {
            console.error('Failed to resend verification:', error);
        } finally {
            setVerifying(false);
        }
    };

    const getInitialColor = (name) => {
        const colors = ['#ef5350', '#ec407a', '#ab47bc', '#7e57c2', '#5c6bc0', '#42a5f5', '#26c6da', '#26a69a', '#66bb6a', '#d4e157', '#ffa726', '#ff7043'];
        const idx = (name?.charCodeAt(0) || 0) % colors.length;
        return colors[idx];
    };

    return (
        <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#f5f5f5' }}>
            <Sidebar />

            {/* Main content area */}
            <div className="flex flex-col flex-1 ml-0 md:ml-[260px] overflow-hidden relative">
                
                {/* Email Verification Banner */}
                {currentUser && !currentUser.emailVerified && (
                    <div className="bg-orange-50 border-b border-orange-100 px-4 py-2 flex items-center justify-between z-30">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-orange-500 text-lg">warning</span>
                            <p className="text-xs text-orange-800 font-medium">
                                Please verify your email to secure your account.
                            </p>
                        </div>
                        <button 
                            onClick={handleResendVerification}
                            disabled={verifying || verificationSent}
                            className={`text-xs font-bold px-3 py-1 rounded transition-all ${
                                verificationSent 
                                ? 'text-green-600 bg-green-50' 
                                : 'text-orange-600 hover:bg-orange-100 bg-white border border-orange-200'
                            }`}
                        >
                            {verifying ? 'Sending...' : verificationSent ? 'Email Sent!' : 'Resend Email'}
                        </button>
                    </div>
                )}

                <div className="flex flex-1 overflow-hidden relative">

                {/* Middle pane: Customer List — ~640px like Khatabook */}
                <div className={`flex flex-col w-full md:w-[640px] bg-white border-r border-gray-200 flex-shrink-0 ${selectedCustomer ? 'hidden md:flex' : 'flex'}`}>

                    {/* Mobile Header — Branding */}
                    <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-[#0057BB] rounded flex items-center justify-center">
                                <span className="material-symbols-outlined text-white text-[20px]">account_balance_wallet</span>
                            </div>
                            <h1 className="text-[#0057BB] font-black text-[19px] tracking-tight">Hisab Khata <span className="text-orange-500 italic">PRO</span></h1>
                        </div>
                    </div>

                    {/* Tab bar — Desktop only */}
                    <div className="hidden md:flex border-b border-gray-200 bg-white">
                        <button
                            onClick={() => setActiveTab('customers')}
                            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'customers' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Customers
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${activeTab === 'customers' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                                }`}>
                                {customers.length}
                            </span>
                        </button>
                    </div>

                    {/* Summary bar — Desktop View */}
                    {globalSettings?.analytics !== false && (
                        <div className="hidden md:flex items-center px-4 py-2.5 bg-white border-b border-gray-100 gap-5 flex-wrap">
                            <div className="flex items-center gap-1.5">
                                <span className="text-gray-700 text-sm">You'll Give:</span>
                                <span className="text-green-600 font-semibold text-sm">₹{totalGive.toLocaleString('en-IN')}</span>
                                <span className="text-green-500 text-[13px] font-bold">↗</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-gray-700 text-sm">You'll Get:</span>
                                <span className="text-red-500 font-semibold text-sm">₹{totalGet.toLocaleString('en-IN')}</span>
                                {/* SW arrow — rendered as SVG to avoid font substitution */}
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="inline-block">
                                    <path d="M9 3L3 9M3 9H7.5M3 9V4.5" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <Link to="/reports" className="ml-auto flex items-center gap-1.5 px-3 py-1.5 border border-blue-500 rounded text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors whitespace-nowrap">
                                <span className="material-symbols-outlined text-[15px]">bar_chart</span>
                                View Report
                            </Link>
                        </div>
                    )}

                    {/* Summary Cards — Mobile View */}
                    {globalSettings?.analytics !== false && (
                        <div className="md:hidden grid grid-cols-2 gap-3 px-4 py-4 bg-gray-50 border-b border-gray-100">
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center">
                                <span className="text-gray-500 text-[11px] font-semibold uppercase tracking-wider mb-1">You'll Give</span>
                                <span className="text-green-600 font-bold text-lg">₹{totalGive.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center">
                                <span className="text-gray-500 text-[11px] font-semibold uppercase tracking-wider mb-1">You'll Get</span>
                                <span className="text-red-500 font-bold text-lg">₹{totalGet.toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    )}

                    {/* Search + Filter + Sort Section */}
                    <div className="px-4 py-3 bg-white border-b border-gray-100">
                        {/* Mobile View: Modern Single Bar */}
                        <div className="md:hidden flex items-center gap-3">
                            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
                                <span className="material-symbols-outlined text-[#0051bb] text-[22px] font-bold">search</span>
                                <input
                                    type="text"
                                    placeholder="Search Customer"
                                    className="flex-1 bg-transparent text-sm font-bold text-slate-600 outline-none placeholder:text-slate-400"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                                <div className="h-6 w-[1px] bg-slate-200 mx-1"></div>
                                <button 
                                    onClick={() => setIsFilterDrawerOpen(true)}
                                    className="flex flex-col items-center gap-0.5 group active:scale-95 transition-transform"
                                >
                                    <span className="material-symbols-outlined text-[#0051bb] text-[22px]">filter_alt</span>
                                    <span className="text-[9px] font-black text-[#0051bb] uppercase tracking-tighter">Filters</span>
                                </button>
                            </div>
                        </div>

                        {/* Desktop View: Khatabook 2-row layout */}
                        <div className="hidden md:block">
                            {/* Top row: label texts */}
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="flex-1 text-xs text-gray-600">Search for customers</span>
                                <span className="text-xs text-gray-600" style={{ minWidth: '120px' }}>Filter By</span>
                                <span className="text-xs text-gray-600" style={{ minWidth: '110px' }}>Sort By</span>
                            </div>
                            {/* Bottom row: inputs */}
                            <div className="flex items-center gap-2">
                                {/* Search input */}
                                <div className="relative flex-1">
                                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[17px]">search</span>
                                    <input
                                        type="text"
                                        placeholder="Name or Phone Number"
                                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-300 rounded text-sm outline-none focus:border-blue-400 transition-all"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                {/* Filter By */}
                                <div className="relative">
                                    <select
                                        className="pl-7 pr-6 py-1.5 text-sm border border-gray-300 rounded bg-white text-gray-500 outline-none appearance-none cursor-pointer bg-none"
                                        value={filterBy}
                                        onChange={e => setFilterBy(e.target.value)}
                                        style={{ minWidth: '120px' }}
                                    >
                                        <option value="">Select</option>
                                        <option value="youllget">You'll Get</option>
                                        <option value="youllgive">You'll Give</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-[15px] pointer-events-none">filter_list</span>
                                    <span className="material-symbols-outlined absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 text-[15px] pointer-events-none">expand_more</span>
                                </div>
                                {/* Sort By */}
                                <div className="relative">
                                    <select
                                        className="pl-7 pr-6 py-1.5 text-sm border border-gray-300 rounded bg-white text-gray-500 outline-none appearance-none cursor-pointer bg-none"
                                        value={sortBy}
                                        onChange={e => setSortBy(e.target.value)}
                                        style={{ minWidth: '110px' }}
                                    >
                                        <option value="">Select</option>
                                        <option value="name">Name (A-Z)</option>
                                        <option value="amount-high">Amount (High)</option>
                                        <option value="amount-low">Amount (Low)</option>
                                        <option value="recent">Most Recent</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-[15px] pointer-events-none">swap_vert</span>
                                    <span className="material-symbols-outlined absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 text-[15px] pointer-events-none">expand_more</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Column headers */}
                    <div className="flex items-center px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex-1">Name</span>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</span>
                    </div>

                    {/* Customer list */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-32 text-gray-400 gap-2">
                                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-xs">Loading...</p>
                            </div>
                        ) : filteredCustomers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-center text-gray-400">
                                <span className="material-symbols-outlined text-5xl mb-2 opacity-30">person_search</span>
                                <p className="text-sm">No customers found</p>
                            </div>
                        ) : filteredCustomers.map(customer => {
                            const balance = customer?.balance || 0;
                            const isReceivable = balance < 0;
                            const isZero = balance === 0;
                            const balanceAbsolute = Math.abs(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 });
                            const bgColor = getInitialColor(customer.name);
                            const isSelected = selectedCustomer?.id === customer.id;

                            return (
                                <div
                                    key={customer.id}
                                    onClick={() => setSelectedCustomer(customer)}
                                    className={`flex items-center gap-4 px-4 py-3.5 cursor-pointer border-b border-gray-50 transition-all hover:bg-gray-50 active:bg-gray-100 ${isSelected ? 'bg-blue-50/50' : 'bg-white'}`}
                                >
                                    {/* Avatar with dynamic initial */}
                                    <div
                                        className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-sm"
                                        style={{ backgroundColor: bgColor }}
                                    >
                                        {customer.name?.substring(0, 1).toUpperCase()}
                                    </div>

                                    {/* Name and Time */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[15px] font-semibold text-gray-900 truncate mb-0.5">
                                            {customer.name}
                                        </p>
                                        <div className="flex items-center gap-1.5 text-gray-400">
                                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                                            <span className="text-[11px] font-medium uppercase tracking-wide">
                                                {customer.updatedAt
                                                    ? formatTimeAgo(customer.updatedAt)
                                                    : customer.createdAt
                                                        ? formatTimeAgo(customer.createdAt)
                                                        : 'Just now'
                                                }
                                            </span>
                                        </div>
                                    </div>

                                    {/* Amount and Status */}
                                    <div className="text-right flex-shrink-0">
                                        {isZero ? (
                                            <p className="text-sm font-bold text-gray-400">₹0</p>
                                        ) : (
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-center gap-1">
                                                    <span className={`text-[15px] font-black ${isReceivable ? 'text-red-500' : 'text-green-600'}`}>
                                                        ₹{balanceAbsolute}
                                                    </span>
                                                    <span className={`material-symbols-outlined text-[16px] ${isReceivable ? 'text-red-400' : 'text-green-500'}`}>
                                                        {isReceivable ? 'south_east' : 'north_east'}
                                                    </span>
                                                </div>
                                                <span className={`text-[9px] font-extrabold uppercase tracking-widest mt-0.5 px-1.5 py-0.5 rounded-sm ${isReceivable ? 'bg-red-50 text-red-400' : 'bg-green-50 text-green-500'}`}>
                                                    {isReceivable ? "You'll Get" : "You'll Give"}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Mobile Add Customer FAB — Matches Khatabook perfectly */}
                    <div className="md:hidden fixed bottom-20 right-4 z-20">
                        <button
                            onClick={() => setIsCustomerDrawerOpen(true)}
                            className="bg-[#0057BB] text-white flex items-center gap-2 px-5 py-3.5 rounded-full shadow-lg shadow-blue-200 active:scale-95 transition-transform"
                        >
                            <span className="material-symbols-outlined text-[22px]">person_add</span>
                            <span className="text-sm font-bold uppercase tracking-wide">Add Customer</span>
                        </button>
                    </div>

                    {/* Bottom actions — Desktop only */}
                    <div className="hidden md:flex p-4 bg-white border-t border-gray-200 gap-3">
                        <button
                            className="flex-1 py-2.5 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
                        >
                            <span className="material-symbols-outlined text-[18px]">upload</span>
                            Bulk Upload Customers
                        </button>
                        <button
                            onClick={() => { setIsCustomerDrawerOpen(true); }}
                            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 rounded text-sm font-semibold text-white transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                        >
                            <span className="material-symbols-outlined text-[18px]">add</span>
                            Add Customer
                        </button>
                    </div>

                </div>

                {/* Right pane: Ledger detail */}
                <div className={`flex-1 flex flex-col bg-white overflow-hidden ${!selectedCustomer ? 'hidden md:flex' : 'flex'}`}>
                    {!selectedCustomer ? (
                        /* Empty state — matches Khatabook's two-person placeholder */
                        <div className="flex-1 flex flex-col items-center justify-center" style={{ backgroundColor: '#eff2f5' }}>
                            <div className="mb-3" style={{ color: '#b0bec5' }}>
                                <svg width="72" height="64" viewBox="0 0 72 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="26" cy="20" r="14" stroke="#b0bec5" strokeWidth="3" />
                                    <path d="M4 58c0-12.15 9.85-22 22-22s22 9.85 22 22" stroke="#b0bec5" strokeWidth="3" strokeLinecap="round" />
                                    <circle cx="52" cy="20" r="11" stroke="#b0bec5" strokeWidth="3" />
                                    <path d="M40 58c0-9.4 5.4-17.5 13.2-21.4" stroke="#b0bec5" strokeWidth="3" strokeLinecap="round" />
                                </svg>
                            </div>
                            <p className="text-gray-500 text-sm font-medium">No customer selected</p>
                        </div>
                    ) : (
                        <>
                            {/* Mobile-Only Blue Header */}
                            <div className="md:hidden flex flex-col bg-[#0057BB] text-white">
                                <div className="flex items-center justify-between px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setSelectedCustomer(null)} className="p-1 -ml-1 text-white">
                                            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                                        </button>
                                        <div className="w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden flex-shrink-0">
                                            <div
                                                className="w-full h-full flex items-center justify-center font-bold text-lg"
                                                style={{ backgroundColor: getInitialColor(selectedCustomer.name) }}
                                            >
                                                {selectedCustomer.name?.substring(0, 1).toUpperCase()}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h2 className="font-bold text-base leading-tight">{selectedCustomer.name}</h2>
                                            </div>
                                            <button onClick={() => setIsPartyProfileOpen(true)} className="text-xs text-white/80 hover:text-white transition-colors flex items-center gap-0.5">
                                                View settings
                                                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                                            </button>
                                        </div>
                                    </div>
                                    <button className="p-2 text-white">
                                        <span className="material-symbols-outlined text-[24px]">call</span>
                                    </button>
                                </div>

                                {/* Summary Card — White box inside blue header area on mobile */}
                                <div className="px-4 pb-4">
                                    <div className="bg-white rounded-lg shadow-sm overflow-hidden text-gray-900">
                                        <div className="px-4 py-4 flex items-center justify-between border-b border-gray-100">
                                            <span className="text-sm font-semibold text-gray-700">
                                                {selectedCustomer.balance > 0 ? 'You will give' : 'You will get'}
                                            </span>
                                            <span className={`text-xl font-bold ${selectedCustomer.balance > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                ₹{Math.abs(selectedCustomer.balance || 0).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                        <div className="px-4 py-2.5 flex items-center justify-between bg-blue-50/30">
                                            <div className="flex items-center gap-2 text-[#0057BB]">
                                                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                                                <span className="text-[11px] font-bold uppercase tracking-wide">Set collection reminder</span>
                                            </div>
                                            <button className="text-[11px] font-bold text-[#0057BB] uppercase">SET DATE</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Desktop Detail Header */}
                            <div className="hidden md:flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0 overflow-hidden border-2 border-white shadow-sm"
                                        style={{ backgroundColor: !selectedCustomer.photoURL ? getInitialColor(selectedCustomer.name) : 'transparent' }}
                                    >
                                        {selectedCustomer.photoURL ? (
                                            <img src={selectedCustomer.photoURL} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            selectedCustomer.name?.substring(0, 1).toUpperCase()
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="font-semibold text-gray-900 text-base leading-snug">{selectedCustomer.name}</h2>
                                            <button 
                                                onClick={() => setShowContactDetails(!showContactDetails)}
                                                className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                                                title={showContactDetails ? "Hide contact info" : "Show contact info"}
                                            >
                                                <span className="material-symbols-outlined text-[18px]">
                                                    {showContactDetails ? 'visibility' : 'visibility_off'}
                                                </span>
                                            </button>
                                        </div>
                                        {showContactDetails && (
                                            <>
                                                {selectedCustomer.phone && (
                                                    <p className="text-xs text-gray-500 mt-0.5">+91 {selectedCustomer.phone}</p>
                                                )}
                                                {selectedCustomer.email && (
                                                    <p className="text-[11px] text-gray-400 leading-tight">{selectedCustomer.email}</p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <button 
                                        onClick={() => { if(selectedCustomer.phone) window.location.href = `tel:+91${selectedCustomer.phone}`; }}
                                        className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm group"
                                        title="Call Customer"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">call</span>
                                    </button>
                                    <button 
                                        onClick={() => { if(selectedCustomer.email) window.location.href = `mailto:${selectedCustomer.email}`; }}
                                        className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all shadow-sm group"
                                        title="Email Statement"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">mail</span>
                                    </button>
                                    <button
                                        onClick={() => setIsPartyProfileOpen(true)}
                                        className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all shadow-sm"
                                        title="Customer Settings"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">settings</span>
                                    </button>
                                </div>
                            </div>

                            {/* Mobile Action Buttons (Report, Reminder, SMS) */}
                            <div className="md:hidden grid grid-cols-4 bg-white border-b border-gray-100 py-3">
                                <button className="flex flex-col items-center gap-1 group">
                                    <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-blue-600 group-hover:bg-blue-50 transition-colors">
                                        <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
                                    </div>
                                    <span className="text-[11px] font-medium text-gray-600">Report</span>
                                </button>
                                {globalSettings?.shareLinks !== false && (
                                    <>
                                        <button
                                            onClick={handleWhatsappReminder}
                                            className="flex flex-col items-center gap-1 group"
                                        >
                                            <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-[#25D366] group-hover:bg-green-50 transition-colors">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                            </div>
                                            <span className="text-[11px] font-medium text-gray-600">Reminder</span>
                                        </button>
                                        <button
                                            onClick={handleSMSReminder}
                                            className="flex flex-col items-center gap-1 group"
                                        >
                                            <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-orange-500 group-hover:bg-orange-50 transition-colors">
                                                <span className="material-symbols-outlined text-[20px]">sms</span>
                                            </div>
                                            <span className="text-[11px] font-medium text-gray-600">SMS</span>
                                        </button>
                                        <button
                                            onClick={handleCopyLink}
                                            className="flex flex-col items-center gap-1 group"
                                        >
                                            <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-[#0057BB] group-hover:bg-blue-50 transition-colors">
                                                <span className="material-symbols-outlined text-[20px]">link</span>
                                            </div>
                                            <span className="text-[11px] font-medium text-gray-600">Copy Link</span>
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Set Due Date row — Desktop only */}
                            <div className="hidden md:flex items-center px-6 py-2.5 bg-white border-b border-gray-100">
                                <div className="flex items-center gap-2 flex-1">
                                    <span className="material-symbols-outlined text-gray-400 text-[16px]">timer</span>
                                    <span className="text-xs text-gray-600 font-medium">Set Due Date:</span>
                                    {['7 days', '14 days', '30 days'].map(d => (
                                        <button key={d} className="px-2.5 py-1 border border-gray-300 rounded text-xs text-gray-600 hover:bg-gray-50 transition-colors">{d}</button>
                                    ))}
                                    <button className="px-2.5 py-1 border border-gray-300 rounded text-xs text-gray-600 hover:bg-gray-50 transition-colors">Select Date</button>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">NET BALANCE:</p>
                                    {(selectedCustomer.balance || 0) === 0 ? (
                                        <p className="text-gray-600 font-semibold text-sm">₹0.00</p>
                                    ) : (selectedCustomer.balance || 0) < 0 ? (
                                        <p className="text-red-500 font-semibold text-sm">You'll Get: ₹{Math.abs(selectedCustomer.balance).toLocaleString('en-IN')}</p>
                                    ) : (
                                        <p className="text-green-600 font-semibold text-sm">You'll Give: ₹{Math.abs(selectedCustomer.balance).toLocaleString('en-IN')}</p>
                                    )}
                                </div>
                            </div>

                            {/* Desktop Action Bar — Professional & Modern */}
                            <div className="hidden md:flex items-center px-6 py-1 bg-white border-b border-gray-200 gap-8">
                                <div className="flex items-center gap-1.5 text-xs text-gray-600 font-bold uppercase tracking-wider">
                                    <span>Send Reminder</span>
                                    <span className="material-symbols-outlined text-gray-400 text-[16px]">info</span>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Report */}
                                    <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-all">
                                        <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                                        Report
                                    </button>

                                    {globalSettings?.shareLinks !== false && (
                                        <>
                                            {/* WhatsApp */}
                                            <button onClick={handleWhatsappReminder} className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded text-xs font-semibold text-green-700 hover:bg-green-100 transition-all">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                                Whatsapp
                                            </button>

                                            {/* SMS */}
                                            <button onClick={handleSMSReminder} className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded text-xs font-semibold text-orange-700 hover:bg-orange-100 transition-all">
                                                <span className="material-symbols-outlined text-[18px]">sms</span>
                                                SMS
                                            </button>

                                            {/* Copy Link */}
                                            <button onClick={handleCopyLink} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-all">
                                                <span className="material-symbols-outlined text-[18px]">link</span>
                                                Copy Link
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Entries column headers — Desktop Styled */}
                            <div className="hidden md:grid grid-cols-12 px-6 py-2.5 bg-gray-50 border-b border-gray-200">
                                <div className="col-span-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Entries</div>
                                <div className="col-span-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">You Gave</div>
                                <div className="col-span-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">You Got</div>
                            </div>

                            {/* Entries column headers — Mobile Styled */}
                            <div className="md:hidden grid grid-cols-[1fr_80px_80px] bg-[#F8F9FA] border-b border-gray-100 py-3 px-4">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ENTRIES</span>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">YOU GAVE</span>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">YOU GOT</span>
                            </div>

                            {/* Transaction list */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#F5F7F9]">
                                {txLoading ? (
                                    <div className="flex items-center justify-center h-32">
                                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : selectedCustomerTransactions.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                                        <span className="material-symbols-outlined text-5xl mb-2">receipt_long</span>
                                        <p className="text-gray-400 text-sm">No entries yet</p>
                                    </div>
                                ) : selectedCustomerTransactions.map(tx => {
                                    // Determine if "gave" or "got"
                                    const isGave = tx.amount < 0 || tx.type === 'GAVE' || tx.type === 'credit';
                                    const absAmount = Math.abs(tx.amount);
                                    const txDate = tx.timestamp
                                        ? new Date(tx.timestamp)
                                        : tx.date
                                            ? new Date(tx.date)
                                            : null;

                                    // Format date like Khatabook: "12 May 2026 • 02:14 AM" (bullet separator)
                                    const formattedDate = txDate ? (() => {
                                        const d = txDate;
                                        const day = d.getDate().toString().padStart(2, '0');
                                        const mon = d.toLocaleString('en-IN', { month: 'short' });
                                        const yr = d.getFullYear();
                                        let h = d.getHours(); const m = d.getMinutes().toString().padStart(2, '0');
                                        const ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
                                        return `${day} ${mon} ${yr} • ${h.toString().padStart(2, '0')}:${m} ${ampm}`;
                                    })() : 'N/A';

                                    return (
                                        <div key={tx.id}>
                                            {/* Date Header for Mobile — Center Pill */}
                                            <div className="md:hidden flex justify-center py-4 bg-[#F5F7F9]">
                                                <div className="px-4 py-1.5 bg-white border border-gray-200 rounded-full shadow-sm">
                                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                                        {txDate ? (() => {
                                                            const d = txDate;
                                                            const day = d.getDate().toString().padStart(2, '0');
                                                            const mon = d.toLocaleString('en-IN', { month: 'short' });
                                                            const yr = d.getFullYear().toString().slice(-2);
                                                            const timeAgo = formatTimeAgo(d.getTime());
                                                            return `${day} ${mon} ${yr} • ${timeAgo}`;
                                                        })() : 'N/A'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Transaction Card */}
                                            <div
                                                onClick={() => handleEntryClick(tx)}
                                                className="md:grid md:grid-cols-12 px-0 md:px-6 py-0 md:py-3.5 border-b border-gray-100 hover:bg-gray-50/50 transition-colors items-start cursor-pointer group bg-white mx-0 md:mx-0 shadow-sm md:shadow-none"
                                            >
                                                {/* Desktop Layout */}
                                                <div className="hidden md:block col-span-6">
                                                    <p className="text-sm font-medium text-gray-800">{formattedDate}</p>
                                                    {tx.balance != null && (
                                                        <p className="text-xs text-gray-400 mt-0.5">Balance: {(tx.balance || 0).toLocaleString('en-IN')}</p>
                                                    )}
                                                    {tx.description && (
                                                        <p className="text-xs text-gray-400 mt-0.5 truncate">{tx.description}</p>
                                                    )}
                                                </div>
                                                <div className="hidden md:block col-span-3 text-right pt-0.5">
                                                    {isGave
                                                        ? <p className="text-sm font-semibold text-red-500">₹{absAmount.toLocaleString('en-IN')}</p>
                                                        : <p className="text-sm text-gray-300">-</p>
                                                    }
                                                </div>
                                                <div className="hidden md:block col-span-3 text-right pt-0.5">
                                                    {!isGave
                                                        ? <p className="text-sm font-semibold text-green-600">₹{absAmount.toLocaleString('en-IN')}</p>
                                                        : <p className="text-sm text-gray-300">-</p>
                                                    }
                                                </div>

                                                {/* Mobile Layout — Pixel Perfect Three Column */}
                                                <div className="md:hidden grid grid-cols-[1fr_80px_80px] min-h-[85px] border-b border-gray-50 bg-white">
                                                    {/* Info Column */}
                                                    <div className="p-4 flex flex-col justify-center gap-1.5 min-w-0">
                                                        <p className="text-[11px] font-bold text-gray-400 leading-none">
                                                            {formattedDate}
                                                        </p>
                                                        {tx.balance != null && (
                                                            <div className={`${(tx.balance || 0) < 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'} px-1.5 py-0.5 rounded w-fit border`}>
                                                                <p className={`text-[9px] font-black ${(tx.balance || 0) < 0 ? 'text-red-400' : 'text-green-600'}`}>Bal. ₹{(tx.balance || 0).toLocaleString('en-IN')}</p>
                                                            </div>
                                                        )}
                                                        <p className="text-[13px] font-bold text-gray-700 leading-snug break-words">
                                                            {tx.description || (isGave ? 'You gave' : 'You got')}
                                                        </p>
                                                    </div>

                                                    {/* Gave Column */}
                                                    <div className={`flex items-center justify-center border-l border-gray-50 ${isGave ? 'bg-red-50/40' : ''}`}>
                                                        {isGave && <span className="text-sm font-black text-red-500">₹{absAmount.toLocaleString('en-IN')}</span>}
                                                    </div>

                                                    {/* Got Column */}
                                                    <div className={`flex items-center justify-center border-l border-gray-50 ${!isGave ? 'bg-green-50/40' : ''}`}>
                                                        {!isGave && <span className="text-sm font-black text-green-600">₹{absAmount.toLocaleString('en-IN')}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Entry buttons — Pixel Perfect Mobile */}
                            <div className="md:hidden p-3 bg-white border-t border-gray-100 flex gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                                <button
                                    onClick={() => handleAddEntry('gave')}
                                    className="flex-1 py-3.5 bg-[#D32F2F] text-white rounded-lg font-black text-sm uppercase tracking-[0.1em] shadow-lg shadow-red-100 active:scale-95 transition-transform flex items-center justify-center gap-2"
                                >
                                    YOU GAVE ₹
                                </button>
                                <button
                                    onClick={() => handleAddEntry('got')}
                                    className="flex-1 py-3.5 bg-[#2E7D32] text-white rounded-lg font-black text-sm uppercase tracking-[0.1em] shadow-lg shadow-green-100 active:scale-95 transition-transform flex items-center justify-center gap-2"
                                >
                                    YOU GOT ₹
                                </button>
                            </div>

                            {/* Entry buttons — Desktop Styled (Preserved) */}
                            <div className="hidden md:grid grid-cols-2 gap-0 border-t border-gray-200">
                                <button
                                    onClick={() => handleAddEntry('gave')}
                                    className="py-4 text-sm font-semibold text-red-500 bg-red-50 hover:bg-red-100 transition-colors border-r border-gray-200 flex items-center justify-center gap-1.5"
                                >
                                    <span className="material-symbols-outlined text-[18px]">call_made</span>
                                    You Gave ₹
                                </button>
                                <button
                                    onClick={() => handleAddEntry('got')}
                                    className="py-4 text-sm font-semibold text-green-600 bg-green-50 hover:bg-green-100 transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <span className="material-symbols-outlined text-[18px]">call_received</span>
                                    You Got ₹
                                </button>
                            </div>
                        </>
                    )}
                </div>
                </div>
            </div>

            {/* Drawers */}
            <CustomerDrawer
                isOpen={isCustomerDrawerOpen}
                onClose={() => setIsCustomerDrawerOpen(false)}
            />
            <TransactionDrawer
                isOpen={isTransactionDrawerOpen}
                onClose={() => {
                    setIsTransactionDrawerOpen(false);
                    setSelectedTransaction(null);
                }}
                customerId={selectedCustomer?.id}
                customerName={selectedCustomer?.name}
                type={transactionType}
                transaction={selectedTransaction}
                onSuccess={() => {
                    // Refresh selected customer balance
                    if (selectedCustomer?.id) {
                        dbService.getCustomer(selectedCustomer.id).then(c => {
                            if (c) setSelectedCustomer(c);
                        });
                    }
                }}
            />

            <EntryDetailsDrawer
                isOpen={isEntryDetailsOpen}
                onClose={() => setIsEntryDetailsOpen(false)}
                transaction={selectedTransaction}
                customerName={selectedCustomer?.name}
                onEdit={handleEditEntry}
            />

            <PartyProfileDrawer
                isOpen={isPartyProfileOpen}
                onClose={() => setIsPartyProfileOpen(false)}
                customer={selectedCustomer}
                onDeleteSuccess={() => setSelectedCustomer(null)}
            />

            <FilterDrawer
                isOpen={isFilterDrawerOpen}
                onClose={() => setIsFilterDrawerOpen(false)}
                filterBy={filterBy}
                setFilterBy={setFilterBy}
                sortBy={sortBy}
                setSortBy={setSortBy}
                onApply={() => setIsFilterDrawerOpen(false)}
            />

            {/* Bottom Nav — Mobile only (hide when ledger is open) */}
            {!selectedCustomer && <BottomNav />}
        </div>
    );
};

// Helper: format time ago
function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
    if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (mins > 0) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
    return 'Just now';
}

export default Customers;
