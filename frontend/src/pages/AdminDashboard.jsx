import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dbService } from '../services/firebase';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import AppMobileHeader from '../components/AppMobileHeader';
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
    Upload,
    RefreshCw,
    Cloud,
    HardDrive,
    ArrowUpRight,
    FolderTree,
    AlertCircle,
    Play,
    CheckCircle,
    ExternalLink,
    Sparkles
} from 'lucide-react';
import { testR2Connection, migrateAllBase64ToR2, R2_FOLDERS } from '../services/r2Storage';

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
    const [paymentEmailJS, setPaymentEmailJS] = useState({ serviceId: '', templateId: '', publicKey: '' });
    const [r2Config, setR2Config] = useState({
        accountId: '',
        accessKeyId: '',
        secretAccessKey: '',
        bucketName: 'hisabkhata',
        publicUrl: 'https://cdn.backend.hisabkhata.sumanonline.com'
    });
    const [r2Testing, setR2Testing] = useState(false);
    const [r2TestResult, setR2TestResult] = useState(null);
    const [migrationState, setMigrationState] = useState({
        isRunning: false,
        progress: 0,
        status: '',
        message: '',
        stats: null,
        logs: []
    });
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [txSearchTerm, setTxSearchTerm] = useState('');
    const [linkSearchTerm, setLinkSearchTerm] = useState('');

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
            if (data.paymentEmailjs) {
                setPaymentEmailJS(data.paymentEmailjs);
            }
            if (data.r2) {
                setR2Config(prev => ({
                    ...prev,
                    ...data.r2,
                    bucketName: data.r2.bucketName || 'hisabkhata',
                    publicUrl: (data.r2.publicUrl || 'https://cdn.backend.hisabkhata.sumanonline.com').replace(/^http:\/\//i, 'https://')
                }));
            }
        });

        return () => {
            if (typeof unsubUsers === 'function') unsubUsers();
            if (typeof unsubCustomers === 'function') unsubCustomers();
            if (typeof unsubTransactions === 'function') unsubTransactions();
            if (typeof unsubSettings === 'function') unsubSettings();
        };
    }, []);

    const handleSaveR2Config = async () => {
        try {
            await dbService.updateGlobalSettings({ r2: r2Config });
            alert("Cloudflare R2 configuration saved successfully!");
        } catch (err) {
            console.error("Save R2 config failed:", err);
            alert("Failed to save R2 configuration: " + err.message);
        }
    };

    const handleTestR2 = async () => {
        setR2Testing(true);
        setR2TestResult(null);
        try {
            const res = await testR2Connection(r2Config);
            setR2TestResult(res);
        } catch (err) {
            setR2TestResult({ success: false, message: err.message });
        } finally {
            setR2Testing(false);
        }
    };

    const handleStartMigration = async () => {
        if (!r2Config.accountId || !r2Config.accessKeyId || !r2Config.secretAccessKey) {
            alert("Please provide Account ID, Access Key ID, and Secret Access Key before starting migration.");
            return;
        }

        if (!window.confirm("Start Cloudflare R2 Migration? This will scan all base64 images, upload them to your R2 bucket under their respective folders, and update database records with CDN URLs.")) {
            return;
        }

        setMigrationState({
            isRunning: true,
            progress: 0,
            status: 'STARTING',
            message: 'Initializing migration engine...',
            stats: null,
            logs: []
        });

        try {
            const finalStats = await migrateAllBase64ToR2((prog) => {
                setMigrationState(prev => ({
                    ...prev,
                    progress: prog.progress !== undefined ? prog.progress : prev.progress,
                    status: prog.status || prev.status,
                    message: prog.message || prev.message,
                    stats: prog.stats || prev.stats,
                    logs: prog.itemLabel 
                        ? [`[${new Date().toLocaleTimeString()}] ${prog.message}`, ...prev.logs.slice(0, 49)] 
                        : (prog.message ? [`[${new Date().toLocaleTimeString()}] ${prog.message}`, ...prev.logs.slice(0, 49)] : prev.logs)
                }));
            }, r2Config);

            setMigrationState(prev => ({
                ...prev,
                isRunning: false,
                status: 'COMPLETED',
                stats: finalStats
            }));
            alert(`Migration Complete! Successfully migrated ${finalStats.totalMigrated} assets.`);
        } catch (err) {
            console.error("Migration error:", err);
            setMigrationState(prev => ({
                ...prev,
                isRunning: false,
                status: 'ERROR',
                message: err.message,
                logs: [`[ERROR] ${err.message}`, ...prev.logs]
            }));
            alert("Migration halted due to error: " + err.message);
        }
    };

    const handleSaveEmailJS = async () => {
        try {
            await dbService.updateGlobalSettings({ 
                emailjs: emailJSConfig,
                paymentEmailjs: paymentEmailJS
            });
            alert("Email configurations saved successfully!");
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

    const [copiedId, setCopiedId] = useState(null);

    const handleCopyLink = (customerId) => {
        const link = `${window.location.origin}/customer/share/${customerId}`;
        navigator.clipboard.writeText(link).then(() => {
            setCopiedId(customerId);
            setTimeout(() => setCopiedId(null), 2000);
        });
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

    const handleExportTransactionsCSV = () => {
        if (transactions.length === 0) {
            alert("No transactions to export.");
            return;
        }

        const headers = ["Date", "Merchant", "Merchant Email", "Party", "Type", "Amount"];
        const csvRows = transactions.sort((a, b) => b.timestamp - a.timestamp).map(tx => {
            const merchant = users.find(u => u.id === tx.userId);
            const party = customers.find(c => c.id === tx.customerId);
            return [
                new Date(tx.timestamp).toLocaleString(),
                merchant?.name || 'Unknown',
                merchant?.email || 'N/A',
                party?.name || 'Deleted Party',
                tx.type,
                tx.amount
            ].map(v => `"${v}"`).join(',');
        });

        const csvContent = [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hisabkhata_transactions_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
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

    const handleImportDatabase = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!window.confirm("CRITICAL WARNING: This will OVERWRITE your entire database with the uploaded file. This action CANNOT be undone. Are you absolutely sure?")) {
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);
                await dbService.importDatabase(data);
                alert("Database restored successfully!");
                window.location.reload(); // Refresh to pick up new data
            } catch (err) {
                console.error("Import failed:", err);
                alert("Invalid JSON file or permission denied.");
            }
        };
        reader.readAsText(file);
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

    const renderTransactions = () => {
        const filteredTransactions = transactions
            .filter(tx => {
                const merchant = users.find(u => u.id === tx.userId);
                const party = customers.find(c => c.id === tx.customerId);
                const search = txSearchTerm.toLowerCase();
                return (
                    merchant?.name?.toLowerCase().includes(search) ||
                    merchant?.email?.toLowerCase().includes(search) ||
                    party?.name?.toLowerCase().includes(search) ||
                    tx.type?.toLowerCase().includes(search) ||
                    String(tx.amount || '').includes(search)
                );
            })
            .sort((a, b) => b.timestamp - a.timestamp);

        return (
            <div className="space-y-4 md:space-y-6 animate-in fade-in duration-300">
                {/* Header & Filter Bar */}
                <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">Platform Transaction Audit</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Real-time ledger entries stream across all merchants for security and auditing</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                        <div className="relative flex-1 sm:w-60">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input 
                                type="text"
                                placeholder="Filter by party, merchant, amount..."
                                value={txSearchTerm}
                                onChange={(e) => setTxSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 focus:bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>
                        <button 
                            type="button"
                            onClick={handleExportTransactionsCSV}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                        >
                            <Download size={14} />
                            <span>Export CSV</span>
                        </button>
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="max-h-[560px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10 text-[11px] font-semibold text-slate-600">
                                <tr>
                                    <th className="px-5 py-3">Merchant</th>
                                    <th className="px-5 py-3">Party</th>
                                    <th className="px-5 py-3 text-center">Type</th>
                                    <th className="px-5 py-3 text-right">Amount (₹)</th>
                                    <th className="px-5 py-3 text-right">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-400">
                                            No transactions match your search filter
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTransactions.map(tx => {
                                        const merchant = users.find(u => u.id === tx.userId);
                                        const party = customers.find(c => c.id === tx.customerId);
                                        return (
                                            <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="px-5 py-3.5">
                                                    <p className="font-bold text-slate-900">{merchant?.name || 'Unknown'}</p>
                                                    <p className="text-[11px] text-slate-400">{merchant?.email || 'N/A'}</p>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <p className="font-semibold text-slate-800">{party?.name || 'Deleted Party'}</p>
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                                        tx.type === 'GOT' 
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                            : 'bg-rose-50 text-rose-700 border-rose-200'
                                                    }`}>
                                                        {tx.type === 'GOT' ? 'Got (Credit)' : 'Gave (Debit)'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-right font-mono font-semibold">
                                                    <span className={tx.type === 'GOT' ? 'text-emerald-600' : 'text-rose-600'}>
                                                        ₹{Math.abs(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-right text-slate-500 font-mono text-[11px]">
                                                    {new Date(tx.timestamp).toLocaleString()}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden space-y-3">
                    {filteredTransactions.length === 0 ? (
                        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
                            No transactions found
                        </div>
                    ) : (
                        filteredTransactions.map(tx => {
                            const merchant = users.find(u => u.id === tx.userId);
                            const party = customers.find(c => c.id === tx.customerId);
                            return (
                                <div key={tx.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="font-bold text-slate-900 text-sm">{party?.name || 'Deleted Party'}</p>
                                            <p className="text-[11px] text-slate-500">Merchant: {merchant?.name || 'Unknown'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-mono font-bold text-sm ${tx.type === 'GOT' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                ₹{Math.abs(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </p>
                                            <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase mt-0.5 border ${
                                                tx.type === 'GOT' 
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                            }`}>
                                                {tx.type === 'GOT' ? 'Credit' : 'Debit'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                                        <span>{merchant?.email || ''}</span>
                                        <span className="font-mono">{new Date(tx.timestamp).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        );
    };

    const renderLinks = () => {
        const filteredLinks = customers.filter(customer => {
            const merchant = users.find(u => u.id === customer.userId);
            const search = linkSearchTerm.toLowerCase();
            return (
                customer.name?.toLowerCase().includes(search) ||
                customer.id?.toLowerCase().includes(search) ||
                merchant?.name?.toLowerCase().includes(search)
            );
        });

        return (
            <div className="space-y-4 md:space-y-6 animate-in fade-in duration-300">
                {/* Header & Search Bar */}
                <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">Public Customer Share Links</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Monitoring all live ledger share links accessible by customers</p>
                    </div>
                    <div className="relative w-full sm:w-64 shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input 
                            type="text"
                            placeholder="Search customer, ID, merchant..."
                            value={linkSearchTerm}
                            onChange={(e) => setLinkSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 focus:bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                            <tr>
                                <th className="px-5 py-3">Customer Party</th>
                                <th className="px-5 py-3">Owner (Merchant)</th>
                                <th className="px-5 py-3 text-center">Link Scope</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredLinks.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-400">
                                        No shared links match your search filter
                                    </td>
                                </tr>
                            ) : (
                                filteredLinks.map(customer => {
                                    const merchant = users.find(u => u.id === customer.userId);
                                    const shareUrl = `${window.location.origin}/customer/share/${customer.id}`;
                                    const isCopied = copiedId === customer.id;
                                    return (
                                        <tr key={customer.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <p className="font-bold text-slate-900">{customer.name}</p>
                                                <p className="text-[11px] font-mono text-slate-400">ID: {customer.id}</p>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <p className="font-semibold text-slate-800">{merchant?.name || 'Unknown'}</p>
                                                <p className="text-[11px] text-slate-400">{merchant?.email}</p>
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                <span className="bg-blue-50 text-[#0057BB] border border-blue-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                                                    Live Ledger View
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleCopyLink(customer.id)}
                                                        className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                                                            isCopied 
                                                                ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                                                                : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
                                                        }`}
                                                    >
                                                        {isCopied ? <CheckCircle2 size={13} className="text-emerald-600" /> : <LinkIcon size={13} className="text-slate-500" />}
                                                        <span>{isCopied ? 'Copied!' : 'Copy Link'}</span>
                                                    </button>
                                                    <a
                                                        href={shareUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
                                                        title="Open in new tab"
                                                    >
                                                        <ExternalLink size={14} />
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden space-y-3">
                    {filteredLinks.length === 0 ? (
                        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
                            No shared links found matching "{linkSearchTerm}"
                        </div>
                    ) : (
                        filteredLinks.map(customer => {
                            const merchant = users.find(u => u.id === customer.userId);
                            const shareUrl = `${window.location.origin}/customer/share/${customer.id}`;
                            const isCopied = copiedId === customer.id;
                            return (
                                <div key={customer.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-900 text-sm truncate">{customer.name}</p>
                                            <p className="text-[11px] font-mono text-slate-400 truncate">ID: {customer.id}</p>
                                        </div>
                                        <span className="bg-blue-50 text-[#0057BB] border border-blue-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0">
                                            Live Ledger
                                        </span>
                                    </div>

                                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
                                        <span className="text-slate-500 font-medium">Merchant:</span>
                                        <span className="font-semibold text-slate-800 truncate ml-2">{merchant?.name || 'Unknown'}</span>
                                    </div>

                                    <div className="flex items-center gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => handleCopyLink(customer.id)}
                                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                                isCopied 
                                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                                                    : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
                                            }`}
                                        >
                                            {isCopied ? <CheckCircle2 size={13} className="text-emerald-600" /> : <LinkIcon size={13} className="text-slate-500" />}
                                            <span>{isCopied ? 'Link Copied!' : 'Copy Share Link'}</span>
                                        </button>
                                        <a
                                            href={shareUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center cursor-pointer shrink-0"
                                            title="Open in new tab"
                                        >
                                            <ExternalLink size={14} />
                                        </a>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        );
    };



    const renderSettings = () => (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
            {/* Left Column: Global Feature Toggles */}
            <div className="bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-xs space-y-6 flex flex-col justify-between">
                <div>
                    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3 mb-4">
                        <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                            <Settings size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Platform Feature Controls</h3>
                            <p className="text-[11px] text-slate-500">Toggle system modules and security policies in real time</p>
                        </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {[
                            { key: 'emailNotifications', label: 'Email Notifications', desc: 'Send automated transactional and ledger alerts to users', icon: Mail },
                            { key: 'shareLinks', label: 'Customer Share Links', desc: 'Enable live balance and transaction share links for parties', icon: LinkIcon },
                            { key: 'pdfExport', label: 'PDF Report Export', desc: 'Allow downloading party statements and balance sheet PDFs', icon: Download },
                            { key: 'analytics', label: 'Merchant Analytics', desc: 'Display volume charts and financial summary metrics', icon: BarChart3 },
                            { key: 'newRegistrations', label: 'New Registrations', desc: 'Allow new merchants to sign up and create accounts', icon: Users },
                            { key: 'captcha', label: 'Security Captcha', desc: 'Require verification challenges on sensitive auth actions', icon: ShieldCheck },
                            { key: 'signupWithMail', label: 'Email/Password Signup', desc: 'Allow direct email and password authentication', icon: Mail }
                        ].map((feature, i) => (
                            <div key={i} className="py-3.5 flex items-center justify-between gap-4 first:pt-1 last:pb-1">
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="p-2 bg-slate-50 text-slate-600 rounded-lg shrink-0 mt-0.5 border border-slate-100">
                                        <feature.icon size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-900 leading-tight">{feature.label}</p>
                                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{feature.desc}</p>
                                    </div>
                                </div>
                                
                                <button
                                    type="button"
                                    onClick={() => handleToggleSetting(feature.key)}
                                    className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${globalSettings[feature.key] ? 'bg-[#0057BB]' : 'bg-slate-200'}`}
                                >
                                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${globalSettings[feature.key] ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
                    <span>Toggles update instantly across all connected client sessions.</span>
                </div>
            </div>

            {/* Right Column: Email Integrations & Database Tools */}
            <div className="space-y-6">
                {/* Primary EmailJS Gateway */}
                <div className="bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                        <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                            <Mail size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">EmailJS — Transactional Gateway</h3>
                            <p className="text-[11px] text-slate-500">Primary service for welcome emails and general alerts</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Service ID</label>
                            <input 
                                type="text" 
                                value={emailJSConfig.serviceId || ''} 
                                onChange={(e) => setEmailJSConfig({...emailJSConfig, serviceId: e.target.value.trim()})}
                                placeholder="service_xxxx"
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 font-mono transition-colors" 
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Welcome Template ID</label>
                                <input 
                                    type="text" 
                                    value={emailJSConfig.welcomeTemplateId || emailJSConfig.templateId || ''} 
                                    onChange={(e) => setEmailJSConfig({...emailJSConfig, welcomeTemplateId: e.target.value.trim()})}
                                    placeholder="template_xxxx"
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 font-mono transition-colors" 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Alerts Template ID</label>
                                <input 
                                    type="text" 
                                    value={emailJSConfig.alertTemplateId || emailJSConfig.templateId || ''} 
                                    onChange={(e) => setEmailJSConfig({...emailJSConfig, alertTemplateId: e.target.value.trim()})}
                                    placeholder="template_yyyy"
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 font-mono transition-colors" 
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Public Key</label>
                            <input 
                                type="text" 
                                value={emailJSConfig.publicKey || ''} 
                                onChange={(e) => setEmailJSConfig({...emailJSConfig, publicKey: e.target.value.trim()})}
                                placeholder="public_key_xxxx"
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 font-mono transition-colors" 
                            />
                        </div>

                        <div className="pt-1">
                            <button 
                                type="button"
                                onClick={handleSaveEmailJS}
                                className="w-full py-2 px-4 bg-[#0057BB] hover:bg-[#00479e] text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                            >
                                <CheckCircle2 size={14} />
                                <span>Save EmailJS Configuration</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Payment Verification EmailJS */}
                <div className="bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                        <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                            <ShieldCheck size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Payment Verification Gateway</h3>
                            <p className="text-[11px] text-slate-500">Dedicated pipeline for payment approvals and OTP alerts</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Service ID</label>
                                <input 
                                    type="text" 
                                    value={paymentEmailJS.serviceId || ''} 
                                    onChange={(e) => setPaymentEmailJS({...paymentEmailJS, serviceId: e.target.value.trim()})}
                                    placeholder="service_payment"
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 font-mono transition-colors" 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Verification Template ID</label>
                                <input 
                                    type="text" 
                                    value={paymentEmailJS.templateId || ''} 
                                    onChange={(e) => setPaymentEmailJS({...paymentEmailJS, templateId: e.target.value.trim()})}
                                    placeholder="template_payment"
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 font-mono transition-colors" 
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Public Key</label>
                            <input 
                                type="text" 
                                value={paymentEmailJS.publicKey || ''} 
                                onChange={(e) => setPaymentEmailJS({...paymentEmailJS, publicKey: e.target.value.trim()})}
                                placeholder="public_key_xxxx"
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 font-mono transition-colors" 
                            />
                        </div>

                        <div className="pt-1">
                            <button 
                                type="button"
                                onClick={handleSaveEmailJS}
                                className="w-full py-2 px-4 bg-[#0057BB] hover:bg-[#00479e] text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                            >
                                <CheckCircle2 size={14} />
                                <span>Save Payment Email Configuration</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Database Tools */}
                <div className="bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 text-slate-700 rounded-lg shrink-0">
                            <Database size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Database Tools &amp; Backups</h3>
                            <p className="text-[11px] text-slate-500">Export full JSON snapshot or restore database records</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={handleExportDatabase}
                            className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <Download size={13} />
                            <span>Export</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => document.getElementById('db-import-input').click()}
                            className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <Upload size={13} />
                            <span>Import</span>
                        </button>
                        <input 
                            id="db-import-input"
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={handleImportDatabase}
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderStorage = () => (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header & Overview Banner */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 md:p-6 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cloudflare R2 Object Storage</span>
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Media Storage &amp; Asset Pipeline</h2>
                        <p className="text-xs text-slate-500 max-w-2xl">
                            S3-compatible object storage for customer profile pictures, payment proofs, and transaction receipts served via high-speed global CDN.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                        <a 
                            href={r2Config.publicUrl || "https://cdn.backend.hisabkhata.sumanonline.com"} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                            <span>Open Public CDN</span>
                            <ExternalLink size={13} className="text-slate-500" />
                        </a>
                    </div>
                </div>
            </div>

            {/* Folder Directory Mapping Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-start gap-3">
                    <div className="w-9 h-9 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <FolderTree size={18} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Avatars</p>
                        <p className="text-xs font-mono font-bold text-slate-900 truncate">/cust_profile_pictures/</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Merchant &amp; party photos</p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-start gap-3">
                    <div className="w-9 h-9 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <FolderTree size={18} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Proofs</p>
                        <p className="text-xs font-mono font-bold text-slate-900 truncate">/payment_proof/</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">UPI screenshots &amp; bank slips</p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-start gap-3">
                    <div className="w-9 h-9 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <FolderTree size={18} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Invoices &amp; Bills</p>
                        <p className="text-xs font-mono font-bold text-slate-900 truncate">/transaction_attachments/</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Bill receipts &amp; documents</p>
                    </div>
                </div>
            </div>

            {/* Config & Operations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* R2 Credentials Form */}
                <div className="bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
                    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                        <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                            <HardDrive size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Cloudflare R2 Credentials</h3>
                            <p className="text-[11px] text-slate-500">S3 API token with Object Read &amp; Write permissions</p>
                        </div>
                    </div>

                    <div className="space-y-3.5">
                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Cloudflare Account ID</label>
                            <input 
                                type="text" 
                                value={r2Config.accountId || ''} 
                                onChange={(e) => setR2Config({...r2Config, accountId: e.target.value.trim()})}
                                placeholder="e.g. 38b68cd5accf718d6e09b..."
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 font-mono transition-colors" 
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">R2 Access Key ID</label>
                                <input 
                                    type="text" 
                                    value={r2Config.accessKeyId || ''} 
                                    onChange={(e) => setR2Config({...r2Config, accessKeyId: e.target.value.trim()})}
                                    placeholder="Access Key ID"
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 font-mono transition-colors" 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">R2 Secret Access Key</label>
                                <input 
                                    type="password" 
                                    value={r2Config.secretAccessKey || ''} 
                                    onChange={(e) => setR2Config({...r2Config, secretAccessKey: e.target.value.trim()})}
                                    placeholder="Secret Access Key"
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 font-mono transition-colors" 
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Bucket Name</label>
                                <input 
                                    type="text" 
                                    value={r2Config.bucketName || 'hisabkhata'} 
                                    onChange={(e) => setR2Config({...r2Config, bucketName: e.target.value.trim()})}
                                    placeholder="hisabkhata"
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors" 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Public CDN URL</label>
                                <input 
                                    type="text" 
                                    value={r2Config.publicUrl || ''} 
                                    onChange={(e) => setR2Config({...r2Config, publicUrl: e.target.value.trim()})}
                                    placeholder="https://cdn.backend.hisabkhata.sumanonline.com"
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors" 
                                />
                            </div>
                        </div>

                        {/* Test Status Banner */}
                        {r2TestResult && (
                            <div className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2.5 ${r2TestResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                                {r2TestResult.success ? <CheckCircle size={16} className="text-emerald-600 shrink-0" /> : <AlertCircle size={16} className="text-rose-600 shrink-0" />}
                                <span>{r2TestResult.message}</span>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                            <button 
                                type="button"
                                onClick={handleTestR2}
                                disabled={r2Testing}
                                className="flex-1 py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 border border-slate-300 disabled:opacity-50 cursor-pointer"
                            >
                                <RefreshCw size={13} className={r2Testing ? "animate-spin" : ""} />
                                <span>{r2Testing ? "Testing Connection..." : "Test Connection"}</span>
                            </button>
                            <button 
                                type="button"
                                onClick={handleSaveR2Config}
                                className="flex-1 py-2 px-4 bg-[#0057BB] hover:bg-[#00479e] text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                            >
                                <CheckCircle2 size={14} />
                                <span>Save R2 Config</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Base64 to R2 Migration Engine */}
                <div className="bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-5">
                    <div>
                        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                                <Database size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Base64 &rarr; Cloudflare R2 Migration</h3>
                                <p className="text-[11px] text-slate-500">Scan Firebase RTDB and migrate legacy base64 images</p>
                            </div>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed mt-3.5">
                            Scans your Firebase database for heavy base64 strings in customer photos, transaction attachments, and payment proofs. It uploads each item to Cloudflare R2 and replaces the database fields with CDN links.
                        </p>
                    </div>

                    {/* Progress Bar */}
                    {(migrationState.isRunning || migrationState.status === 'COMPLETED' || migrationState.status === 'ERROR') && (
                        <div className="space-y-2.5 bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <div className="flex justify-between items-center text-xs font-semibold">
                                <span className="text-slate-700">{migrationState.message || 'Processing...'}</span>
                                <span className="text-[#0057BB] font-mono">{migrationState.progress}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-[#0057BB] transition-all duration-300 rounded-full"
                                    style={{ width: `${migrationState.progress}%` }}
                                />
                            </div>
                            {migrationState.stats && (
                                <div className="grid grid-cols-4 gap-2 text-center pt-1 text-[10px] font-semibold text-slate-600">
                                    <div className="bg-white p-1.5 rounded border border-slate-200">
                                        <p className="text-slate-900 text-xs font-bold">{migrationState.stats.users || 0}</p>
                                        <p className="text-[10px] text-slate-400">Users</p>
                                    </div>
                                    <div className="bg-white p-1.5 rounded border border-slate-200">
                                        <p className="text-slate-900 text-xs font-bold">{migrationState.stats.customers || 0}</p>
                                        <p className="text-[10px] text-slate-400">Parties</p>
                                    </div>
                                    <div className="bg-white p-1.5 rounded border border-slate-200">
                                        <p className="text-slate-900 text-xs font-bold">{migrationState.stats.transactions || 0}</p>
                                        <p className="text-[10px] text-slate-400">Bills</p>
                                    </div>
                                    <div className="bg-white p-1.5 rounded border border-slate-200">
                                        <p className="text-slate-900 text-xs font-bold">{migrationState.stats.pendingPayments || 0}</p>
                                        <p className="text-[10px] text-slate-400">Proofs</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-2">
                        <button
                            onClick={handleStartMigration}
                            disabled={migrationState.isRunning}
                            className="w-full py-2.5 px-4 bg-[#0057BB] hover:bg-[#00479e] text-white rounded-lg font-semibold text-xs transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                            {migrationState.isRunning ? (
                                <>
                                    <RefreshCw size={14} className="animate-spin" />
                                    <span>Migrating Assets to R2...</span>
                                </>
                            ) : (
                                <>
                                    <Play size={14} />
                                    <span>Run Full Migration Now</span>
                                </>
                            )}
                        </button>
                        <p className="text-[11px] text-center text-slate-400">
                            Safe &amp; idempotent: already-migrated images are automatically skipped.
                        </p>
                    </div>
                </div>
            </div>

            {/* Migration Logs Terminal */}
            {migrationState.logs && migrationState.logs.length > 0 && (
                <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 text-slate-300 font-mono text-xs shadow-sm space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-slate-300 font-semibold flex items-center gap-2 text-xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Live Migration Activity Log
                        </span>
                        <span className="text-slate-500 text-[10px]">{migrationState.logs.length} Events</span>
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1 custom-scrollbar text-[11px]">
                        {migrationState.logs.map((log, idx) => (
                            <div key={idx} className="leading-relaxed hover:text-white transition-colors">
                                {log}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="flex min-h-screen bg-[#F8FAFC] overflow-hidden">
            <Sidebar />

            <main className="flex-1 md:ml-[260px] flex flex-col min-w-0 relative h-screen overflow-y-auto">
                {/* Mobile Branded Header */}
                <AppMobileHeader 
                    rightElement={
                        <div className="w-8 h-8 rounded-full border border-blue-100 p-0.5 overflow-hidden">
                            {userData?.photoURL ? (
                                <img src={userData.photoURL} alt="" className="w-full h-full object-cover rounded-full" />
                            ) : (
                                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-[10px]">{initial}</div>
                            )}
                        </div>
                    }
                />
                {/* Page Title — Compact High Fidelity Branding */}
                <div className="bg-white border-b border-gray-200 px-6 py-2 md:py-3 flex items-center justify-between sticky top-0 md:static z-20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-100 shrink-0">
                            <ShieldCheck className="text-white w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <div>
                            <h1 className="text-[17px] md:text-[19px] font-black text-gray-900 tracking-tight leading-none uppercase">Admin Console</h1>
                            <p className="text-[#8eacc0] text-[10px] mt-1 uppercase tracking-[0.2em] font-black leading-none">{activeTab} View</p>
                        </div>
                    </div>
                    
                    <div className="hidden md:flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-sm font-bold text-slate-900 leading-none">{displayName}</p>
                            <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest mt-1">Active Session</p>
                        </div>
                        <div className="w-10 h-10 rounded-full border-2 border-blue-100 p-0.5 overflow-hidden">
                            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-sm">
                                {userData?.photoURL ? (
                                    <img src={userData.photoURL} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    initial
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 md:p-8 max-w-7xl mx-auto w-full flex-1 pb-24 md:pb-8">
                    {/* Compact Clean Tab Bar */}
                    <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-5 w-full overflow-x-auto scrollbar-hide border border-slate-200/80">
                        {[
                            { id: 'OVERVIEW', label: 'Stats', icon: BarChart3 },
                            { id: 'USERS', label: 'Users', icon: Users },
                            { id: 'TRANSACTIONS', label: 'Vault', icon: Receipt },
                            { id: 'STORAGE', label: 'R2 Cloud', icon: Cloud },
                            { id: 'LINKS', label: 'Links', icon: LinkIcon },
                            { id: 'SETTINGS', label: 'Config', icon: Settings },
                        ].map((tab) => {
                            const active = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all whitespace-nowrap flex-1 shrink-0 cursor-pointer ${active 
                                        ? 'bg-white text-[#0057BB] shadow-xs border border-slate-200/80 font-bold' 
                                        : 'text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-200/60'
                                    }`}
                                >
                                    <tab.icon size={15} />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-96 space-y-4">
                            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-slate-400 font-bold text-sm animate-pulse">Initializing System Monitoring...</p>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {activeTab === 'OVERVIEW' && renderOverview()}
                            {activeTab === 'USERS' && renderUsers()}
                            {activeTab === 'TRANSACTIONS' && renderTransactions()}
                            {activeTab === 'STORAGE' && renderStorage()}
                            {activeTab === 'LINKS' && renderLinks()}
                            {activeTab === 'SETTINGS' && renderSettings()}
                        </div>
                    )}
                </div>
            </main>
            <BottomNav />
        </div>
    );
};

export default AdminDashboard;

