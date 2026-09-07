import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dbService } from '../services/firebase';
import { parseStatementFile } from '../utils/statementParser';
import { 
    X, 
    Upload, 
    FileText, 
    FileSpreadsheet,
    CheckCircle2, 
    AlertCircle, 
    Check, 
    Trash2, 
    Search,
    Calendar,
    ArrowRight,
    RefreshCw,
    Lock,
    Download,
    ArrowLeftRight,
    User,
    Users
} from 'lucide-react';

const ImportTransactionsModal = ({ isOpen, onClose, customer, onSuccess }) => {
    const { currentUser } = useAuth();
    const fileInputRef = useRef(null);

    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState(null);
    const [isParsing, setIsParsing] = useState(false);
    const [parseError, setParseError] = useState('');
    const [parsedData, setParsedData] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [perspective, setPerspective] = useState('MERCHANT');
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [resetBalance, setResetBalance] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importSuccess, setImportSuccess] = useState(false);
    const [importedCount, setImportedCount] = useState(0);

    if (!isOpen || !customer) return null;

    const resetState = () => {
        setFile(null);
        setParsedData(null);
        setTransactions([]);
        setPerspective('MERCHANT');
        setParseError('');
        setIsParsing(false);
        setIsImporting(false);
        setImportSuccess(false);
        setImportedCount(0);
        setSearchQuery('');
        setTypeFilter('ALL');
        setResetBalance(false);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handlePerspectiveChange = (newPerspective) => {
        if (newPerspective === perspective) return;
        setPerspective(newPerspective);
        setTransactions(prev => prev.map(t => ({
            ...t,
            type: t.type === 'GAVE' ? 'GOT' : 'GAVE'
        })));
    };

    const invertAllTransactionTypes = () => {
        setPerspective(prev => prev === 'MERCHANT' ? 'CUSTOMER' : 'MERCHANT');
        setTransactions(prev => prev.map(t => ({
            ...t,
            type: t.type === 'GAVE' ? 'GOT' : 'GAVE'
        })));
    };

    const handleFile = async (selectedFile) => {
        if (!selectedFile) return;
        setFile(selectedFile);
        setIsParsing(true);
        setParseError('');

        try {
            const result = await parseStatementFile(selectedFile);
            if (!result || !result.transactions || result.transactions.length === 0) {
                throw new Error("No transaction entries could be extracted. Please ensure the file contains valid columns for date, debit/credit amounts, and remarks.");
            }
            setParsedData(result);
            
            const initialTransactions = result.transactions.map(t => {
                if (perspective === 'CUSTOMER') {
                    return {
                        ...t,
                        type: t.type === 'GAVE' ? 'GOT' : 'GAVE'
                    };
                }
                return t;
            });
            setTransactions(initialTransactions);
        } catch (err) {
            console.error("Statement parse failed:", err);
            setParseError(err.message || "Unable to read this file format. Please upload a standard PDF or Excel statement.");
        } finally {
            setIsParsing(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const toggleSelectAll = () => {
        const areAllSelected = transactions.every(t => t.selected);
        setTransactions(prev => prev.map(t => ({ ...t, selected: !areAllSelected })));
    };

    const toggleTransaction = (id) => {
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t));
    };

    const toggleTransactionType = (id) => {
        setTransactions(prev => prev.map(t => {
            if (t.id === id) {
                return { ...t, type: t.type === 'GAVE' ? 'GOT' : 'GAVE' };
            }
            return t;
        }));
    };

    const updateTransactionField = (id, field, value) => {
        setTransactions(prev => prev.map(t => {
            if (t.id === id) {
                return { ...t, [field]: value };
            }
            return t;
        }));
    };

    const removeTransaction = (id) => {
        setTransactions(prev => prev.filter(t => t.id !== id));
    };

    const visibleTransactions = transactions.filter(t => {
        const matchesSearch = searchQuery === '' || 
            (t.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.date || '').includes(searchQuery) ||
            String(t.amount).includes(searchQuery);

        const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
        return matchesSearch && matchesType;
    });

    const selectedTransactions = transactions.filter(t => t.selected);

    const totalSelectedGave = selectedTransactions.filter(t => t.type === 'GAVE').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const totalSelectedGot = selectedTransactions.filter(t => t.type === 'GOT').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const netDifference = totalSelectedGot - totalSelectedGave;

    const handleImport = async () => {
        if (selectedTransactions.length === 0 || !currentUser) return;
        setIsImporting(true);

        try {
            const res = await dbService.importCustomerTransactions(
                currentUser.uid,
                customer.id,
                selectedTransactions,
                {
                    resetExistingBalance: resetBalance,
                    openingBalance: parsedData?.meta?.openingBalance || 0
                }
            );

            setImportedCount(res.count);
            setImportSuccess(true);
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error("Import failed:", err);
            alert("Import failed: " + err.message);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex flex-col justify-end md:justify-center md:items-center p-0 md:p-6 overflow-hidden">
            <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity" onClick={handleClose} />

            <div className="relative w-full md:max-w-4xl bg-white rounded-t-[28px] md:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] md:max-h-[90vh] z-10 border-t md:border border-slate-200">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-2.5 mb-1 md:hidden" />

                <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-white">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm sm:text-base font-bold text-slate-900">
                                Import Statement
                            </h2>
                            <span className="text-xs text-slate-300">•</span>
                            <span className="text-[11px] sm:text-xs text-blue-600 bg-blue-50 font-semibold px-2 py-0.5 rounded-full">
                                Step {importSuccess ? '3' : parsedData ? '2' : '1'} of {importSuccess ? '3' : '2'}
                            </span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                            Customer: <span className="font-semibold text-slate-800">{customer.name}</span>
                            {customer.phone && <span className="text-slate-400 font-normal"> (+91 {customer.phone})</span>}
                        </p>
                    </div>

                    <button 
                        onClick={handleClose}
                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                        title="Close"
                    >
                        <X size={17} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 custom-scrollbar">
                    {importSuccess ? (
                        <div className="py-8 sm:py-12 px-2 max-w-md mx-auto text-center space-y-4">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs border border-emerald-100">
                                <CheckCircle2 size={32} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-base sm:text-lg font-bold text-slate-900">Import Completed</h3>
                                <p className="text-xs text-slate-500">
                                    Successfully added <strong className="text-slate-800 font-semibold">{importedCount} transactions</strong> to {customer.name}'s khata.
                                </p>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs text-left space-y-2.5 text-xs">
                                <div className="flex justify-between text-slate-600">
                                    <span>Imported Records:</span>
                                    <span className="font-semibold text-slate-900">{importedCount}</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>Total Debit (Gave):</span>
                                    <span className="font-semibold text-rose-600">₹{totalSelectedGave.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>Total Credit (Got):</span>
                                    <span className="font-semibold text-emerald-600">₹{totalSelectedGot.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                                <button
                                    onClick={handleClose}
                                    className="flex-1 px-4 py-3 bg-[#0057BB] text-white text-xs font-semibold rounded-xl hover:bg-[#00479e] transition-colors shadow-sm cursor-pointer active:scale-[0.98]"
                                >
                                    Done
                                </button>
                                <button
                                    onClick={resetState}
                                    className="px-4 py-3 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer active:scale-[0.98]"
                                >
                                    Import Another File
                                </button>
                            </div>
                        </div>
                    ) : !parsedData ? (
                        <div className="max-w-2xl mx-auto space-y-4 sm:space-y-5">
                            {parseError && (
                                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
                                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                                    <div className="space-y-0.5">
                                        <p className="font-semibold">Unable to process file</p>
                                        <p className="text-rose-700">{parseError}</p>
                                    </div>
                                </div>
                            )}

                            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-4.5 space-y-3 shadow-xs">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                    <span className="text-xs font-bold text-slate-800">Who provided or exported this statement?</span>
                                    <span className="text-[11px] text-slate-400">Can also be switched in review</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setPerspective('MERCHANT')}
                                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                                            perspective === 'MERCHANT'
                                                ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                                                : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className={`p-2 rounded-lg ${perspective === 'MERCHANT' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                            <User size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-xs font-bold text-slate-800">My Statement (Merchant)</p>
                                                {perspective === 'MERCHANT' && <span className="text-[10px] bg-blue-100 text-blue-700 font-semibold px-1.5 py-0.2 rounded">Active</span>}
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">Gave = You gave credit. Got = You received payment.</p>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPerspective('CUSTOMER')}
                                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                                            perspective === 'CUSTOMER'
                                                ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                                                : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className={`p-2 rounded-lg ${perspective === 'CUSTOMER' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                            <ArrowLeftRight size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-xs font-bold text-slate-800">Customer's Statement</p>
                                                {perspective === 'CUSTOMER' && <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.2 rounded">Inverted</span>}
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">Provided by {customer.name}. Automatically inverts Gave & Got.</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onClick={() => !isParsing && fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-6 sm:p-10 text-center cursor-pointer transition-all bg-white flex flex-col items-center justify-center ${
                                    isDragging 
                                        ? 'border-blue-600 bg-blue-50/50 ring-4 ring-blue-50' 
                                        : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 shadow-xs'
                                }`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.xlsx,.xls,.csv"
                                    className="hidden"
                                    onChange={(e) => handleFile(e.target.files[0])}
                                />

                                {isParsing ? (
                                    <div className="py-4 flex flex-col items-center gap-3">
                                        <RefreshCw size={28} className="animate-spin text-blue-600" />
                                        <div className="space-y-0.5">
                                            <p className="text-sm font-semibold text-slate-800">Reading Statement Data...</p>
                                            <p className="text-xs text-slate-500">Extracting transaction rows, dates, and amounts</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="w-13 h-13 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto ring-4 ring-blue-50/50">
                                            <Upload size={24} />
                                        </div>
                                        <div>
                                            <p className="text-xs sm:text-sm font-bold text-slate-800">
                                                Drop your statement file here, or <span className="text-blue-600 hover:underline">browse</span>
                                            </p>
                                            <p className="text-[11px] sm:text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                                Supports Khatabook PDF, Excel (.xlsx, .xls), and standard CSV statements
                                            </p>
                                        </div>
                                        <div className="pt-2 flex items-center justify-center gap-3 text-[11px] text-slate-400 font-medium">
                                            <span>Max file size: 25 MB</span>
                                            <span>•</span>
                                            <span>Auto-detects columns</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
                                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                                    Supported Source Formats
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5">
                                        <FileText size={16} className="text-rose-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold text-slate-800">Khatabook PDF</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">Direct statement export with balance audit</p>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5">
                                        <FileSpreadsheet size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold text-slate-800">Excel (.xlsx, .xls)</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">Custom or downloaded ledger spreadsheets</p>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5">
                                        <FileText size={16} className="text-slate-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold text-slate-800">CSV Export</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">Comma-separated tabular accounting records</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 justify-center pb-2">
                                <Lock size={12} />
                                <span>Parsed securely in-browser. Files are not uploaded to third-party servers.</span>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs shadow-xs">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-medium shrink-0">
                                        <FileText size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-900 truncate max-w-xs sm:max-w-md">{file?.name}</p>
                                        <p className="text-[11px] text-slate-500">
                                            {transactions.length} rows detected {parsedData.meta?.dateRange && `• ${parsedData.meta.dateRange}`}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 sm:gap-4 text-xs ml-auto">
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Gave (Debit)</span>
                                        <span className="font-bold text-rose-600">₹{totalSelectedGave.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="border-l border-slate-200 pl-3 sm:pl-4">
                                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Got (Credit)</span>
                                        <span className="font-bold text-emerald-600">₹{totalSelectedGot.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="border-l border-slate-200 pl-3 sm:pl-4">
                                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Net Balance</span>
                                        <span className={`font-bold ${netDifference >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                            ₹{Math.abs(netDifference).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {netDifference >= 0 ? '(Cr)' : '(Dr)'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={resetState}
                                        className="ml-2 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer font-medium"
                                    >
                                        Change
                                    </button>
                                </div>
                            </div>

                            <div className="bg-slate-100/90 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-xs font-bold text-slate-800">Perspective:</span>
                                    <div className="inline-flex rounded-lg border border-slate-300/80 bg-white p-0.5 text-xs font-medium">
                                        <button
                                            type="button"
                                            onClick={() => handlePerspectiveChange('MERCHANT')}
                                            className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                                                perspective === 'MERCHANT'
                                                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            <User size={13} />
                                            <span>Merchant</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handlePerspectiveChange('CUSTOMER')}
                                            className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                                                perspective === 'CUSTOMER'
                                                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            <ArrowLeftRight size={13} />
                                            <span>Customer View</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-slate-500">
                                        {perspective === 'CUSTOMER' ? "Customer gave = Your Credit (Got)" : "You gave = Your Debit (Gave)"}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={invertAllTransactionTypes}
                                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                        title="Invert all Debit / Credit types"
                                    >
                                        <ArrowLeftRight size={12} className="text-slate-500" />
                                        <span>Swap All</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                                    <button
                                        type="button"
                                        onClick={toggleSelectAll}
                                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                                    >
                                        <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[10px] ${transactions.every(t => t.selected) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-400 bg-white'}`}>
                                            {transactions.every(t => t.selected) && <Check size={10} />}
                                        </span>
                                        <span>{transactions.every(t => t.selected) ? 'Deselect All' : 'Select All'}</span>
                                    </button>

                                    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium shrink-0">
                                        <button
                                            onClick={() => setTypeFilter('ALL')}
                                            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${typeFilter === 'ALL' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                                        >
                                            All ({transactions.length})
                                        </button>
                                        <button
                                            onClick={() => setTypeFilter('GAVE')}
                                            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${typeFilter === 'GAVE' ? 'bg-rose-50 text-rose-700 font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                                        >
                                            Debit ({transactions.filter(t => t.type === 'GAVE').length})
                                        </button>
                                        <button
                                            onClick={() => setTypeFilter('GOT')}
                                            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${typeFilter === 'GOT' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                                        >
                                            Credit ({transactions.filter(t => t.type === 'GOT').length})
                                        </button>
                                    </div>
                                </div>

                                <div className="relative flex-1 max-w-full sm:max-w-xs">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search remarks, amount..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
                                <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200 z-10 text-[11px]">
                                            <tr>
                                                <th className="p-2.5 w-10 text-center">
                                                    <span className="sr-only">Select</span>
                                                </th>
                                                <th className="p-2.5 w-28">Date</th>
                                                <th className="p-2.5">Description</th>
                                                <th className="p-2.5 w-28 text-center">Type</th>
                                                <th className="p-2.5 w-28 text-right">Amount (₹)</th>
                                                <th className="p-2.5 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {visibleTransactions.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="p-8 text-center text-slate-400">
                                                        No transactions match your search filter
                                                    </td>
                                                </tr>
                                            ) : (
                                                visibleTransactions.map((tx) => (
                                                    <tr 
                                                        key={tx.id} 
                                                        className={`hover:bg-slate-50/70 transition-colors ${!tx.selected ? 'opacity-40 bg-slate-50/40' : ''}`}
                                                    >
                                                        <td className="p-2.5 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={tx.selected}
                                                                onChange={() => toggleTransaction(tx.id)}
                                                                className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                                                            />
                                                        </td>
                                                        <td className="p-2.5">
                                                            <input
                                                                type="date"
                                                                value={tx.date}
                                                                onChange={(e) => updateTransactionField(tx.id, 'date', e.target.value)}
                                                                className="w-full bg-transparent text-slate-800 outline-none border-b border-transparent focus:border-blue-500 py-0.5 text-xs"
                                                            />
                                                        </td>
                                                        <td className="p-2.5">
                                                            <input
                                                                type="text"
                                                                value={tx.description}
                                                                onChange={(e) => updateTransactionField(tx.id, 'description', e.target.value)}
                                                                className="w-full bg-transparent text-slate-800 outline-none border-b border-transparent focus:border-blue-500 py-0.5 text-xs"
                                                                placeholder="Enter description"
                                                            />
                                                        </td>
                                                        <td className="p-2.5 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleTransactionType(tx.id)}
                                                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
                                                                    tx.type === 'GAVE'
                                                                        ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                                }`}
                                                                title="Click to toggle type"
                                                            >
                                                                {tx.type === 'GAVE' ? 'Debit (Gave)' : 'Credit (Got)'}
                                                            </button>
                                                        </td>
                                                        <td className="p-2.5 text-right">
                                                            <div className="flex items-center justify-end gap-1 font-mono font-medium">
                                                                <span className="text-slate-400">₹</span>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0"
                                                                    value={tx.amount}
                                                                    onChange={(e) => updateTransactionField(tx.id, 'amount', parseFloat(e.target.value) || 0)}
                                                                    className={`w-20 text-right outline-none border-b border-transparent focus:border-blue-500 py-0.5 bg-transparent font-bold ${
                                                                        tx.type === 'GAVE' ? 'text-rose-600' : 'text-emerald-600'
                                                                    }`}
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="p-2.5 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeTransaction(tx.id)}
                                                                className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                                                                title="Exclude row"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {parsedData && !importSuccess && (
                    <div className="px-5 sm:px-6 py-3 sm:py-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="text-xs text-slate-500 text-center sm:text-left">
                            Selected <strong className="text-slate-800 font-bold">{selectedTransactions.length}</strong> of {transactions.length} entries for import
                        </div>

                        <div className="flex items-center gap-2.5 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 sm:flex-none px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={selectedTransactions.length === 0 || isImporting}
                                onClick={handleImport}
                                className="flex-1 sm:flex-none px-5 py-2.5 bg-[#0057BB] text-white rounded-xl text-xs font-semibold hover:bg-[#00479e] transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                            >
                                {isImporting ? (
                                    <>
                                        <RefreshCw size={13} className="animate-spin" />
                                        <span>Importing {selectedTransactions.length} Entries...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check size={14} />
                                        <span>Confirm & Import ({selectedTransactions.length})</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImportTransactionsModal;
