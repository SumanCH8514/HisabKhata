import React from 'react';
import { 
    X, 
    Check, 
    SlidersHorizontal, 
    RotateCcw, 
    TrendingUp, 
    TrendingDown, 
    Clock, 
    ArrowDownAZ, 
    Calendar,
    ArrowUpRight,
    ArrowDownLeft,
    CheckCircle2,
    CalendarClock
} from 'lucide-react';

const FilterDrawer = ({ 
    isOpen, 
    onClose, 
    filterBy, 
    setFilterBy, 
    sortBy, 
    setSortBy, 
    onApply 
}) => {
    if (!isOpen) return null;

    const filterOptions = [
        { id: '', label: 'All', icon: null },
        { id: 'youllget', label: 'You will get', icon: ArrowDownLeft, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
        { id: 'youllgive', label: 'You will give', icon: ArrowUpRight, color: 'text-rose-600 bg-rose-50 border-rose-200' },
        { id: 'settled', label: 'Settled', icon: CheckCircle2, color: 'text-slate-600 bg-slate-100 border-slate-200' },
        { id: 'due_today', label: 'Due Today', icon: CalendarClock, color: 'text-amber-700 bg-amber-50 border-amber-200' },
        { id: 'upcoming', label: 'Upcoming', icon: Calendar, color: 'text-blue-700 bg-blue-50 border-blue-200' },
        { id: 'no_due_date', label: 'No Due Date', icon: null }
    ];

    const sortOptions = [
        { id: 'recent', label: 'Most Recent', desc: 'Newest activity first', icon: Clock },
        { id: 'amount-high', label: 'Highest Amount', desc: 'Largest balance first', icon: TrendingUp },
        { id: 'name', label: 'By Name (A-Z)', desc: 'Alphabetical order', icon: ArrowDownAZ },
        { id: 'oldest', label: 'Oldest', desc: 'First added customers', icon: Calendar },
        { id: 'amount-low', label: 'Least Amount', desc: 'Smallest balance first', icon: TrendingDown },
    ];

    const isDefault = filterBy === '' && sortBy === 'recent';

    const handleReset = () => {
        setFilterBy('');
        setSortBy('recent');
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center font-sans">
            <div 
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                onClick={onClose}
            />
            
            <div className="relative w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10 border-t sm:border border-slate-200 animate-in slide-in-from-bottom duration-250">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

                <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0057BB] flex items-center justify-center shadow-2xs">
                            <SlidersHorizontal size={17} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 leading-tight">Filter & Sort</h2>
                            <p className="text-[11px] text-slate-400 font-medium">Refine customer ledger entries</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {!isDefault && (
                            <button
                                type="button"
                                onClick={handleReset}
                                className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                                <RotateCcw size={12} />
                                <span>Reset</span>
                            </button>
                        )}
                        <button 
                            onClick={onClose} 
                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                            title="Close"
                        >
                            <X size={17} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-6 custom-scrollbar bg-slate-50/40">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Filter by Balance & Due Date
                            </h3>
                            {filterBy !== '' && (
                                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                                    Active Filter
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            {filterOptions.map((opt) => {
                                const isSelected = filterBy === opt.id;
                                const Icon = opt.icon;
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setFilterBy(opt.id)}
                                        className={`py-2.5 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.97] border text-center ${
                                            isSelected 
                                                ? 'bg-[#0057BB] text-white border-[#0057BB] shadow-sm shadow-blue-500/20' 
                                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-2xs'
                                        }`}
                                    >
                                        {Icon && (
                                            <Icon size={13} className={`shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                                        )}
                                        <span className="truncate">{opt.label}</span>
                                        {isSelected && <Check size={12} className="shrink-0 text-white stroke-[3]" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Sort Customers by
                        </h3>

                        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs divide-y divide-slate-100">
                            {sortOptions.map((opt) => {
                                const isSelected = sortBy === opt.id;
                                const Icon = opt.icon;

                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setSortBy(opt.id)}
                                        className={`w-full px-4 py-3.5 flex items-center justify-between transition-colors text-left cursor-pointer group ${
                                            isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                                isSelected 
                                                    ? 'bg-blue-600 text-white' 
                                                    : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                                            }`}>
                                                <Icon size={16} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`text-xs font-bold ${isSelected ? 'text-[#0057BB]' : 'text-slate-800'}`}>
                                                    {opt.label}
                                                </p>
                                                <p className="text-[11px] text-slate-400">
                                                    {opt.desc}
                                                </p>
                                            </div>
                                        </div>

                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ml-3 ${
                                            isSelected 
                                                ? 'border-[#0057BB] bg-[#0057BB]' 
                                                : 'border-slate-300 bg-white group-hover:border-slate-400'
                                        }`}>
                                            {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="p-4 sm:p-5 border-t border-slate-100 bg-white shrink-0 flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (onApply) onApply();
                            onClose();
                        }}
                        className="flex-1 py-3 bg-gradient-to-r from-[#0057BB] to-[#1d4ed8] hover:from-[#00479e] hover:to-[#1e40af] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <Check size={16} />
                        <span>Apply & View Results</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FilterDrawer;
