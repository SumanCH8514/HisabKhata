import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Calendar, Camera, ChevronDown, X, Check } from 'lucide-react';

const TransactionDrawer = ({ isOpen, onClose, customerId, customerName, type = 'gave', onSuccess, transaction = null }) => {
    const { currentUser } = useAuth();
    const fileInputRef = useRef(null);
    const dateInputRef = useRef(null);

    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [attachment, setAttachment] = useState(null); // Base64 string

    useEffect(() => {
        if (isOpen) {
            if (transaction) {
                setAmount(Math.abs(transaction.amount).toString());
                setDescription(transaction.description || '');
                setDate(transaction.date || new Date().toISOString().split('T')[0]);
                setAttachment(transaction.attachment || null);
            } else {
                setAmount('');
                setDescription('');
                setDate(new Date().toISOString().split('T')[0]);
                setAttachment(null);
            }
        }
    }, [isOpen, transaction]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // limit 1MB for base64 storage
        if (file.size > 1024 * 1024) {
            alert('Image size must be less than 1MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setAttachment(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        if (!amount || !customerId || !currentUser) return;

        setLoading(true);
        try {
            const finalAmount = type === 'got' ? Math.abs(Number(amount)) : -Math.abs(Number(amount));

            // Combine selected date with current time for accurate sorting/display
            const selectedDateObj = new Date(date);
            const now = new Date();
            selectedDateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

            const txData = {
                amount: finalAmount,
                description: description.trim(),
                date,
                timestamp: selectedDateObj.getTime(),
                type: type === 'got' ? 'GOT' : 'GAVE',
                attachment: attachment
            };

            if (transaction) {
                await dbService.updateTransaction(customerId, transaction.id, txData, transaction.amount);
            } else {
                await dbService.addTransaction(currentUser.uid, customerId, txData);
            }
            onClose();
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error(err);
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePaste = (e) => {
        const items = e.clipboardData.items;
        let imageFound = false;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    imageFound = true;
                    if (blob.size > 1024 * 1024) {
                        alert('Pasted image is too large (>1MB)');
                        return;
                    }
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        setAttachment(reader.result);
                    };
                    reader.readAsDataURL(blob);
                }
            }
        }
        if (imageFound) {
            e.preventDefault();
        }
    };

    if (!isOpen) return null;

    const isGave = type === 'gave';
    const activeHeaderColor = isGave ? '#A02C2C' : '#2C8A2C';
    const activeButtonColor = isGave ? '#F39696' : '#96F396';
    const activeIconColor = isGave ? '#A02C2C' : '#2C8A2C';

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div
            onPaste={handlePaste}
            className="fixed inset-0 z-[100] flex flex-col bg-[#F0F2F5] md:bg-black/40 antialiased overflow-hidden"
        >
            <div className="hidden md:block absolute inset-0" onClick={onClose}></div>

            <div className="relative w-full h-full md:max-w-md md:ml-auto bg-[#F0F2F5] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

                {/* Header */}
                <header className="bg-white px-4 py-5 flex items-start gap-4 border-b border-slate-100 shadow-sm">
                    <button
                        onClick={onClose}
                        style={{ color: activeHeaderColor }}
                        className="mt-0.5 active:scale-90 transition-transform p-1 outline-none"
                    >
                        <ArrowLeft size={30} strokeWidth={3} />
                    </button>
                    <div className="flex-1">
                        <h1
                            style={{ color: activeHeaderColor }}
                            className="text-[18px] font-bold leading-tight"
                        >
                            {transaction ? 'Edit' : 'You'} {isGave ? 'gave' : 'got'} ₹ {amount || 0} {isGave ? 'to' : 'from'} {customerName || '...'}
                        </h1>
                    </div>
                </header>

                <div className="flex-1 px-4 py-6 space-y-8 overflow-y-auto custom-scrollbar">
                    {/* Amount Entry Section */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 ml-1 tracking-wider uppercase">Amount (₹)</label>
                        <div className="bg-white px-4 py-2 border border-slate-300 rounded-[16px] shadow-sm flex items-center focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50 transition-all duration-200">
                            <span className="text-[24px] font-bold text-slate-300 mr-3 select-none leading-none">₹</span>
                            <input
                                autoFocus
                                type="text"
                                inputMode="decimal"
                                placeholder="0"
                                className={`flex-1 bg-transparent text-[28px] font-bold border-none outline-none focus:ring-0 p-0 m-0 placeholder-slate-200 leading-none h-auto w-full ${isGave ? 'text-red-500' : 'text-green-600'}`}
                                value={amount}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                        setAmount(val);
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Details Entry Section */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 ml-1 tracking-wider uppercase">Transaction Details (Optional)</label>
                        <div className="bg-white border border-slate-300 rounded-[16px] shadow-sm overflow-hidden focus-within:border-blue-400 transition-all duration-200">
                            <textarea
                                placeholder="Enter details (Items, bill no., quantity, etc.)"
                                className="w-full p-3 min-h-[80px] border-none outline-none focus:ring-0 text-slate-800 font-bold text-base placeholder-slate-300 resize-none leading-relaxed"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Date & Bills Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative group cursor-pointer">
                            <input
                                ref={dateInputRef}
                                type="date"
                                className="absolute inset-0 opacity-0 cursor-pointer z-20 w-full h-full"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                            <div className="bg-white px-2.5 h-12 rounded-[14px] border border-slate-200 shadow-sm flex items-center justify-between pointer-events-none group-hover:border-slate-400 transition-all duration-300">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <Calendar className="text-slate-500 shrink-0" size={18} />
                                    <span className="text-[13px] font-bold text-slate-700 truncate">{formatDate(date)}</span>
                                </div>
                                <ChevronDown size={14} className="text-slate-400 shrink-0" />
                            </div>
                        </div>

                        <div className="relative">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            <button
                                type="button"
                                onClick={() => attachment ? setAttachment(null) : fileInputRef.current.click()}
                                onPaste={handlePaste}
                                title="Click to upload or Paste (Ctrl+V) image"
                                className="w-full bg-white px-2 h-12 rounded-[14px] border border-slate-200 shadow-sm flex items-center justify-center gap-1.5 group hover:border-slate-400 transition-all duration-300 active:scale-[0.98] outline-none focus:ring-2 focus:ring-blue-400"
                            >
                                {attachment ? (
                                    <>
                                        <Check className="text-green-500" size={24} />
                                        <span className="text-[15px] font-black text-slate-700">Attached</span>
                                        <X size={16} className="text-slate-300 ml-1" />
                                    </>
                                ) : (
                                    <>
                                        <Camera style={{ color: activeIconColor }} size={18} className="shrink-0" />
                                        <span className="text-[13px] font-bold text-slate-700 truncate">Attach Bills</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Image Preview Thumbnail */}
                    {attachment && (
                        <div className="animate-in fade-in zoom-in duration-300">
                            <div className="relative w-24 h-24 rounded-2xl border-2 border-white shadow-md overflow-hidden group">
                                <img src={attachment} alt="Bill" className="w-full h-full object-cover" />
                                <button
                                    onClick={() => setAttachment(null)}
                                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                >
                                    <X className="text-white" size={24} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Fixed Footer SAVE Action */}
                <div className="p-4 bg-[#F0F2F5] mt-auto">
                    <button
                        disabled={loading || !amount}
                        type="submit"
                        onClick={handleSubmit}
                        style={{ backgroundColor: activeButtonColor }}
                        className={`w-full py-3.5 rounded-[16px] font-bold text-white text-lg tracking-wide shadow-lg transition-all duration-300 ${loading || !amount
                            ? 'opacity-40 cursor-not-allowed grayscale'
                            : 'hover:opacity-90 active:scale-[0.98]'
                            }`}
                    >
                        {loading ? 'SAVING...' : transaction ? 'UPDATE' : 'SAVE'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TransactionDrawer;
