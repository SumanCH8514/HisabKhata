import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import TransactionDrawer from '../components/TransactionDrawer';
import { dbService } from '../services/firebase';

const CustomerLedgerDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [customer, setCustomer] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isTransactionDrawerOpen, setIsTransactionDrawerOpen] = useState(false);
    const [transactionType, setTransactionType] = useState('gave');

    useEffect(() => {
        if (!id) return;

        const unsubCustomer = dbService.listenCustomer(id, (data) => {
            setCustomer(data);
        });

        const unsubTransactions = dbService.listenCustomerTransactions(id, (data) => {
            setTransactions(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
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

    if (loading && !customer) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const balance = customer?.balance || 0;
    const isReceivable = balance < 0; // Negative means we GAVE and need to GET

    return (
        <div className="font-body-md text-on-surface bg-slate-50 min-h-screen">
            <Sidebar />
            <Header />
            
            <main className="ml-0 md:ml-64 pt-16 flex flex-col h-[calc(100vh-4rem)]">
                {/* Party Header Section */}
                <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/customers')} className="p-2 hover:bg-slate-100 rounded-full transition-colors md:hidden">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center font-black text-white text-2xl">
                            {customer?.name?.substring(0, 1).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="font-black text-xl text-slate-900 uppercase tracking-tight">{customer?.name}</h2>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{customer?.phone || 'No Contact'}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className={`text-2xl font-black ${isReceivable ? 'text-error' : 'text-tertiary'}`}>
                            ₹{Math.abs(balance).toLocaleString('en-IN')}
                        </p>
                        <p className={`text-xs font-bold uppercase tracking-widest ${isReceivable ? 'text-error' : 'text-tertiary'} opacity-70`}>
                            Net Balance ({isReceivable ? 'Get' : 'Give'})
                        </p>
                    </div>
                </div>

                {/* Ledger Table Section */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="bg-white border-b border-slate-200">
                        <div className="grid grid-cols-12 px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <div className="col-span-3">Date</div>
                            <div className="col-span-5">Particulars</div>
                            <div className="col-span-2 text-right">You Gave</div>
                            <div className="col-span-2 text-right">You Got</div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-white custom-scrollbar">
                        {transactions.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                                <span className="material-symbols-outlined text-8xl opacity-10">receipt_long</span>
                                <p className="font-bold uppercase tracking-widest text-sm">No Transactions Yet</p>
                            </div>
                        ) : (
                            transactions.map(tx => {
                                const isGave = tx.amount < 0;
                                return (
                                    <div key={tx.id} className="grid grid-cols-12 px-6 py-4 border-b border-slate-50 hover:bg-slate-50 transition-colors group items-center">
                                        <div className="col-span-3">
                                            <p className="text-xs font-bold text-slate-600">{new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                        </div>
                                        <div className="col-span-5">
                                            <p className="text-sm font-medium text-slate-900 truncate">{tx.description || 'No Remarks'}</p>
                                        </div>
                                        <div className="col-span-2 text-right">
                                            {isGave && <p className="text-sm font-black text-error">₹{Math.abs(tx.amount).toLocaleString('en-IN')}</p>}
                                        </div>
                                        <div className="col-span-2 text-right">
                                            {!isGave && <p className="text-sm font-black text-tertiary">₹{Math.abs(tx.amount).toLocaleString('en-IN')}</p>}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Bottom Entry Buttons */}
                <div className="p-4 bg-white border-t border-slate-200 grid grid-cols-2 gap-4 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
                    <button 
                        onClick={() => handleAddEntry('gave')}
                        className="py-4 bg-error-container text-error rounded-lg font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-error hover:text-white transition-all shadow-sm"
                    >
                        <span className="material-symbols-outlined">remove_circle</span>
                        You Gave ₹
                    </button>
                    <button 
                        onClick={() => handleAddEntry('got')}
                        className="py-4 bg-tertiary-container text-tertiary rounded-lg font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-tertiary hover:text-white transition-all shadow-sm"
                    >
                        <span className="material-symbols-outlined">add_circle</span>
                        You Got ₹
                    </button>
                </div>
            </main>

            <TransactionDrawer 
                isOpen={isTransactionDrawerOpen}
                onClose={() => setIsTransactionDrawerOpen(false)}
                customerId={id}
                type={transactionType}
            />
        </div>
    );
};

export default CustomerLedgerDetail;
