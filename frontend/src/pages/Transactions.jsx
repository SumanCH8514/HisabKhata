import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { dbService } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

const Transactions = () => {
    const { currentUser } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;

        const unsubTransactions = dbService.listenAllUserTransactions(currentUser.uid, (data) => {
            setTransactions(data.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
            setLoading(false);
        });

        const unsubCustomers = dbService.listenUserCustomers(currentUser.uid, (data) => {
            setCustomers(data);
        });

        return () => {
            if (typeof unsubTransactions === 'function') unsubTransactions();
            if (typeof unsubCustomers === 'function') unsubCustomers();
        };
    }, [currentUser]);

    const getCustomerName = (customerId) => {
        const customer = customers.find(c => c.id === customerId);
        return customer ? customer.name : 'Unknown Party';
    };

    return (
        <div className="flex min-h-screen" style={{ backgroundColor: '#f5f5f5' }}>
            <Sidebar />
            <Header />
            <main className="flex-1 ml-0 md:ml-[260px] p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold text-gray-800">All Transactions</h2>
                        <p className="text-sm text-gray-500 mt-0.5">Complete audit log of all entries</p>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                                        <th className="px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Party</th>
                                        <th className="px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Description</th>
                                        <th className="px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-right">You Gave</th>
                                        <th className="px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-right">You Got</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="5" className="px-5 py-12 text-center text-gray-400 text-sm">
                                                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                                Loading...
                                            </td>
                                        </tr>
                                    ) : transactions.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-5 py-12 text-center text-gray-400 text-sm">
                                                No transactions recorded yet.
                                            </td>
                                        </tr>
                                    ) : transactions.map(tx => {
                                        const isGave = tx.amount < 0 || tx.type === 'GAVE' || tx.type === 'credit';
                                        const absAmount = Math.abs(tx.amount || 0);
                                        const txDate = tx.timestamp ? new Date(tx.timestamp) : tx.date ? new Date(tx.date) : null;
                                        return (
                                            <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-5 py-3.5 text-sm text-gray-600">
                                                    {txDate ? txDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                                </td>
                                                <td className="px-5 py-3.5 text-sm font-medium text-gray-900">
                                                    {getCustomerName(tx.customerId)}
                                                </td>
                                                <td className="px-5 py-3.5 text-sm text-gray-500 max-w-[200px] truncate">
                                                    {tx.description || '—'}
                                                </td>
                                                <td className="px-5 py-3.5 text-right">
                                                    {isGave
                                                        ? <span className="text-sm font-semibold text-red-500">₹{absAmount.toLocaleString('en-IN')}</span>
                                                        : <span className="text-sm text-gray-300">-</span>
                                                    }
                                                </td>
                                                <td className="px-5 py-3.5 text-right">
                                                    {!isGave
                                                        ? <span className="text-sm font-semibold text-green-600">₹{absAmount.toLocaleString('en-IN')}</span>
                                                        : <span className="text-sm text-gray-300">-</span>
                                                    }
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Transactions;
