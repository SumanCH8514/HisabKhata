import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Calendar, Camera, ChevronDown, X, Check, Plus, Loader2 } from 'lucide-react';
import { uploadToR2, deleteFromR2, R2_FOLDERS } from '../services/r2Storage';
import { compressImage } from '../utils/imageUtils';

const TransactionDrawer = ({ isOpen, onClose, customerId, customerName, type = 'gave', onSuccess, transaction = null }) => {
    const { currentUser } = useAuth();
    const fileInputRef = useRef(null);
    const dateInputRef = useRef(null);

    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [attachments, setAttachments] = useState([]); // Array of URLs or Base64 strings
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (transaction) {
                setAmount(Math.abs(transaction.amount).toString());
                setDescription(transaction.description || '');
                setDate(transaction.date || new Date().toISOString().split('T')[0]);
                const initialList = Array.isArray(transaction.attachments) && transaction.attachments.length > 0
                    ? transaction.attachments
                    : (transaction.attachment ? [transaction.attachment] : []);
                setAttachments(initialList);
            } else {
                setAmount('');
                setDescription('');
                setDate(new Date().toISOString().split('T')[0]);
                setAttachments([]);
            }
        }
    }, [isOpen, transaction]);

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setIsUploading(true);
        try {
            for (const file of files) {
                // Resize to max 1200x1200 and compress to 80% JPEG
                const compressed = await compressImage(file, 1200, 1200, 0.8);
                setAttachments(prev => [...prev, compressed]); // Immediate preview

                try {
                    const r2Url = await uploadToR2(compressed, R2_FOLDERS.TRANSACTION, `tx_${customerId}_${Date.now()}_${Math.random().toString(36).substring(7)}`);
                    setAttachments(prev => prev.map(item => item === compressed ? r2Url : item));
                } catch (r2Err) {
                    console.warn("R2 upload error, using compressed base64 fallback:", r2Err);
                }
            }
        } catch (err) {
            console.error("Failed to process image:", err);
            alert("Failed to process image");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveAttachment = (indexToRemove) => {
        const toRemove = attachments[indexToRemove];
        if (toRemove && toRemove.startsWith('http')) {
            deleteFromR2(toRemove).catch(() => {});
        }
        setAttachments(prev => prev.filter((_, idx) => idx !== indexToRemove));
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

            // Ensure any remaining base64 attachments are uploaded to R2
            const finalAttachments = [];
            for (const att of attachments) {
                if (att && att.startsWith('data:')) {
                    try {
                        const r2Url = await uploadToR2(att, R2_FOLDERS.TRANSACTION, `tx_${customerId}_${Date.now()}_${Math.random().toString(36).substring(7)}`);
                        finalAttachments.push(r2Url);
                    } catch (r2Err) {
                        console.warn("R2 upload fallback:", r2Err);
                        finalAttachments.push(att);
                    }
                } else if (att) {
                    finalAttachments.push(att);
                }
            }

            const txData = {
                amount: finalAmount,
                description: description.trim(),
                date,
                timestamp: selectedDateObj.getTime(),
                type: type === 'got' ? 'GOT' : 'GAVE',
                attachments: finalAttachments,
                attachment: finalAttachments[0] || null // backward compatibility
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

    const handlePaste = async (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        const imageFiles = [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].type && items[i].type.startsWith('image/')) {
                const blob = items[i].getAsFile();
                if (blob) imageFiles.push(blob);
            }
        }

        if (imageFiles.length === 0) return;
        e.preventDefault();

        setIsUploading(true);
        for (const blob of imageFiles) {
            if (blob.size > 5 * 1024 * 1024) {
                alert('Pasted image is too large (>5MB)');
                continue;
            }
            try {
                const compressed = await compressImage(blob, 1200, 1200, 0.8);
                setAttachments(prev => [...prev, compressed]);
                try {
                    const r2Url = await uploadToR2(compressed, R2_FOLDERS.TRANSACTION, `tx_${customerId}_${Date.now()}_${Math.random().toString(36).substring(7)}`);
                    setAttachments(prev => prev.map(item => item === compressed ? r2Url : item));
                } catch (r2Err) {
                    console.warn("R2 upload fallback:", r2Err);
                }
            } catch (err) {
                console.error("Failed to paste image:", err);
            }
        }
        setIsUploading(false);
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
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between ml-1">
                            <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Transaction Details (Optional)</label>
                            <span className="text-[10px] text-slate-400 font-medium">Supports multi-line & formats</span>
                        </div>
                        <div className="bg-white border border-slate-300 rounded-[16px] shadow-sm overflow-hidden focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-all duration-200">
                            <textarea
                                rows={3}
                                placeholder="Enter details (Items, bill no., quantity, rate, etc.)&#10;Press Enter for next line"
                                className="w-full p-3 min-h-[84px] border-none outline-none focus:ring-0 text-slate-800 font-medium text-sm placeholder-slate-400/80 resize-y leading-relaxed whitespace-pre-wrap"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                            {/* Format & Structure Toolbar */}
                            <div className="px-2.5 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto custom-scrollbar text-[11px]">
                                <button
                                    type="button"
                                    onClick={() => setDescription(prev => prev ? `${prev}\n• ` : '• ')}
                                    className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 font-medium transition-colors shrink-0"
                                >
                                    • Bullet
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDescription(prev => prev ? `${prev}\nBill No: ` : 'Bill No: ')}
                                    className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 font-medium transition-colors shrink-0"
                                >
                                    + Bill No
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDescription(prev => prev ? `${prev}\nItem: Qty @ Rate` : 'Item: Qty @ Rate')}
                                    className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 font-medium transition-colors shrink-0"
                                >
                                    + Item List
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDescription(prev => prev ? `${prev}\nNote: ` : 'Note: ')}
                                    className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 font-medium transition-colors shrink-0"
                                >
                                    + Note
                                </button>
                            </div>
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
                                multiple
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                onPaste={handlePaste}
                                title="Click to upload or Paste (Ctrl+V) images"
                                className="w-full bg-white px-2.5 h-12 rounded-[14px] border border-slate-200 shadow-sm flex items-center justify-between group hover:border-slate-400 transition-all duration-300 active:scale-[0.98] outline-none focus:ring-2 focus:ring-blue-400"
                            >
                                <div className="flex items-center gap-1.5 min-w-0">
                                    {attachments.length > 0 ? (
                                        <Check className="text-green-500 shrink-0" size={18} />
                                    ) : (
                                        <Camera style={{ color: activeIconColor }} size={18} className="shrink-0" />
                                    )}
                                    <span className="text-[13px] font-bold text-slate-700 truncate">
                                        {attachments.length > 0 ? `${attachments.length} Attached` : 'Attach Bills'}
                                    </span>
                                </div>
                                <Plus size={15} className="text-slate-400 shrink-0" />
                            </button>
                        </div>
                    </div>

                    {/* Image Preview Grid */}
                    {(attachments.length > 0 || isUploading) && (
                        <div className="space-y-2 animate-in fade-in zoom-in duration-300">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-slate-400 ml-1 tracking-wider uppercase">
                                    Attached Bills ({attachments.length})
                                </label>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 active:scale-95 transition-transform"
                                >
                                    <Plus size={14} /> Add More
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2.5">
                                {attachments.map((att, idx) => (
                                    <div key={idx} className="relative w-20 h-20 rounded-xl border-2 border-white shadow-sm overflow-hidden group bg-slate-100 shrink-0">
                                        <img src={att} alt={`Bill ${idx + 1}`} className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleRemoveAttachment(idx); }}
                                            title="Remove this attachment"
                                            className="absolute top-1 right-1 bg-black/70 hover:bg-red-600 text-white p-1 rounded-full shadow transition-colors flex items-center justify-center"
                                        >
                                            <X size={12} strokeWidth={3} />
                                        </button>
                                        <div className="absolute bottom-0 inset-x-0 bg-black/40 text-[9px] font-bold text-white text-center py-0.5 pointer-events-none">
                                            #{idx + 1}
                                        </div>
                                    </div>
                                ))}

                                {isUploading && (
                                    <div className="w-20 h-20 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 flex flex-col items-center justify-center gap-1 text-blue-500 shrink-0 animate-pulse">
                                        <Loader2 size={18} className="animate-spin" />
                                        <span className="text-[9px] font-bold">Uploading</span>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/30 text-slate-400 hover:text-blue-600 flex flex-col items-center justify-center gap-1 transition-all shrink-0 active:scale-95"
                                >
                                    <Plus size={20} />
                                    <span className="text-[10px] font-bold">Add Bill</span>
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
