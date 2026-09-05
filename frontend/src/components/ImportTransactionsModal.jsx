import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dbService } from '../services/firebase';
import { parseStatementFile } from '../utils/statementParser';
import { 
    X, 
    UploadCloud, 
    FileText, 
    CheckCircle2, 
    AlertCircle, 
    ArrowUpDown, 
    Check, 
    Trash2, 
    Search,
    ShieldCheck,
    Calendar,
    HelpCircle
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
        setParseError('');
        setIsParsing(false);
        setIsImporting(false);
        setImportSuccess(false);
        setImportedCount(0);
        setSearchQuery('');
        setTypeFilter('ALL');
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleFile = async (selectedFile) => {
        if (!selectedFile) return;
        setFile(selectedFile);
        setIsParsing(true);
        setParseError('');

        try {
            const result = await parseStatementFile(selectedFile);
            if (!result || !result.transactions || result.transactions.length === 0) {
                throw new Error("No transactions could be found in the uploaded file. Please make sure it's a valid Khatabook PDF or Excel export.");
            }
            setParsedData(result);
            setTransactions(result.transactions);
        } catch (err) {
            console.error("Statement parse failed:", err);
            setParseError(err.message || "Failed to parse statement. Please check file format.");
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
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={handleClose} />

            {/* Modal Box */}
            <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10 animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0057BB] flex items-center justify-center font-bold">
                            <UploadCloud size={22} />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                                Import Transactions
                                <span className="text-[10px] px-2 py-0.5 bg-blue-100/60 text-[#0057BB] font-bold rounded-md uppercase tracking-wider">
                                    Khatabook & Statements
                                </span>
                            </h2>
                            <p className="text-xs text-slate-500 font-medium">
                                Target Party: <strong className="text-slate-700 font-bold">{customer.name}</strong> ({customer.phone || 'No phone'})
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={handleClose}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">

                    {/* SUCCESS VIEW */}
                    {importSuccess ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-20 h-20 rounded-full bg-green-50 text-green-600 flex items-center justify-center animate-in zoom-in-50 duration-300">
                                <CheckCircle2 size={48} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800">Transactions Successfully Imported!</h3>
                            <p className="text-sm text-slate-500 max-w-md">
                                <strong className="text-slate-800 font-bold">{importedCount} entries</strong> have been parsed and credited/debited into <strong className="text-slate-800">{customer.name}</strong>'s ledger.
                            </p>
                            <div className="pt-4 flex gap-3">
                                <button
                                    onClick={handleClose}
                                    className="px-6 py-2.5 bg-[#0057BB] text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
                                >
                                    View Customer Ledger
                                </button>
                                <button
                                    onClick={resetState}
                                    className="px-5 py-2.5 border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all"
                                >
                                    Import Another File
                                </button>
                            </div>
                        </div>
                    ) : !parsedData ? (
                        /* UPLOAD VIEW */
                        <div className="space-y-6">
                            {parseError && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm flex items-start gap-3">
                                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold">Failed to read statement</p>
                                        <p className="opacity-90">{parseError}</p>
                                    </div>
                                </div>
                            )}

                            <div
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onClick={() => !isParsing && fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-4 ${
                                    isDragging 
                                        ? 'border-[#0057BB] bg-blue-50/50 scale-[0.99]' 
                                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/50 bg-slate-50/20'
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
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-12 h-12 border-3 border-[#0057BB] border-t-transparent rounded-full animate-spin" />
                                        <p className="text-sm font-bold text-slate-700">Extracting Khatabook Transactions...</p>
                                        <p className="text-xs text-slate-400">Analyzing PDF columns, dates, debits, credits and balance</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#0057BB] flex items-center justify-center shadow-inner">
                                            <UploadCloud size={32} />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-slate-800">
                                                Click to upload or drag & drop statement
                                            </h3>
                                            <p className="text-xs text-slate-400 mt-1">
                                                Supports Khatabook PDF statements, Excel (.xlsx, .xls), and CSV reports
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="px-2.5 py-1 bg-red-50 text-red-600 text-[11px] font-bold rounded-md border border-red-100 flex items-center gap-1">
                                                <FileText size={12} /> Khatabook PDF
                                            </span>
                                            <span className="px-2.5 py-1 bg-green-50 text-green-700 text-[11px] font-bold rounded-md border border-green-100 flex items-center gap-1">
                                                <FileText size={12} /> Excel XLSX
                                            </span>
                                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-md border border-slate-200 flex items-center gap-1">
                                                <FileText size={12} /> CSV Ledger
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Info Feature Banner */}
                            <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-blue-100/80 rounded-xl p-4 flex items-start gap-3">
                                <ShieldCheck size={20} className="text-[#0057BB] shrink-0 mt-0.5" />
                                <div className="text-xs text-slate-600 space-y-1">
                                    <p className="font-bold text-slate-800">100% Private & Instant Local Parsing</p>
                                    <p>
                                        Your customer statements are processed locally in your browser. All transactions, dates, items, and debit/credit entries are extracted automatically with full arithmetic validation before importing.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* REVIEW & CONFIRM VIEW */
                        <div className="space-y-5">
                            
                            {/* Statement Overview Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Entries</p>
                                    <p className="text-lg font-black text-slate-800 mt-0.5">
                                        {transactions.length}
                                        <span className="text-xs font-medium text-slate-400 ml-1.5">
                                            ({selectedTransactions.length} selected)
                                        </span>
                                    </p>
                                </div>

                                <div className="bg-red-50/60 border border-red-100 rounded-xl p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-red-500">Total You Gave (Debit)</p>
                                    <p className="text-lg font-black text-red-600 mt-0.5">
                                        ₹{totalSelectedGave.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>

                                <div className="bg-green-50/60 border border-green-100 rounded-xl p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-green-600">Total You Got (Credit)</p>
                                    <p className="text-lg font-black text-green-700 mt-0.5">
                                        ₹{totalSelectedGot.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>

                                <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#0057BB]">Net Change</p>
                                    <p className="text-lg font-black text-slate-900 mt-0.5">
                                        ₹{Math.abs(totalSelectedGot - totalSelectedGave).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        <span className={`text-[10px] ml-1 uppercase font-bold ${totalSelectedGave > totalSelectedGot ? 'text-red-500' : 'text-green-600'}`}>
                                            {totalSelectedGave > totalSelectedGot ? 'You Get' : 'You Give'}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {/* Detected File Info */}
                            <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                                        <FileText size={18} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">{file?.name}</p>
                                        {parsedData.meta?.dateRange && (
                                            <p className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                                                <Calendar size={11} /> Period: {parsedData.meta.dateRange}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={resetState}
                                    className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                                >
                                    Change File
                                </button>
                            </div>

                            {/* Search & Action Filters */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={toggleSelectAll}
                                        className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                                    >
                                        <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[10px] ${transactions.every(t => t.selected) ? 'bg-[#0057BB] border-[#0057BB] text-white' : 'border-slate-400 bg-white'}`}>
                                            {transactions.every(t => t.selected) && <Check size={10} />}
                                        </span>
                                        {transactions.every(t => t.selected) ? 'Deselect All' : 'Select All'}
                                    </button>

                                    <div className="flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs font-bold">
                                        <button
                                            onClick={() => setTypeFilter('ALL')}
                                            className={`px-2.5 py-1 rounded-md transition-all ${typeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            All ({transactions.length})
                                        </button>
                                        <button
                                            onClick={() => setTypeFilter('GAVE')}
                                            className={`px-2.5 py-1 rounded-md transition-all ${typeFilter === 'GAVE' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            Gave ({transactions.filter(t => t.type === 'GAVE').length})
                                        </button>
                                        <button
                                            onClick={() => setTypeFilter('GOT')}
                                            className={`px-2.5 py-1 rounded-md transition-all ${typeFilter === 'GOT' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            Got ({transactions.filter(t => t.type === 'GOT').length})
                                        </button>
                                    </div>
                                </div>

                                <div className="relative flex-1 max-w-xs">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search remarks, amount, date..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Table of Entries */}
                            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 border-b border-slate-200 z-10 uppercase tracking-wider text-[10px]">
                                            <tr>
                                                <th className="p-3 w-10 text-center">#</th>
                                                <th className="p-3 w-28">Date</th>
                                                <th className="p-3">Details / Remarks</th>
                                                <th className="p-3 w-28 text-center">Type</th>
                                                <th className="p-3 w-32 text-right">Amount (₹)</th>
                                                <th className="p-3 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {visibleTransactions.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                                                        No transactions match your search filter
                                                    </td>
                                                </tr>
                                            ) : (
                                                visibleTransactions.map((tx, idx) => (
                                                    <tr 
                                                        key={tx.id} 
                                                        className={`hover:bg-slate-50/80 transition-colors ${!tx.selected ? 'opacity-40 bg-slate-50/40' : ''}`}
                                                    >
                                                        <td className="p-3 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={tx.selected}
                                                                onChange={() => toggleTransaction(tx.id)}
                                                                className="rounded border-slate-300 text-[#0057BB] focus:ring-0 cursor-pointer"
                                                            />
                                                        </td>
                                                        <td className="p-3">
                                                            <input
                                                                type="date"
                                                                value={tx.date}
                                                                onChange={(e) => updateTransactionField(tx.id, 'date', e.target.value)}
                                                                className="w-full bg-transparent font-medium text-slate-800 outline-none border-b border-transparent focus:border-blue-400 py-0.5"
                                                            />
                                                        </td>
                                                        <td className="p-3">
                                                            <input
                                                                type="text"
                                                                value={tx.description}
                                                                onChange={(e) => updateTransactionField(tx.id, 'description', e.target.value)}
                                                                className="w-full bg-transparent font-medium text-slate-800 outline-none border-b border-transparent focus:border-blue-400 py-0.5"
                                                                placeholder="Enter description"
                                                            />
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleTransactionType(tx.id)}
                                                                className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider transition-all border ${
                                                                    tx.type === 'GAVE'
                                                                        ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                                                        : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                                                }`}
                                                                title="Click to toggle between Gave and Got"
                                                            >
                                                                {tx.type === 'GAVE' ? 'You Gave' : 'You Got'}
                                                            </button>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <span className="text-slate-400 font-medium">₹</span>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0"
                                                                    value={tx.amount}
                                                                    onChange={(e) => updateTransactionField(tx.id, 'amount', parseFloat(e.target.value) || 0)}
                                                                    className={`w-24 text-right font-bold outline-none border-b border-transparent focus:border-blue-400 py-0.5 bg-transparent ${
                                                                        tx.type === 'GAVE' ? 'text-red-600' : 'text-green-700'
                                                                    }`}
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeTransaction(tx.id)}
                                                                className="text-slate-300 hover:text-red-500 p-1 rounded transition-colors"
                                                                title="Delete row"
                                                            >
                                                                <Trash2 size={14} />
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

                {/* Footer */}
                {parsedData && !importSuccess && (
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-xs text-slate-500">
                            Ready to import <strong className="text-slate-800 font-bold">{selectedTransactions.length}</strong> of {transactions.length} entries
                        </p>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={resetState}
                                className="flex-1 sm:flex-none px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={selectedTransactions.length === 0 || isImporting}
                                onClick={handleImport}
                                className="flex-1 sm:flex-none px-6 py-2.5 bg-[#0057BB] text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isImporting ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Importing {selectedTransactions.length} Entries...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check size={16} />
                                        <span>Import {selectedTransactions.length} Entries</span>
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
