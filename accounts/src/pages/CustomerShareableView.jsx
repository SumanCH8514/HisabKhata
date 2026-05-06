import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { dbService, db } from '../services/firebase';
import { ref, onValue } from 'firebase/database';

const CustomerShareableView = () => {
    const { id } = useParams();
    const [customer, setCustomer] = useState(null);
    const [owner, setOwner] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewImage, setViewImage] = useState(null);
    const [globalSettings, setGlobalSettings] = useState(null);

    useEffect(() => {
        // Listen to global settings
        const unsubSettings = onValue(ref(db, 'settings'), (snapshot) => {
            if (snapshot.exists()) {
                setGlobalSettings(snapshot.val());
            } else {
                setGlobalSettings({});
            }
        });
        return () => unsubSettings();
    }, []);

    useEffect(() => {
        if (!id) return;

        // Listen to customer details
        const unsubCustomer = onValue(ref(db, `customers/${id}`), (snapshot) => {
            if (snapshot.exists()) {
                const customerData = { id: snapshot.key, ...snapshot.val() };
                setCustomer(customerData);

                // Fetch owner details if userId exists
                if (customerData.userId) {
                    onValue(ref(db, `users/${customerData.userId}`), (ownerSnap) => {
                        if (ownerSnap.exists()) {
                            setOwner(ownerSnap.val());
                        }
                    }, { onlyOnce: true });
                }
            }
        });

        return () => {
            if (typeof unsubCustomer === 'function') unsubCustomer();
        };
    }, [id]);

    useEffect(() => {
        if (!id || !customer) return;

        // Listen to transactions
        const unsubTransactions = dbService.listenCustomerTransactions(id, (data) => {
            // Sort by timestamp descending (latest first)
            const sorted = data.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            
            let running = customer.balance || 0;
            const withRunningBalance = sorted.map(tx => {
                const txWithBal = { ...tx, runningBalance: running };
                running -= (tx.amount || 0);
                return txWithBal;
            });
            setTransactions(withRunningBalance); // Already latest first
            setLoading(false);
        });

        return () => {
            if (typeof unsubTransactions === 'function') unsubTransactions();
        };
    }, [id, customer]);

    if (loading || !customer || globalSettings === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 antialiased font-sans">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-[#0057BB] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Loading Secure Statement...</p>
                </div>
            </div>
        );
    }

    if (globalSettings?.shareLinks === false) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center antialiased font-sans">
                <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl shadow-slate-200 border border-slate-100">
                    <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="material-symbols-outlined text-[40px]">link_off</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 mb-4">Sharing Disabled</h1>
                    <p className="text-slate-500 mb-8 leading-relaxed text-sm">
                        Public link sharing for this ledger has been temporarily disabled by the administrator. 
                        Please contact the merchant directly for statement details.
                    </p>
                    <div className="pt-6 border-t border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Security Privacy Policy Active</p>
                    </div>
                </div>
            </div>
        );
    }

    const balance = customer?.balance || 0;
    const isReceivable = balance < 0; 
    const balanceAbsolute = Math.abs(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const initials = customer.name ? customer.name.substring(0, 1).toUpperCase() : 'C';

    const totalGave = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });
    const totalGot = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen flex flex-col bg-white md:bg-[#F4F7FA] antialiased font-sans pb-20 md:pb-0">
            <style>
                {`
                @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap');
                
                body {
                    font-family: 'Roboto', sans-serif;
                }

                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    .print-container { padding: 0 !important; margin: 0 !important; border: none !important; box-shadow: none !important; }
                    .print-rounded { border-radius: 0 !important; }
                    main { padding: 0 !important; max-width: 100% !important; }
                }

                table {
                    border-collapse: collapse;
                    width: 100%;
                }

                th, td {
                    border: 1px solid #E2E8F0;
                }
                `}
            </style>

            {/* Image Preview Modal */}
            {viewImage && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-200 no-print"
                    onClick={() => setViewImage(null)}
                >
                    <button className="absolute top-6 right-6 text-white p-2 hover:bg-white/10 rounded-full transition-colors">
                        <span className="material-symbols-outlined text-[32px]">close</span>
                    </button>
                    <img 
                        src={viewImage} 
                        alt="Bill Attachment" 
                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            {/* Desktop Header */}
            <header className="hidden md:flex no-print sticky top-0 z-50 bg-white border-b border-slate-200 px-8 h-16 items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#0057BB] rounded flex items-center justify-center shadow-md">
                        <span className="material-symbols-outlined text-white text-[20px]">account_balance_wallet</span>
                    </div>
                    <div>
                        <h1 className="font-black text-slate-900 text-lg leading-tight uppercase tracking-tight">Hisab Khata</h1>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Verified Digital Ledger</p>
                    </div>
                </div>
                <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg"
                >
                    <span className="material-symbols-outlined text-[18px]">print</span>
                    Print Statement
                </button>
            </header>

            {/* Mobile Header */}
            <header className="md:hidden no-print sticky top-0 z-50 bg-[#0057BB] text-white px-4 py-4 flex flex-col gap-1 shadow-md">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-white text-[24px]">account_balance_wallet</span>
                        <h1 className="font-bold text-lg">Hisab Khata</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {owner?.phone && (
                            <a href={`tel:${owner.phone}`} className="p-1">
                                <span className="material-symbols-outlined text-[24px]">call</span>
                            </a>
                        )}
                        {owner?.email && (
                            <a href={`mailto:${owner.email}`} className="p-1">
                                <span className="material-symbols-outlined text-[24px]">mail</span>
                            </a>
                        )}
                    </div>
                </div>
                <p className="text-[10px] font-medium text-blue-100 uppercase tracking-wider">Statement: {customer.name}</p>
            </header>

            <main className="flex-1 w-full max-w-4xl mx-auto p-0 md:p-6 space-y-4 md:space-y-6 print-container">
                
                {/* Mobile Identity / Balance Card */}
                <div className="md:hidden bg-[#0057BB] text-white px-4 pb-12 pt-4">
                    <div className="flex flex-col gap-1">
                        <p className="text-xs text-blue-100 opacity-80 uppercase font-medium tracking-wider">Net Balance</p>
                        <div className="flex items-center gap-2">
                            <h2 className="text-4xl font-black">₹{balanceAbsolute}</h2>
                            <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full uppercase">
                                {isReceivable ? 'Pending' : 'Settled'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Identity Card (Desktop Only) */}
                <div className="hidden md:block bg-white rounded-2xl border border-slate-200 p-8 shadow-sm relative overflow-hidden print-rounded">
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#0057BB]"></div>
                    <div className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[#0057BB] text-2xl border border-slate-200 uppercase">
                                {initials}
                            </div>
                            <div>
                                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Account Statement For</h2>
                                <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">{customer.name}</h1>
                                <p className="text-xs font-medium text-slate-500 mt-0.5 uppercase tracking-wider">{customer.phone || 'No Phone Linked'}</p>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 min-w-[200px] print:bg-white print:border-slate-200 text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Net Balance</p>
                            <h3 className={`text-3xl font-bold ${isReceivable ? 'text-red-500' : 'text-green-600'}`}>
                                ₹{balanceAbsolute}
                            </h3>
                            <p className={`text-[10px] font-bold mt-1.5 uppercase tracking-wide ${isReceivable ? 'text-red-400' : 'text-green-500'}`}>
                                {isReceivable ? 'Pending Due Payment' : 'Settled / Credit Available'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Summary Row (Mobile Only Overlay) */}
                <div className="px-4 -mt-8 md:hidden">
                    <div className="grid grid-cols-2 bg-white p-4 rounded-xl shadow-lg border border-slate-100 divide-x divide-slate-100">
                        <div className="pr-4">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Purchases</p>
                            <p className="text-lg font-bold text-red-500">₹{totalGave}</p>
                        </div>
                        <div className="pl-4 text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Payments</p>
                            <p className="text-lg font-bold text-green-600">₹{totalGot}</p>
                        </div>
                    </div>
                </div>

                {/* Transaction Table — Pixel to Pixel Match */}
                <div className="bg-white md:rounded-xl md:border border-slate-200 md:shadow-sm overflow-hidden print-rounded">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#F8FAFC] border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 text-sm font-bold text-slate-700 w-[35%]">Date</th>
                                    <th className="px-4 py-3 text-sm font-bold text-slate-700 text-center w-[20%]">Debit(-)</th>
                                    <th className="px-4 py-3 text-sm font-bold text-slate-700 text-center w-[20%]">Credit(+)</th>
                                    <th className="px-4 py-3 text-sm font-bold text-slate-700 text-right w-[25%]">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-20 text-center">
                                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No transactions recorded yet</p>
                                        </td>
                                    </tr>
                                ) : transactions.map((tx, index) => {
                                    const amount = tx.amount || 0;
                                    const isGave = amount < 0;
                                    const absAmount = Math.abs(amount).toLocaleString('en-IN');
                                    const date = tx.timestamp ? new Date(tx.timestamp) : null;
                                    const runningBalance = Math.abs(tx.runningBalance || 0).toLocaleString('en-IN');
                                    
                                    return (
                                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                            {/* Date Column */}
                                            <td className="px-4 py-3">
                                                {index === 0 && (
                                                    <p className="text-xs font-medium text-red-500 mb-1">Latest</p>
                                                )}
                                                <p className="text-sm font-medium text-slate-600">
                                                    {date ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-0.5">{tx.description || 'General Entry'}</p>
                                                {tx.attachment && (
                                                    <div className="mt-2 no-print">
                                                        <button 
                                                            onClick={() => setViewImage(tx.attachment)}
                                                            className="text-blue-600 hover:text-blue-700"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">image</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Debit Column */}
                                            <td className={`px-4 py-3 text-center ${isGave ? 'bg-red-50/30' : ''}`}>
                                                {isGave && <span className="text-sm text-slate-700">{absAmount}</span>}
                                            </td>

                                            {/* Credit Column */}
                                            <td className={`px-4 py-3 text-center ${!isGave ? 'bg-green-50/30' : ''}`}>
                                                {!isGave && <span className="text-sm text-slate-700">{absAmount}</span>}
                                            </td>

                                            {/* Balance Column */}
                                            <td className="px-4 py-3 text-right">
                                                <span className={`text-sm font-medium ${(tx.runningBalance || 0) < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                                    {Math.abs(tx.runningBalance || 0).toLocaleString('en-IN')} {(tx.runningBalance || 0) < 0 ? 'Dr' : 'Cr'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Secure Footer */}
                <footer className="text-center space-y-3 py-10 px-4">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                        <span className="material-symbols-outlined text-[16px]">verified_user</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest">Verified Digital Statement</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed max-w-md mx-auto">
                        This digital ledger is provided for account transparency. 
                        Generated on {new Date().toLocaleString()}
                        <br className="hidden md:block" />
                        Platform by <a href="https://SumanOnline.Com" className="text-[#0057BB] font-bold no-print">SumanOnline.Com</a>
                    </p>
                </footer>
            </main>

            {/* Mobile Fixed Bottom Bar */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 flex items-center gap-3 no-print z-50 safe-bottom shadow-lg">
                <button 
                    onClick={handlePrint}
                    className="flex-1 bg-[#0057BB] text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-outlined text-[20px]">download</span>
                    Download Statement
                </button>
            </div>
        </div>
    );
};

export default CustomerShareableView;
