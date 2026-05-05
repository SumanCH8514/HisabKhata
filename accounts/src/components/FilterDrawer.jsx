import React from 'react';
import { X, Check } from 'lucide-react';

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
        { id: '', label: 'All' },
        { id: 'youllget', label: 'You will get' },
        { id: 'youllgive', label: 'You will give' },
        { id: 'settled', label: 'Settled' },
        { id: 'due_today', label: 'Due Today' },
        { id: 'upcoming', label: 'Upcoming' },
        { id: 'no_due_date', label: 'No Due Date' },
    ];

    const sortOptions = [
        { id: 'recent', label: 'Most Recent' },
        { id: 'amount-high', label: 'Highest Amount' },
        { id: 'name', label: 'By Name (A-Z)' },
        { id: 'oldest', label: 'Oldest' },
        { id: 'amount-low', label: 'Least Amount' },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />
            
            {/* Drawer */}
            <div className="relative w-full max-w-lg bg-[#f8f9fa] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
                    <h2 className="text-lg font-black text-slate-800 tracking-tight">Filter & Sort</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <X size={24} />
                    </button>
                </div>

                <div className="max-h-[70vh] overflow-y-auto p-6 space-y-8">
                    {/* Filter By */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest ml-1">Filter by</h3>
                        <div className="flex flex-wrap gap-2">
                            {filterOptions.map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => setFilterBy(opt.id)}
                                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                                        filterBy === opt.id 
                                        ? 'bg-[#0051bb] text-white border-[#0051bb] shadow-md shadow-blue-100 scale-105' 
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-blue-200'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sort By */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest ml-1">Sort by</h3>
                        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                            {sortOptions.map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => setSortBy(opt.id)}
                                    className="w-full px-6 py-4 flex items-center justify-between border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors group"
                                >
                                    <span className={`text-sm font-bold transition-colors ${sortBy === opt.id ? 'text-[#0051bb]' : 'text-slate-600'}`}>
                                        {opt.label}
                                    </span>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                        sortBy === opt.id 
                                        ? 'border-[#0051bb] bg-[#0051bb]' 
                                        : 'border-slate-300 bg-white'
                                    }`}>
                                        {sortBy === opt.id && <div className="w-2 h-2 bg-white rounded-full shadow-sm" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-6 pt-2 bg-white">
                    <button
                        onClick={onApply}
                        className="w-full py-4 bg-[#0051bb] text-white rounded-2xl text-base font-black uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all"
                    >
                        View Result
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FilterDrawer;
