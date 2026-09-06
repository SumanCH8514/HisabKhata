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
    const [perspective, setPerspective] = useState('MERCHANT'); // 'MERCHANT' (My View) or 'CUSTOMER' (Customer's View)
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
        // Automatically invert transaction types when switching perspectives
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
            
            // If user selected Customer's POV upfront, invert the initial parsed entries
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

    // Filtered items
    const visibleTransactions = transactions.filter(t => {
        const matchesSearch = searchQuery === '' || 
            (t.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.date || '').includes(searchQuery) ||
            String(t.amount).includes(searchQuery);

        const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
        return matchesSearch && matchesType;
    });

    const selectedTransactions = transactions.filter(t => t.selected);

    // Totals of selected
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
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity" onClick={handleClose} />

            {/* Modal Dialog */}
            <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] z-10 border border-slate-200 animate-in fade-in zoom-in-98 duration-150">
                
                {/* Clean SaaS Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-semibold text-slate-900">
                                Import Statement
                            </h2>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs text-slate-500 font-medium">
                                Step {importSuccess ? '3' : parsedData ? '2' : '1'} of {importSuccess ? '3' : '2'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Customer: <span className="font-semibold text-slate-700">{customer.name}</span>
                            {customer.phone && <span className="text-slate-400 font-normal"> (+91 {customer.phone})</span>}
                        </p>
                    </div>

                    <button 
                        onClick={handleClose}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                        title="Close (Esc)"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">

                    {/* SUCCESS VIEW */}
                    {importSuccess ? (
                        <div className="py-12 px-4 max-w-md mx-auto text-center space-y-4">
                            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                                <CheckCircle2 size={32} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-slate-900">Import Completed</h3>
                                <p className="text-xs text-slate-500">
                                    Successfully added <strong className="text-slate-800 font-semibold">{importedCount} transactions</strong> to {customer.name}'s khata.
                                </p>
                            </div>

                            <div className="bg-white p-4 rounded-lg border border-slate-200 text-left space-y-2 text-xs">
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
                                    className="flex-1 px-4 py-2.5 bg-[#0057BB] text-white text-xs font-semibold rounded-lg hover:bg-[#00479e] transition-colors shadow-sm cursor-pointer"
                                >
                                    Done
                                </button>
                                <button
                                    onClick={resetState}
                                    className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                                >
                                    Import Another File
                                </button>
                            </div>
                        </div>
                    ) : !parsedData ? (
                        /* STEP 1: FILE UPLOAD */
                        <div className="max-w-2xl mx-auto space-y-5">
                            {parseError && (
                                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2.5">
                                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                                    <div className="space-y-0.5">
                                        <p className="font-semibold">Unable to process file</p>
                                        <p className="text-rose-700">{parseError}</p>
                                    </div>
                                </div>
                            )}

                            {/* Perspective / Statement Origin Selection */}
                            <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-800">Who provided or exported this statement?</span>
                                    <span className="text-[11px] text-slate-400">Can also be switched in review</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setPerspective('MERCHANT')}
                                        className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-3 ${
                                            perspective === 'MERCHANT'
                                                ? 'border-[#0057BB] bg-blue-50/50 ring-1 ring-[#0057BB]'
                                                : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                                        }`}
                                    >
                                        <User size={18} className={`shrink-0 mt-0.5 ${perspective === 'MERCHANT' ? 'text-[#0057BB]' : 'text-slate-400'}`} />
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-xs font-bold text-slate-800">My Statement (Merchant)</p>
                                                {perspective === 'MERCHANT' && <span className="text-[10px] bg-blue-100 text-blue-700 font-semibold px-1.5 py-0.2 rounded">Active</span>}
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-0.5">Gave = You gave goods/credit. Got = You received payment.</p>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPerspective('CUSTOMER')}
                                        className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-3 ${
                                            perspective === 'CUSTOMER'
                                                ? 'border-[#0057BB] bg-blue-50/50 ring-1 ring-[#0057BB]'
                                                : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                                        }`}
                                    >
                                        <ArrowLeftRight size={18} className={`shrink-0 mt-0.5 ${perspective === 'CUSTOMER' ? 'text-[#0057BB]' : 'text-slate-400'}`} />
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-xs font-bold text-slate-800">Customer's Statement</p>
                                                {perspective === 'CUSTOMER' && <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.2 rounded">Inverted</span>}
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-0.5">Provided by {customer.name}. Automatically inverts Gave & Got.</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Drop Zone */}
                            <div
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onClick={() => !isParsing && fileInputRef.current?.click()}
                                className={`border border-dashed rounded-xl p-8 sm:p-10 text-center cursor-pointer transition-all bg-white flex flex-col items-center justify-center ${
                                    isDragging 
                                        ? 'border-[#0057BB] bg-blue-50/40 ring-4 ring-blue-50' 
                                        : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50/60 shadow-xs'
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
                                        <RefreshCw size={28} className="animate-spin text-[#0057BB]" />
                                        <div className="space-y-0.5">
                                            <p className="text-sm font-semibold text-slate-800">Reading Statement Data...</p>
                                            <p className="text-xs text-slate-500">Extracting transaction rows, dates, and amounts</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
                                            <Upload size={22} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">
                                                Drop your statement file here, or <span className="text-[#0057BB] hover:underline font-bold">browse</span>
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Supports Khatabook PDF, Excel (.xlsx, .xls), and standard CSV statements
                                            </p>
                                        </div>
                                        <div className="pt-2 flex items-center justify-center gap-4 text-xs text-slate-400 font-medium">
                                            <span>Max file size: 25 MB</span>
                                            <span>•</span>
                                            <span>Auto-detects columns</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Supported Formats Card */}
                            <div className="bg-white border border-slate-200 rounded-lg p-4">
                                <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2.5">
                                    Supported Source Formats
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                    <div className="p-3 bg-slate-50 rounded-md border border-slate-100 flex items-start gap-2.5">
                                        <FileText size={16} className="text-rose-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-semibold text-slate-800">Khatabook PDF</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">Direct statement export with balance audit</p>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-md border border-slate-100 flex items-start gap-2.5">
                                        <FileSpreadsheet size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-semibold text-slate-800">Excel (.xlsx, .xls)</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">Custom or downloaded ledger spreadsheets</p>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-md border border-slate-100 flex items-start gap-2.5">
                                        <FileText size={16} className="text-slate-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-semibold text-slate-800">CSV Export</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">Comma-separated tabular accounting records</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Privacy footnote */}
                            <div className="flex items-center gap-2 text-xs text-slate-400 justify-center">
                                <Lock size={13} />
                                <span>Parsed securely in-browser. Your financial files are not stored on external servers.</span>
                            </div>
                        </div>
                    ) : (
                        /* STEP 2: REVIEW & CONFIRM VIEW */
                        <div className="space-y-4">
                            
                            {/* Summary Bar */}
                            <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-4 text-xs">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center font-medium">
                                        <FileText size={16} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 truncate max-w-xs sm:max-w-md">{file?.name}</p>
                                        <p className="text-[11px] text-slate-500">
                                            {transactions.length} rows detected {parsedData.meta?.dateRange && `• ${parsedData.meta.dateRange}`}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-xs">
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase">Gave (Debit)</span>
                                        <span className="font-semibold text-rose-600">₹{totalSelectedGave.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="border-l border-slate-200 pl-4">
                                        <span className="text-slate-400 block text-[10px] uppercase">Got (Credit)</span>
                                        <span className="font-semibold text-emerald-600">₹{totalSelectedGot.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="border-l border-slate-200 pl-4">
                                        <span className="text-slate-400 block text-[10px] uppercase">Net Balance</span>
                                        <span className={`font-bold ${netDifference >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                            ₹{Math.abs(netDifference).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {netDifference >= 0 ? '(Cr)' : '(Dr)'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={resetState}
                                        className="ml-2 px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-300 transition-colors cursor-pointer"
                                    >
                                        Change File
                                    </button>
                                </div>
                            </div>

                            {/* Perspective / POV Toolbar in Step 2 */}
                            <div className="bg-slate-100/90 border border-slate-200 rounded-lg p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-xs font-semibold text-slate-800">Perspective:</span>
                                    <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 text-xs font-medium">
                                        <button
                                            type="button"
                                            onClick={() => handlePerspectiveChange('MERCHANT')}
                                            className={`px-3 py-1 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                                                perspective === 'MERCHANT'
                                                    ? 'bg-[#0057BB] text-white font-semibold shadow-2xs'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            <User size={13} />
                                            <span>My View (Merchant)</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handlePerspectiveChange('CUSTOMER')}
                                            className={`px-3 py-1 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                                                perspective === 'CUSTOMER'
                                                    ? 'bg-[#0057BB] text-white font-semibold shadow-2xs'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            <ArrowLeftRight size={13} />
                                            <span>Customer's View (Inverted)</span>
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
                                        className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded transition-colors flex items-center gap-1 cursor-pointer"
                                        title="Invert all Debit / Credit types"
                                    >
                                        <ArrowLeftRight size={12} className="text-slate-500" />
                                        <span>Swap All</span>
                                    </button>
                                </div>
                            </div>

                            {/* Table Controls */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={toggleSelectAll}
                                        className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center text-[10px] ${transactions.every(t => t.selected) ? 'bg-[#0057BB] border-[#0057BB] text-white' : 'border-slate-400 bg-white'}`}>
                                            {transactions.every(t => t.selected) && <Check size={10} />}
                                        </span>
                                        <span>{transactions.every(t => t.selected) ? 'Deselect All' : 'Select All'}</span>
                                    </button>

                                    <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5 text-xs font-medium">
                                        <button
                                            onClick={() => setTypeFilter('ALL')}
                                            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${typeFilter === 'ALL' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                                        >
                                            All ({transactions.length})
                                        </button>
                                        <button
                                            onClick={() => setTypeFilter('GAVE')}
                                            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${typeFilter === 'GAVE' ? 'bg-rose-50 text-rose-700 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                                        >
                                            Debit ({transactions.filter(t => t.type === 'GAVE').length})
                                        </button>
                                        <button
                                            onClick={() => setTypeFilter('GOT')}
                                            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${typeFilter === 'GOT' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                                        >
                                            Credit ({transactions.filter(t => t.type === 'GOT').length})
                                        </button>
                                    </div>
                                </div>

                                <div className="relative flex-1 max-w-xs">
                                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search remarks, amount..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Data Table */}
                            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                                <div className="max-h-[340px] overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200 z-10 text-[11px]">
                                            <tr>
                                                <th className="p-2.5 w-10 text-center">
                                                    <span className="sr-only">Select</span>
                                                </th>
                                                <th className="p-2.5 w-32">Date</th>
                                                <th className="p-2.5">Description / Remarks</th>
                                                <th className="p-2.5 w-28 text-center">Type</th>
                                                <th className="p-2.5 w-32 text-right">Amount (₹)</th>
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
                                                                className="rounded border-slate-300 text-[#0057BB] focus:ring-0 cursor-pointer"
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
                                                                    className={`w-24 text-right outline-none border-b border-transparent focus:border-blue-500 py-0.5 bg-transparent font-semibold ${
                                                                        tx.type === 'GAVE' ? 'text-rose-600' : 'text-emerald-600'
                                                                    }`}
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="p-2.5 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeTransaction(tx.id)}
                                                                className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
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

                {/* Footer Controls */}
                {parsedData && !importSuccess && (
                    <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="text-xs text-slate-500">
                            Selected <strong className="text-slate-800 font-semibold">{selectedTransactions.length}</strong> of {transactions.length} entries for import
                        </div>

                        <div className="flex items-center gap-2.5 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 sm:flex-none px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={selectedTransactions.length === 0 || isImporting}
                                onClick={handleImport}
                                className="flex-1 sm:flex-none px-5 py-2 bg-[#0057BB] text-white rounded-lg text-xs font-semibold hover:bg-[#00479e] transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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
