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

    const renderTransactions = () => (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px]">
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">Global Monitoring</h3>
                    <p className="text-slate-400 text-xs">Viewing every transaction across all users for safety & auditing.</p>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text"
                            placeholder="Filter transactions..."
                            value={txSearchTerm}
                            onChange={(e) => setTxSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-slate-100 focus:bg-white border-transparent focus:border-blue-100 border rounded-xl text-sm font-medium transition-all w-[200px] outline-none"
                        />
                    </div>
                    <button 
                        onClick={handleExportTransactionsCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-blue-100"
                    >
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
                            {transactions
                                .filter(tx => {
                                    const merchant = users.find(u => u.id === tx.userId);
                                    const party = customers.find(c => c.id === tx.customerId);
                                    const search = txSearchTerm.toLowerCase();
                                    return (
                                        merchant?.name?.toLowerCase().includes(search) ||
                                        merchant?.email?.toLowerCase().includes(search) ||
                                        party?.name?.toLowerCase().includes(search) ||
                                        tx.type.toLowerCase().includes(search) ||
                                        tx.amount.toString().includes(search)
                                    );
                                })
                                .sort((a, b) => b.timestamp - a.timestamp)
                                .map(tx => {
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
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">Public Shared Links</h3>
                    <p className="text-slate-400 text-xs">Monitoring all live ledger links shared with customers.</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text"
                        placeholder="Search links..."
                        value={linkSearchTerm}
                        onChange={(e) => setLinkSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-slate-50 focus:bg-white border-transparent focus:border-blue-100 border rounded-xl text-sm font-medium transition-all w-[240px] outline-none"
                    />
                </div>
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
                        {customers
                            .filter(customer => {
                                const merchant = users.find(u => u.id === customer.userId);
                                const search = linkSearchTerm.toLowerCase();
                                return (
                                    customer.name?.toLowerCase().includes(search) ||
                                    customer.id?.toLowerCase().includes(search) ||
                                    merchant?.name?.toLowerCase().includes(search)
                                );
                            })
                            .map(customer => {
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
                                        <button 
                                            onClick={() => handleCopyLink(customer.id)}
                                            className={`${copiedId === customer.id ? 'text-green-600' : 'text-blue-600'} hover:underline text-xs font-bold transition-colors`}
                                        >
                                            {copiedId === customer.id ? 'Copied!' : 'Copy Link'}
                                        </button>
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Welcome Template ID</label>
                                <input 
                                    type="text" 
                                    value={emailJSConfig.welcomeTemplateId || emailJSConfig.templateId || ''} 
                                    onChange={(e) => setEmailJSConfig({...emailJSConfig, welcomeTemplateId: e.target.value})}
                                    placeholder="template_xxxx"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500" 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Alerts Template ID</label>
                                <input 
                                    type="text" 
                                    value={emailJSConfig.alertTemplateId || emailJSConfig.templateId || ''} 
                                    onChange={(e) => setEmailJSConfig({...emailJSConfig, alertTemplateId: e.target.value})}
                                    placeholder="template_yyyy"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500" 
                                />
                            </div>
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
                                Save Basic Config
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-3xl text-white space-y-6">
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="text-orange-400" />
                        <h3 className="text-xl font-bold">Payment EmailJS Config</h3>
                    </div>
                    <p className="text-xs text-slate-400">Dedicated account for Verification & Payment Alerts</p>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Service ID</label>
                            <input 
                                type="text" 
                                value={paymentEmailJS.serviceId || ''} 
                                onChange={(e) => setPaymentEmailJS({...paymentEmailJS, serviceId: e.target.value})}
                                placeholder="service_payment"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500" 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Verification Template ID</label>
                            <input 
                                type="text" 
                                value={paymentEmailJS.templateId || ''} 
                                onChange={(e) => setPaymentEmailJS({...paymentEmailJS, templateId: e.target.value})}
                                placeholder="template_payment"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500" 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Public Key</label>
                            <input 
                                type="text" 
                                value={paymentEmailJS.publicKey || ''} 
                                onChange={(e) => setPaymentEmailJS({...paymentEmailJS, publicKey: e.target.value})}
                                placeholder="user_payment"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500" 
                            />
                        </div>
                        <div className="flex gap-4 mt-4">
                            <button 
                                onClick={handleSaveEmailJS}
                                className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                                Save Payment Config
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-orange-50 p-3 rounded-2xl text-orange-600">
                            <Database size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Database Tools</h3>
                            <p className="text-xs text-slate-400">Export as JSON or Restore from Backup.</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleExportDatabase}
                            className="flex-1 sm:flex-none px-6 py-2.5 bg-slate-100 text-slate-900 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                        >
                            <Download size={16} /> Export
                        </button>
                        <button
                            onClick={() => document.getElementById('db-import-input').click()}
                            className="flex-1 sm:flex-none px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                        >
                            <Upload size={16} /> Import
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
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-full text-blue-300 text-xs font-bold tracking-wide">
                            <Cloud size={14} /> Cloudflare R2 Object Storage
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black tracking-tight">Media Storage & Migration Suite</h2>
                        <p className="text-sm text-slate-300 max-w-2xl">
                            High-speed S3-compatible cloud storage for Customer Profile Pictures, Payment Proofs, and Transaction Attachments served via your custom CDN domain.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <a 
                            href={r2Config.publicUrl || "https://cdn.backend.hisabkhata.sumanonline.com"} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 backdrop-blur-sm border border-white/10"
                        >
                            <ExternalLink size={16} /> Open Public CDN
                        </a>
                    </div>
                </div>
            </div>

            {/* Folder Directory Mapping Badges */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold">
                        <FolderTree size={24} />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Profile Pictures</p>
                        <p className="text-sm font-black text-slate-800 font-mono">/cust_profile_pictures/</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Merchant & Customer Avatars</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center font-bold">
                        <FolderTree size={24} />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Payment Proofs</p>
                        <p className="text-sm font-black text-slate-800 font-mono">/payment_proof/</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">UPI Screenshot Proofs</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
                        <FolderTree size={24} />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Transaction Bills</p>
                        <p className="text-sm font-black text-slate-800 font-mono">/transaction_attachments/</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Invoices & Bill Receipts</p>
                    </div>
                </div>
            </div>

            {/* Config & Connection Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* R2 Credentials Form */}
                <div className="bg-slate-900 p-8 rounded-3xl text-white space-y-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl">
                                <HardDrive size={22} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Cloudflare R2 Credentials</h3>
                                <p className="text-xs text-slate-400">S3 API token with Object Read & Write permission</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cloudflare Account ID</label>
                            <input 
                                type="text" 
                                value={r2Config.accountId || ''} 
                                onChange={(e) => setR2Config({...r2Config, accountId: e.target.value.trim()})}
                                placeholder="e.g. 5d8a9f4c3b2e1..."
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-mono" 
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">R2 Access Key ID</label>
                                <input 
                                    type="text" 
                                    value={r2Config.accessKeyId || ''} 
                                    onChange={(e) => setR2Config({...r2Config, accessKeyId: e.target.value.trim()})}
                                    placeholder="Access Key ID"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-mono" 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">R2 Secret Access Key</label>
                                <input 
                                    type="password" 
                                    value={r2Config.secretAccessKey || ''} 
                                    onChange={(e) => setR2Config({...r2Config, secretAccessKey: e.target.value.trim()})}
                                    placeholder="Secret Access Key"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-mono" 
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bucket Name</label>
                                <input 
                                    type="text" 
                                    value={r2Config.bucketName || 'hisabkhata'} 
                                    onChange={(e) => setR2Config({...r2Config, bucketName: e.target.value.trim()})}
                                    placeholder="hisabkhata"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500" 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Public CDN URL</label>
                                <input 
                                    type="text" 
                                    value={r2Config.publicUrl || ''} 
                                    onChange={(e) => setR2Config({...r2Config, publicUrl: e.target.value.trim()})}
                                    placeholder="https://cdn.backend.hisabkhata.sumanonline.com"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500" 
                                />
                            </div>
                        </div>

                        {/* Test Status Banner */}
                        {r2TestResult && (
                            <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-3 ${r2TestResult.success ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                                {r2TestResult.success ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                                <span>{r2TestResult.message}</span>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <button 
                                type="button"
                                onClick={handleTestR2}
                                disabled={r2Testing}
                                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 border border-slate-700 disabled:opacity-50"
                            >
                                <RefreshCw size={14} className={r2Testing ? "animate-spin" : ""} />
                                {r2Testing ? "Testing Connection..." : "Test Connection"}
                            </button>
                            <button 
                                type="button"
                                onClick={handleSaveR2Config}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
                            >
                                <CheckCircle2 size={16} />
                                Save R2 Config
                            </button>
                        </div>
                    </div>
                </div>

                {/* 1-Click Base64 Migration Engine */}
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                                <Sparkles size={22} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">1-Click Base64 &rarr; R2 Migration</h3>
                                <p className="text-xs text-slate-400">Scan Firebase RTDB and migrate all legacy base64 images</p>
                            </div>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed mt-4">
                            This tool automatically discovers any base64-encoded profile photos, customer pictures, transaction attachments, and payment screenshots in your Firebase Realtime Database. It uploads them to Cloudflare R2 and replaces the heavy database fields with CDN links.
                        </p>
                    </div>

                    {/* Progress Bar if running or finished */}
                    {(migrationState.isRunning || migrationState.status === 'COMPLETED' || migrationState.status === 'ERROR') && (
                        <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                            <div className="flex justify-between items-center text-xs font-bold">
                                <span className="text-slate-700">{migrationState.message || 'Processing...'}</span>
                                <span className="text-blue-600 font-mono">{migrationState.progress}%</span>
                            </div>
                            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 rounded-full"
                                    style={{ width: `${migrationState.progress}%` }}
                                />
                            </div>
                            {migrationState.stats && (
                                <div className="grid grid-cols-4 gap-2 text-center pt-2 text-[10px] font-bold text-slate-500">
                                    <div className="bg-white p-2 rounded-lg border border-slate-100">
                                        <p className="text-slate-900 text-sm font-black">{migrationState.stats.users || 0}</p>
                                        <p>Users</p>
                                    </div>
                                    <div className="bg-white p-2 rounded-lg border border-slate-100">
                                        <p className="text-slate-900 text-sm font-black">{migrationState.stats.customers || 0}</p>
                                        <p>Customers</p>
                                    </div>
                                    <div className="bg-white p-2 rounded-lg border border-slate-100">
                                        <p className="text-slate-900 text-sm font-black">{migrationState.stats.transactions || 0}</p>
                                        <p>Bills</p>
                                    </div>
                                    <div className="bg-white p-2 rounded-lg border border-slate-100">
                                        <p className="text-slate-900 text-sm font-black">{migrationState.stats.pendingPayments || 0}</p>
                                        <p>Proofs</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-3">
                        <button
                            onClick={handleStartMigration}
                            disabled={migrationState.isRunning}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white rounded-2xl font-black text-sm tracking-wide transition-all shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {migrationState.isRunning ? (
                                <>
                                    <RefreshCw size={18} className="animate-spin" />
                                    <span>Migrating Assets to R2...</span>
                                </>
                            ) : (
                                <>
                                    <Play size={18} />
                                    <span>Run Full Migration Now</span>
                                </>
                            )}
                        </button>
                        <p className="text-[11px] text-center text-slate-400">
                            Safe & idempotent: already-migrated images are automatically skipped.
                        </p>
                    </div>
                </div>
            </div>

            {/* Migration Logs Terminal */}
            {migrationState.logs && migrationState.logs.length > 0 && (
                <div className="bg-slate-950 rounded-3xl p-6 border border-slate-800 text-slate-300 font-mono text-xs shadow-2xl space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <span className="text-slate-400 font-bold flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live Migration Activity Log
                        </span>
                        <span className="text-slate-600 text-[10px]">{migrationState.logs.length} Events</span>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
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
                    {/* Compact Tab Bar */}
                    <div className="flex gap-1.5 p-1.5 bg-slate-100/80 backdrop-blur-sm rounded-2xl mb-6 w-full overflow-x-auto scrollbar-hide border border-slate-200/50">
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
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap flex-1 justify-center relative overflow-hidden group ${active 
                                        ? 'bg-white text-blue-600 shadow-sm border border-slate-200/20' 
                                        : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    <tab.icon size={active ? 18 : 16} className={`transition-transform duration-300 ${active ? 'scale-110' : ''}`} />
                                    <span className={`${active ? 'block' : 'hidden md:block'} transition-all`}>{tab.label}</span>
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

