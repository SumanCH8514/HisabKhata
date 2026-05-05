import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dbService } from '../services/firebase';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import {
    Users,
    Receipt,
    Settings,
    BarChart3,
    ShieldCheck,
    Mail,
    Link as LinkIcon,
    Search,
    Filter,
    UserX,
    Trash2,
    CheckCircle2,
    Database,
    Download,
    RefreshCw
} from 'lucide-react';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';

const AdminDashboard = () => {
    const { currentUser, userData } = useAuth();
    const [activeTab, setActiveTab] = useState('OVERVIEW');
    const [users, setUsers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [globalSettings, setGlobalSettings] = useState({});
    const [emailJSConfig, setEmailJSConfig] = useState({ serviceId: '', templateId: '', publicKey: '' });
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const displayName = userData?.name || currentUser?.displayName || 'Admin';
    const initial = (displayName.charAt(0) || 'A').toUpperCase();

    useEffect(() => {
        setMounted(true);
        const unsubUsers = dbService.listenAllUsers((data) => {
            setUsers(data);
            setLoading(false);
        });
        const unsubCustomers = dbService.listenAllCustomers((data) => setCustomers(data));
        const unsubTransactions = dbService.listenAllTransactions((data) => setTransactions(data));
        const unsubSettings = dbService.listenGlobalSettings((data) => {
            setGlobalSettings(data);
            if (data.emailjs) {
                setEmailJSConfig(data.emailjs);
            }
        });

        return () => {
            if (typeof unsubUsers === 'function') unsubUsers();
            if (typeof unsubCustomers === 'function') unsubCustomers();
            if (typeof unsubTransactions === 'function') unsubTransactions();
            if (typeof unsubSettings === 'function') unsubSettings();
        };
    }, []);

    const handleSaveEmailJS = async () => {
        try {
            await dbService.updateGlobalSettings({ emailjs: emailJSConfig });
            alert("EmailJS configuration saved successfully!");
        } catch (err) {
            console.error("Save failed:", err);
            alert("Failed to save configuration.");
        }
    };

    // Analytics Calculations
    const stats = useMemo(() => {
        const totalCredit = transactions.filter(t => t.type === 'GOT').reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const totalDebit = transactions.filter(t => t.type === 'GAVE').reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        const chartData = last7Days.map(date => {
            const dayTxs = transactions.filter(t => new Date(t.timestamp).toISOString().split('T')[0] === date);
            return {
                date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                credit: dayTxs.filter(t => t.type === 'GOT').reduce((sum, t) => sum + Math.abs(t.amount), 0),
                debit: dayTxs.filter(t => t.type === 'GAVE').reduce((sum, t) => sum + Math.abs(t.amount), 0)
            };
        });

        return {
            totalUsers: users.length,
            totalCustomers: customers.length,
            totalTransactions: transactions.length,
            totalCredit,
            totalDebit,
            chartData
        };
    }, [users, customers, transactions]);

    const filteredUsers = useMemo(() => {
        return users.filter(user =>
            user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    const handleToggleSetting = async (key) => {
        await dbService.updateGlobalSettings({ [key]: !globalSettings[key] });
    };

    const handleUpdateUserStatus = async (userId, status) => {
        if (window.confirm(`Are you sure you want to ${status ? 'block' : 'unblock'} this user?`)) {
            await dbService.updateUserStatus(userId, status);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (window.confirm("WARNING: This will permanently delete this user AND ALL of their parties and transactions. This action cannot be undone. Proceed?")) {
            await dbService.deleteUserCascaded(userId);
        }
    };

    const handleExportDatabase = async () => {
        try {
            const data = await dbService.exportDatabase();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `hisabkhata_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Export failed:", err);
            alert("Export failed. Check console for details.");
        }
    };

    const renderOverview = () => (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                {[
                    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Total Customers', value: stats.totalCustomers, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
                    { label: 'Transactions', value: stats.totalTransactions, icon: Receipt, color: 'text-orange-600', bg: 'bg-orange-50' },
                    { label: 'System Health', value: '100%', icon: ShieldCheck, color: 'text-green-600', bg: 'bg-green-50' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                        <div className={`${stat.bg} ${stat.color} p-3 rounded-xl flex-shrink-0 w-fit`}>
                            <stat.icon size={20} className="md:w-6 md:h-6" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-slate-400 text-[10px] md:text-sm font-medium uppercase tracking-wider md:normal-case md:tracking-normal truncate">{stat.label}</p>
                            <p className="text-xl md:text-2xl font-black text-slate-900">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-base md:text-lg font-bold text-slate-900 mb-6">Volume Analysis (7 Days)</h3>
                    <div className="w-full h-[250px] md:h-[300px]">
                        {mounted && (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.chartData}>
                                    <defs>
                                        <linearGradient id="colorCredit" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorDebit" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                        dataKey="date" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: '#64748b', fontSize: 10 }} 
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: '#64748b', fontSize: 10 }} 
                                        width={35}
                                    />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    <Area type="monotone" dataKey="credit" stroke="#22c55e" fillOpacity={1} fill="url(#colorCredit)" strokeWidth={2} />
                                    <Area type="monotone" dataKey="debit" stroke="#ef4444" fillOpacity={1} fill="url(#colorDebit)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="space-y-4 md:space-y-6">
                    <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                        <div>
                            <h3 className="text-slate-500 text-xs md:text-sm font-medium mb-1">Total Credit (Got)</h3>
                            <p className="text-2xl md:text-3xl font-bold text-green-600">₹{stats.totalCredit.toLocaleString()}</p>
                        </div>
                        <div className="bg-green-50 text-green-600 p-3 md:p-4 rounded-full">
                            <RefreshCw size={24} className="md:w-8 md:h-8" />
                        </div>
                    </div>
                    <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                        <div>
                            <h3 className="text-slate-500 text-xs md:text-sm font-medium mb-1">Total Debit (Gave)</h3>
                            <p className="text-2xl md:text-3xl font-bold text-red-600">₹{stats.totalDebit.toLocaleString()}</p>
                        </div>
                        <div className="bg-red-50 text-red-600 p-3 md:p-4 rounded-full">
                            <RefreshCw size={24} className="md:w-8 md:h-8 rotate-180" />
                        </div>
                    </div>
                    <div className="bg-slate-900 p-4 md:p-6 rounded-2xl shadow-sm text-white">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider">System Status</h3>
                            <Settings size={16} />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Maintenance Mode</span>
                            <button
                                onClick={() => handleToggleSetting('maintenanceMode')}
                                className={`w-10 md:w-12 h-5 md:h-6 rounded-full transition-colors relative ${globalSettings.maintenanceMode ? 'bg-red-500' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-0.5 md:top-1 w-4 h-4 rounded-full bg-white transition-all ${globalSettings.maintenanceMode ? 'right-0.5 md:right-1' : 'left-0.5 md:left-1'}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderUsers = () => (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search users by name or email..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Data</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredUsers.map(user => (
                            <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold overflow-hidden">
                                            {user.photoURL ? (
                                                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                                            ) : (user.name?.charAt(0) || user.email?.charAt(0) || 'U').toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-900 truncate">{user.name || 'Anonymous'}</p>
                                            <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${user.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {user.role || 'user'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex justify-center gap-4 text-xs">
                                        <div>
                                            <p className="text-slate-400 font-medium">Parties</p>
                                            <p className="font-bold text-slate-900">{customers.filter(c => c.userId === user.id).length}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400 font-medium">Txs</p>
                                            <p className="font-bold text-slate-900">{transactions.filter(t => t.userId === user.id).length}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {user.isBlocked ? (
                                        <span className="flex items-center gap-1.5 text-red-600 text-xs font-bold">
                                            <UserX size={14} /> Blocked
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-green-600 text-xs font-bold">
                                            <CheckCircle2 size={14} /> Active
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleUpdateUserStatus(user.id, !user.isBlocked)}
                                            className={`p-2 rounded-lg transition-colors ${user.isBlocked ? 'text-green-600 hover:bg-green-50' : 'text-orange-600 hover:bg-orange-50'}`}
                                            title={user.isBlocked ? 'Unblock' : 'Block'}
                                        >
                                            {user.isBlocked ? <CheckCircle2 size={18} /> : <UserX size={18} />}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(user.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {filteredUsers.map(user => (
                    <div key={user.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold overflow-hidden">
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                                    ) : (user.name?.charAt(0) || user.email?.charAt(0) || 'U').toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-slate-900 truncate">{user.name || 'Anonymous'}</p>
                                    <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${user.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                {user.role || 'user'}
                            </span>
                        </div>

                        <div className="flex items-center justify-between py-3 border-y border-slate-50">
                            <div className="flex gap-4">
                                <div className="text-center">
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Parties</p>
                                    <p className="text-sm font-bold text-slate-900">{customers.filter(c => c.userId === user.id).length}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Txs</p>
                                    <p className="text-sm font-bold text-slate-900">{transactions.filter(t => t.userId === user.id).length}</p>
                                </div>
                            </div>
                            <div>
                                {user.isBlocked ? (
                                    <span className="bg-red-50 text-red-600 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">
                                        <UserX size={12} /> Blocked
                                    </span>
                                ) : (
                                    <span className="bg-green-50 text-green-600 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">
                                        <CheckCircle2 size={12} /> Active
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => handleUpdateUserStatus(user.id, !user.isBlocked)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${user.isBlocked ? 'bg-green-600 text-white shadow-lg shadow-green-100' : 'bg-orange-100 text-orange-600'}`}
                            >
                                {user.isBlocked ? (
                                    <><CheckCircle2 size={14} /> Activate</>
                                ) : (
                                    <><UserX size={14} /> Block</>
                                )}
                            </button>
                            <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="w-10 h-10 flex items-center justify-center rounded-lg bg-red-50 text-red-600"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderTransactions = () => (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px]">
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">Global Monitoring</h3>
                    <p className="text-slate-400 text-xs">Viewing every transaction across all users for safety & auditing.</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold transition-colors">
                        <Filter size={16} /> Filter
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold transition-colors">
                        <Download size={16} /> Export CSV
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="max-h-[600px] overflow-y-auto">
                    <table className="w-full text-left">
                        <thead className="sticky top-0 bg-white shadow-sm z-10">
                            <tr className="bg-slate-50/80 backdrop-blur border-b border-slate-100">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Merchant</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Party</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Type</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Amount</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {transactions.sort((a, b) => b.timestamp - a.timestamp).map(tx => {
                                const merchant = users.find(u => u.id === tx.userId);
                                const party = customers.find(c => c.id === tx.customerId);
                                return (
                                    <tr key={tx.id} className="hover:bg-slate-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-900 text-sm">{merchant?.name || 'Unknown'}</p>
                                            <p className="text-[10px] text-slate-400">{merchant?.email}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-slate-700 text-sm">{party?.name || 'Deleted Party'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider ${tx.type === 'GOT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {tx.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className={`font-bold ${tx.type === 'GOT' ? 'text-green-600' : 'text-red-600'}`}>
                                                ₹{Math.abs(tx.amount).toLocaleString()}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-right text-slate-500 text-xs">
                                            {new Date(tx.timestamp).toLocaleString()}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderLinks = () => (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">Public Shared Links</h3>
                <p className="text-slate-400 text-xs">Monitoring all live ledger links shared with customers.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Customer</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Owner (Merchant)</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Link Type</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {customers.map(customer => {
                            const merchant = users.find(u => u.id === customer.userId);
                            return (
                                <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-slate-900 text-sm">{customer.name}</p>
                                        <p className="text-[10px] text-slate-400">ID: {customer.id}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-medium text-slate-700 text-sm">{merchant?.name || 'Unknown'}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold">LEDGER_VIEW</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-blue-600 hover:underline text-xs font-bold">Copy Link</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );



    const renderSettings = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-8">
                <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Global Feature Toggles</h3>
                    <p className="text-slate-500 text-sm">Control platform-wide functionality instantly.</p>
                </div>

                <div className="space-y-6">
                    {[
                        { key: 'emailNotifications', label: 'Email Notifications', icon: Mail },
                        { key: 'shareLinks', label: 'Customer Share Links', icon: LinkIcon },
                        { key: 'pdfExport', label: 'PDF Report Export', icon: Download },
                        { key: 'analytics', label: 'Merchant Analytics', icon: BarChart3 },
                        { key: 'newRegistrations', label: 'New Registrations', icon: Users },
                        { key: 'captcha', label: 'Security Captcha', icon: ShieldCheck },
                        { key: 'signupWithMail', label: 'Email Signup', icon: Mail }
                    ].map((feature, i) => (
                        <div key={i} className="flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="bg-slate-50 p-2.5 rounded-xl group-hover:bg-blue-50 transition-colors">
                                    <feature.icon size={20} className="text-slate-600 group-hover:text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900">{feature.label}</p>
                                    <p className="text-xs text-slate-400">Enable or disable this module for all users.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleToggleSetting(feature.key)}
                                className={`w-14 h-7 rounded-full transition-all relative ${globalSettings[feature.key] ? 'bg-blue-600' : 'bg-slate-200'}`}
                            >
                                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${globalSettings[feature.key] ? 'right-1' : 'left-1'}`} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-8">
                <div className="bg-slate-900 p-8 rounded-3xl text-white space-y-6">
                    <div className="flex items-center gap-3">
                        <Mail className="text-blue-400" />
                        <h3 className="text-xl font-bold">EmailJS Configuration</h3>
                    </div>
                    <p className="text-xs text-slate-400">Using Frontend Email (Blaze Plan Not Required)</p>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Service ID</label>
                            <input 
                                type="text" 
                                value={emailJSConfig.serviceId || ''} 
                                onChange={(e) => setEmailJSConfig({...emailJSConfig, serviceId: e.target.value})}
                                placeholder="service_xxxx"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500" 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Template ID</label>
                            <input 
                                type="text" 
                                value={emailJSConfig.templateId || ''} 
                                onChange={(e) => setEmailJSConfig({...emailJSConfig, templateId: e.target.value})}
                                placeholder="template_xxxx"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500" 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Public Key</label>
                            <input 
                                type="text" 
                                value={emailJSConfig.publicKey || ''} 
                                onChange={(e) => setEmailJSConfig({...emailJSConfig, publicKey: e.target.value})}
                                placeholder="user_xxxx"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500" 
                            />
                        </div>
                        <div className="flex gap-4 mt-4">
                            <button 
                                onClick={handleSaveEmailJS}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                                Save Configuration
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-orange-50 p-3 rounded-2xl text-orange-600">
                            <Database size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Database Backup</h3>
                            <p className="text-xs text-slate-400">Download a full JSON dump of the DB.</p>
                        </div>
                    </div>
                    <button
                        onClick={handleExportDatabase}
                        className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all flex items-center gap-2"
                    >
                        <Download size={16} /> Export
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex min-h-screen bg-[#f8fafc]">
            <Sidebar />

            <main className="flex-1 md:ml-[260px] flex flex-col min-w-0">
                <header className="h-16 md:h-20 bg-white border-b border-slate-100 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="bg-blue-600 p-1.5 md:p-2 rounded-lg text-white shadow-lg shadow-blue-200">
                            <ShieldCheck size={18} />
                        </div>
                        <div>
                            <h1 className="font-black text-slate-900 uppercase tracking-tight text-sm md:text-base">Admin Console</h1>
                            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 tracking-widest uppercase">{activeTab} View</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-slate-900">{displayName}</p>
                            <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Active Session</p>
                        </div>
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-blue-100 p-0.5 overflow-hidden">
                            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-xs md:text-sm">
                                {userData?.photoURL ? (
                                    <img src={userData.photoURL} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    initial
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-4 md:p-8 max-w-7xl mx-auto w-full flex-1 pb-24 md:pb-8">
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-6 w-full overflow-x-auto scrollbar-hide">
                        {[
                            { id: 'OVERVIEW', label: 'Dashboard', icon: BarChart3 },
                            { id: 'USERS', label: 'Users', icon: Users },
                            { id: 'TRANSACTIONS', label: 'Transactions', icon: Receipt },
                            { id: 'LINKS', label: 'Links', icon: LinkIcon },
                            { id: 'SETTINGS', label: 'Settings', icon: Settings },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap flex-1 justify-center ${activeTab === tab.id
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <tab.icon size={16} />
                                <span className="hidden xs:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-96 space-y-4">
                            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-slate-400 font-bold text-sm animate-pulse">Initializing System Monitoring...</p>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'OVERVIEW' && renderOverview()}
                            {activeTab === 'USERS' && renderUsers()}
                            {activeTab === 'TRANSACTIONS' && renderTransactions()}
                            {activeTab === 'LINKS' && renderLinks()}
                            {activeTab === 'SETTINGS' && renderSettings()}
                        </>
                    )}
                </div>
            </main>
            <BottomNav />
        </div>
    );
};

export default AdminDashboard;
