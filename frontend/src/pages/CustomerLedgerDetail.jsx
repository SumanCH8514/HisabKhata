import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import TransactionDrawer from '../components/TransactionDrawer';
import EntryDetailsDrawer from '../components/EntryDetailsDrawer';
import ImportTransactionsModal from '../components/ImportTransactionsModal';
import { dbService } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { getFutureDateString, formatDueDate, getDueDateStatus } from '../utils/dueDateUtils';

const CustomerLedgerDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { userData } = useAuth();
    const [customer, setCustomer] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isTransactionDrawerOpen, setIsTransactionDrawerOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [transactionType, setTransactionType] = useState('gave');
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [isEntryDetailsOpen, setIsEntryDetailsOpen] = useState(false);
    const [previewImages, setPreviewImages] = useState([]);
    const [previewIndex, setPreviewIndex] = useState(0);

    useEffect(() => {
        if (!id) return;

        const unsubCustomer = dbService.listenCustomer(id, (data) => {
            setCustomer(data);
        });

        const unsubTransactions = dbService.listenCustomerTransactions(id, (data) => {
            setTransactions(data.sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date)));
            setLoading(false);
        });

        return () => {
            if (typeof unsubCustomer === 'function') unsubCustomer();
            if (typeof unsubTransactions === 'function') unsubTransactions();
        };
    }, [id]);

    const handleAddEntry = (type) => {
        setTransactionType(type);
        setIsTransactionDrawerOpen(true);
    };

    const handleEntryClick = (tx) => {
        setSelectedTransaction(tx);
        setIsEntryDetailsOpen(true);
    };

    const handleEditEntry = (tx) => {
        setIsEntryDetailsOpen(false);
        setSelectedTransaction(tx);
        setTransactionType(tx.type === 'GAVE' || tx.amount < 0 ? 'gave' : 'got');
        setIsTransactionDrawerOpen(true);
    };

    const handleSetDueDate = async (days) => {
        if (!customer) return;
        const targetDate = getFutureDateString(days);
        try {
            await dbService.updateCustomer(customer.id, { dueDate: targetDate });
            setCustomer(prev => ({ ...prev, dueDate: targetDate }));
        } catch (err) {
            console.error("Failed to update due date:", err);
            alert("Failed to update due date");
        }
    };

    const handleCustomDueDate = async (dateStr) => {
        if (!customer || !dateStr) return;
        try {
            await dbService.updateCustomer(customer.id, { dueDate: dateStr });
            setCustomer(prev => ({ ...prev, dueDate: dateStr }));
        } catch (err) {
            console.error("Failed to update due date:", err);
            alert("Failed to update due date");
        }
    };

    const handleClearDueDate = async () => {
        if (!customer) return;
        try {
            await dbService.updateCustomer(customer.id, { dueDate: null });
            setCustomer(prev => ({ ...prev, dueDate: null }));
        } catch (err) {
            console.error("Failed to clear due date:", err);
            alert("Failed to clear due date");
        }
    };

    if (loading && !customer) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50 gap-4">
                <div className="w-12 h-12 border-4 border-[#0b5cba] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Syncing Ledger...</p>
            </div>
        );
    }

    const balance = customer?.balance || 0;
    const isReceivable = balance < 0; // Negative means we GAVE and need to GET

    return (
        <div className="font-body-md text-on-surface bg-slate-50 min-h-screen">
            <Sidebar />
            <Header />
            
            <main className="ml-0 md:ml-64 pt-16 flex flex-col h-[calc(100vh-4rem)] relative">
                {/* Party Header Section — High Fidelity */}
                <div className="bg-white border-b border-slate-200 p-4 md:p-6 flex items-center justify-between shadow-sm sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/customers')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors md:hidden">
                            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                        </button>
                        <div className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-[#0b5cba]/10 flex items-center justify-center font-black text-[#0b5cba] text-xl md:text-2xl border border-blue-50 overflow-hidden shrink-0">
                            {customer?.photoURL ? (
                                <img src={customer.photoURL} alt="" className="w-full h-full object-cover" />
                            ) : (
                                customer?.name?.substring(0, 1).toUpperCase()
                            )}
                        </div>
                        <div>
                            <h2 className="font-black text-[17px] md:text-xl text-slate-900 tracking-tight leading-tight uppercase">{customer?.name}</h2>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">{customer?.phone || 'No Contact'}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className={`text-xl md:text-2xl font-black ${isReceivable ? 'text-[#e53935]' : 'text-[#43a047]'}`}>
                            ₹{Math.abs(balance).toLocaleString('en-IN')}
                        </p>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${isReceivable ? 'text-[#e53935]' : 'text-[#43a047]'} opacity-70`}>
                            {isReceivable ? 'You Get' : 'You Give'}
                        </p>
                    </div>
                </div>

                {/* Ledger Quick Actions */}
                <div className="bg-white px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 min-h-[46px]">
                    <div className="flex items-center gap-2 flex-wrap">
                        {customer?.dueDate ? (
                            /* Only show due date chip when date is selected */
                            (() => {
                                const status = getDueDateStatus(customer.dueDate);
                                if (!status) return null;
                                return (
                                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-bold ${status.badgeColor} shadow-sm animate-in fade-in duration-200`}>
                                        <span className="material-symbols-outlined text-[15px]">event</span>
                                        <span>{status.label}</span>
                                        <button
                                            type="button"
                                            onClick={handleClearDueDate}
                                            title="Clear Due Date"
                                            className="p-0.5 hover:bg-black/10 rounded ml-1 text-gray-500 hover:text-red-600"
                                        >
                                            <span className="material-symbols-outlined text-[14px] leading-none block">close</span>
                                        </button>
                                    </div>
                                );
                            })()
                        ) : (
                            /* Show presets when no date is set */
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none mb-1.5 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[13px]">timer</span>
                                    Set Due Date
                                </span>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {[
                                        { label: '7d', fullLabel: '7 days', days: 7 },
                                        { label: '14d', fullLabel: '14 days', days: 14 },
                                        { label: '30d', fullLabel: '30 days', days: 30 }
                                    ].map(({ label, days }) => (
                                        <button 
                                            key={days}
                                            type="button"
                                            onClick={() => handleSetDueDate(days)}
                                            className="px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 shadow-sm"
                                        >
                                            {label}
                                        </button>
                                    ))}

                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="date"
                                            min={getFutureDateString(0)}
                                            value=""
                                            onChange={(e) => handleCustomDueDate(e.target.value)}
                                            className="sr-only"
                                            id="mobile-due-date-picker"
                                        />
                                        <span 
                                            onClick={() => {
                                                const el = document.getElementById('mobile-due-date-picker');
                                                if (el && typeof el.showPicker === 'function') {
                                                    el.showPicker();
                                                }
                                            }}
                                            className="px-2.5 py-1 bg-slate-100 rounded-md text-[11px] font-bold text-slate-700 border border-slate-200 hover:bg-slate-200 flex items-center gap-1 cursor-pointer shadow-sm"
                                        >
                                            <span className="material-symbols-outlined text-[13px]">calendar_month</span>
                                            Date
                                        </span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                         <button 
                             onClick={() => setIsImportModalOpen(true)}
                             className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-[#0b5cba] rounded-lg font-bold text-[12px] border border-blue-100 hover:bg-blue-100 transition-colors shadow-sm"
                             title="Import Khatabook or Excel Statement"
                         >
                             <span className="material-symbols-outlined text-[18px]">upload_file</span>
                             Import
                         </button>
                         <button 
                             onClick={() => navigate(`/reports/customer/${customer.id}`)}
                             className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg font-bold text-[12px] border border-slate-200 hover:bg-slate-100 transition-colors shadow-sm"
                         >
                             <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                             Report
                         </button>
                    </div>
                </div>

                {/* Ledger Table Section */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Entries</span>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-white custom-scrollbar pb-32">
                        {transactions.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                                <span className="material-symbols-outlined text-8xl opacity-10">receipt_long</span>
                                <p className="font-bold uppercase tracking-widest text-[11px]">No Transactions Yet</p>
                            </div>
                        ) : (
                            [...transactions].reverse().map(tx => {
                                const isGave = tx.amount < 0 || tx.type === 'GAVE';
                                return (
                                    <div 
                                        key={tx.id} 
                                        onClick={() => handleEntryClick(tx)}
                                        className="grid grid-cols-12 px-4 py-4 border-b border-slate-50 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer group items-center"
                                    >
                                        <div className="col-span-4">
                                            <p className="text-[13px] font-bold text-slate-900">{new Date(tx.timestamp || tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                            <p className="text-[11px] font-medium text-slate-400 mt-0.5">Balance: {tx.balance?.toLocaleString('en-IN')}</p>
                                        </div>
                                        <div className="col-span-4">
                                            <p className="text-[13px] font-medium text-slate-600 truncate">{tx.description || 'No Remarks'}</p>
                                        </div>
                                        <div className="col-span-4 text-right">
                                            <p className={`text-[15px] font-black ${isGave ? 'text-[#e53935]' : 'text-[#43a047]'}`}>
                                                ₹{Math.abs(tx.amount).toLocaleString('en-IN')}
                                            </p>
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-300">{isGave ? 'Gave' : 'Got'}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Bottom Entry Buttons — Fixed with shadow */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 grid grid-cols-2 gap-4 shadow-[0_-8px_30px_rgb(0,0,0,0.08)] z-30">
                    <button 
                        onClick={() => handleAddEntry('gave')}
                        className="py-4 bg-[#e53935] text-white rounded-xl font-black text-[13px] uppercase tracking-[0.1em] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-red-100"
                    >
                        <span className="material-symbols-outlined text-[20px]">call_made</span>
                        You Gave ₹
                    </button>
                    <button 
                        onClick={() => handleAddEntry('got')}
                        className="py-4 bg-[#43a047] text-white rounded-xl font-black text-[13px] uppercase tracking-[0.1em] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-green-100"
                    >
                        <span className="material-symbols-outlined text-[20px]">call_received</span>
                        You Got ₹
                    </button>
                </div>
            </main>

            <TransactionDrawer 
                isOpen={isTransactionDrawerOpen}
                onClose={() => {
                    setIsTransactionDrawerOpen(false);
                    setSelectedTransaction(null);
                }}
                customerId={id}
                customerName={customer?.name}
                type={transactionType}
                transaction={selectedTransaction}
            />

            <EntryDetailsDrawer
                isOpen={isEntryDetailsOpen}
                onClose={() => setIsEntryDetailsOpen(false)}
                transaction={selectedTransaction}
                customerName={customer?.name}
                customerPhone={customer?.phone}
                customerEmail={customer?.email}
                customerPhoto={customer?.photoURL}
                userData={userData}
                onEdit={handleEditEntry}
                onViewImage={(img) => {
                    if (Array.isArray(img)) {
                        setPreviewImages(img);
                        setPreviewIndex(0);
                    } else if (img) {
                        setPreviewImages([img]);
                        setPreviewIndex(0);
                    }
                }}
            />

            <ImportTransactionsModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                customer={customer}
                onSuccess={() => {
                    // Realtime updates will automatically refresh ledger transactions
                }}
            />

            {/* Image Preview Modal Gallery */}
            {previewImages.length > 0 && (
                <div 
                    className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/90 p-4 animate-in fade-in duration-200"
                    onClick={() => setPreviewImages([])}
                >
                    {/* Top bar */}
                    <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10 max-w-4xl mx-auto">
                        <div className="text-white text-xs md:text-sm font-bold bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
                            {previewImages.length > 1 ? `${previewIndex + 1} / ${previewImages.length} Bills` : 'Bill Attachment'}
                        </div>
                        <button 
                            onClick={() => setPreviewImages([])}
                            className="text-white p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <span className="material-symbols-outlined text-[24px] md:text-[28px]">close</span>
                        </button>
                    </div>

                    {/* Main image with left/right buttons */}
                    <div className="relative max-w-4xl max-h-[75vh] flex items-center justify-center">
                        {previewImages.length > 1 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewIndex((prev) => (prev > 0 ? prev - 1 : previewImages.length - 1));
                                }}
                                className="absolute left-2 md:-left-12 z-20 text-white p-2 bg-black/60 hover:bg-black/90 rounded-full backdrop-blur-md transition-all active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[24px]">chevron_left</span>
                            </button>
                        )}

                        <img 
                            src={previewImages[previewIndex]} 
                            alt={`Bill Attachment ${previewIndex + 1}`} 
                            className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
                            onClick={(e) => e.stopPropagation()}
                        />

                        {previewImages.length > 1 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewIndex((prev) => (prev < previewImages.length - 1 ? prev + 1 : 0));
                                }}
                                className="absolute right-2 md:-right-12 z-20 text-white p-2 bg-black/60 hover:bg-black/90 rounded-full backdrop-blur-md transition-all active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[24px]">chevron_right</span>
                            </button>
                        )}
                    </div>

                    {/* Bottom thumbnail strip */}
                    {previewImages.length > 1 && (
                        <div 
                            className="mt-4 flex gap-2 overflow-x-auto max-w-full p-2 bg-black/40 rounded-2xl backdrop-blur-md z-10 custom-scrollbar"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {previewImages.map((img, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setPreviewIndex(idx)}
                                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${previewIndex === idx ? 'border-blue-500 scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                >
                                    <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CustomerLedgerDetail;
