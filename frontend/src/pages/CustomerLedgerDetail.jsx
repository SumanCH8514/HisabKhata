import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import TransactionDrawer from '../components/TransactionDrawer';
import EntryDetailsDrawer from '../components/EntryDetailsDrawer';
import { dbService } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

const CustomerLedgerDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { userData } = useAuth();
    const [customer, setCustomer] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isTransactionDrawerOpen, setIsTransactionDrawerOpen] = useState(false);
    const [transactionType, setTransactionType] = useState('gave');
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [isEntryDetailsOpen, setIsEntryDetailsOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);

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
                <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none mb-1.5">Set Due Date</span>
                            <div className="flex gap-2">
                                <button className="px-3 py-1.5 bg-slate-100 rounded-md text-[11px] font-bold text-slate-600 border border-slate-200">7 days</button>
                                <button className="px-3 py-1.5 bg-slate-100 rounded-md text-[11px] font-bold text-slate-600 border border-slate-200">14 days</button>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                         <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-[#0b5cba] rounded-lg font-bold text-[12px] border border-blue-100">
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
                onViewImage={setPreviewImage}
            />

            {/* Image Preview Modal */}
            {previewImage && (
                <div 
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-200"
                    onClick={() => setPreviewImage(null)}
                >
                    <img src={previewImage} alt="Preview" className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" />
                    <button className="absolute top-6 right-6 text-white p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                        <span className="material-symbols-outlined text-[28px]">close</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default CustomerLedgerDetail;
