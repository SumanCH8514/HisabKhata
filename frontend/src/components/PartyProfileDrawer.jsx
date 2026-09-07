import React, { useState, useEffect } from 'react';
import { dbService } from '../services/firebase';
import { compressImage } from '../utils/imageUtils';
import { uploadToR2, deleteFromR2, R2_FOLDERS } from '../services/r2Storage';
import ImportTransactionsModal from './ImportTransactionsModal';

const getInitialColor = (name) => {
    const colors = ['#ef5350', '#ec407a', '#ab47bc', '#7e57c2', '#5c6bc0', '#42a5f5', '#26c6da', '#26a69a', '#66bb6a', '#d4e157', '#ffa726', '#ff7043'];
    const idx = (name?.charCodeAt(0) || 0) % colors.length;
    return colors[idx];
};

const PartyProfileDrawer = ({ isOpen, onClose, customer, onDeleteSuccess, onImportSuccess }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editGst, setEditGst] = useState('');
    const [editPhoto, setEditPhoto] = useState('');
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [copiedField, setCopiedField] = useState('');

    useEffect(() => {
        if (customer) {
            setEditName(customer.name || '');
            setEditPhone(customer.phone || '');
            setEditEmail(customer.email || '');
            setEditGst(customer.gst || '');
            setEditPhoto(customer.photoURL || '');
            setIsEditing(false);
        }
    }, [customer, isOpen]);

    const handleCopy = (text, fieldName) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(''), 2000);
    };

    const processImageFile = async (file) => {
        if (!file || !file.type?.startsWith('image/')) return;
        setIsUploading(true);
        const previousPhoto = customer.photoURL;
        try {
            const compressedBase64 = await compressImage(file, 500, 500, 0.8);
            setEditPhoto(compressedBase64);
            try {
                const r2Url = await uploadToR2(compressedBase64, R2_FOLDERS.PROFILE, `cust_${customer.id}_${Date.now()}`);
                setEditPhoto(r2Url);
                if (previousPhoto && previousPhoto.startsWith('http') && previousPhoto !== r2Url) {
                    deleteFromR2(previousPhoto).catch(() => {});
                }
            } catch (r2Err) {
                console.warn(r2Err);
            }
        } catch (error) {
            alert("Failed to process image");
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            processImageFile(file);
        }
    };

    const handlePaste = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type && items[i].type.startsWith('image/')) {
                const blob = items[i].getAsFile();
                if (blob) {
                    e.preventDefault();
                    if (!isEditing) setIsEditing(true);
                    processImageFile(blob);
                    break;
                }
            }
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const files = e.dataTransfer?.files;
        if (files && files[0] && files[0].type.startsWith('image/')) {
            if (!isEditing) setIsEditing(true);
            processImageFile(files[0]);
        }
    };

    useEffect(() => {
        if (!isOpen) return;

        const onWindowPaste = (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type && items[i].type.startsWith('image/')) {
                    const blob = items[i].getAsFile();
                    if (blob) {
                        e.preventDefault();
                        if (!isEditing) setIsEditing(true);
                        processImageFile(blob);
                        break;
                    }
                }
            }
        };

        window.addEventListener('paste', onWindowPaste);
        return () => {
            window.removeEventListener('paste', onWindowPaste);
        };
    }, [isOpen, isEditing, customer]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!editName.trim()) {
            alert('Name is required');
            return;
        }

        setLoading(true);
        try {
            await dbService.updateCustomer(customer.id, {
                name: editName.trim(),
                phone: editPhone.trim(),
                email: editEmail.trim(),
                gst: editGst.trim(),
                photoURL: editPhoto
            });
            setIsEditing(false);
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm(`Are you sure you want to delete ${customer.name}? All transaction entries will be permanently removed.`)) {
            setLoading(true);
            try {
                if (customer.photoURL && customer.photoURL.startsWith('http')) {
                    deleteFromR2(customer.photoURL).catch(() => {});
                }
                await dbService.deleteCustomer(customer.id);
                onClose();
                if (onDeleteSuccess) onDeleteSuccess();
            } catch (err) {
                alert('Delete failed: ' + err.message);
            } finally {
                setLoading(false);
            }
        }
    };

    if (!isOpen || !customer) return null;

    return (
        <div className="fixed inset-0 z-[120] flex flex-col md:flex-row justify-end items-end md:items-stretch font-sans">
            <div 
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity" 
                onClick={onClose} 
            />

            <div 
                onPaste={handlePaste} 
                className="relative w-full max-w-full md:max-w-[420px] bg-white h-auto max-h-[92vh] md:max-h-full md:h-full rounded-t-[28px] md:rounded-t-none md:rounded-l-2xl shadow-2xl flex flex-col z-10 overflow-hidden animate-in slide-in-from-bottom md:slide-in-from-right duration-200"
            >
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 md:hidden shrink-0" />

                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0057BB] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[20px]">
                                {isEditing ? 'edit_square' : 'account_circle'}
                            </span>
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 leading-tight">
                                {isEditing ? 'Edit Profile' : 'Party Profile'}
                            </h2>
                            <p className="text-[11px] text-slate-500 font-medium">
                                {isEditing ? 'Update customer contact info' : 'Party details & settings'}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-1.5 hover:bg-slate-100 active:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                        title="Close"
                    >
                        <span className="material-symbols-outlined text-[22px]">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar space-y-5">
                    {!isEditing ? (
                        <>
                            <div className="bg-gradient-to-br from-blue-50/90 via-sky-50/40 to-slate-50 border border-blue-100/80 rounded-2xl p-4.5 shadow-xs relative overflow-hidden">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-white border-2 border-white shadow-md flex items-center justify-center overflow-hidden shrink-0 ring-4 ring-blue-100/80">
                                        {customer.photoURL ? (
                                            <img key={customer.photoURL} src={customer.photoURL} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div 
                                                style={{ backgroundColor: getInitialColor(customer.name) }}
                                                className="w-full h-full text-white flex items-center justify-center font-black text-2xl uppercase"
                                            >
                                                {customer.name?.[0] || 'C'}
                                            </div>
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <h3 className="text-lg font-bold text-slate-900 truncate leading-tight">
                                                {customer.name}
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-100/70 text-[#0057BB] text-[10px] font-bold rounded-full uppercase tracking-wider">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#0057BB]" />
                                                Customer
                                            </span>
                                            <span className="text-[11px] text-slate-500 font-mono">
                                                {customer.phone ? `+91 ${customer.phone}` : 'No phone'}
                                            </span>
                                        </div>
                                        {customer.email && (
                                            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-600 truncate">
                                                <span className="material-symbols-outlined text-[13px] text-slate-400 shrink-0">mail</span>
                                                <span className="truncate">{customer.email}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center justify-center gap-2 py-3 px-3.5 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 rounded-xl text-xs font-bold text-slate-700 shadow-xs active:scale-[0.98] transition-all"
                                >
                                    <span className="material-symbols-outlined text-[18px] text-[#0057BB]">edit_square</span>
                                    <span>Edit Profile</span>
                                </button>
                                <button 
                                    onClick={() => setIsImportModalOpen(true)}
                                    className="flex items-center justify-center gap-2 py-3 px-3.5 bg-gradient-to-r from-[#0057BB] to-[#1d4ed8] hover:from-[#00479e] hover:to-[#1e40af] text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-500/20 active:scale-[0.98] transition-all"
                                >
                                    <span className="material-symbols-outlined text-[18px]">upload_file</span>
                                    <span>Import Ledger</span>
                                </button>
                            </div>

                            <div className="space-y-2.5">
                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                                    Contact Details
                                </div>

                                <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-[20px]">call</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Phone Number</p>
                                            <p className="text-sm font-bold text-slate-800 truncate font-mono">
                                                {customer.phone ? `+91 ${customer.phone}` : <span className="text-slate-400 font-normal italic">Not provided</span>}
                                            </p>
                                        </div>
                                    </div>
                                    {customer.phone && (
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <a 
                                                href={`tel:+91${customer.phone}`}
                                                className="p-2 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                                                title="Call"
                                            >
                                                <span className="material-symbols-outlined text-[18px] leading-none block">call</span>
                                            </a>
                                            <button 
                                                onClick={() => handleCopy(`+91${customer.phone}`, 'phone')}
                                                className="p-2 rounded-lg bg-slate-200/70 text-slate-600 hover:bg-slate-300 transition-colors"
                                                title="Copy Phone"
                                            >
                                                <span className="material-symbols-outlined text-[18px] leading-none block">
                                                    {copiedField === 'phone' ? 'check' : 'content_copy'}
                                                </span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#0057BB] flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-[20px]">mail</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Email Address</p>
                                            <p className="text-sm font-bold text-slate-800 truncate">
                                                {customer.email || <span className="text-slate-400 font-normal italic">Not provided</span>}
                                            </p>
                                        </div>
                                    </div>
                                    {customer.email && (
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <a 
                                                href={`mailto:${customer.email}`}
                                                className="p-2 rounded-lg bg-blue-100 text-[#0057BB] hover:bg-blue-200 transition-colors"
                                                title="Send Email"
                                            >
                                                <span className="material-symbols-outlined text-[18px] leading-none block">mail</span>
                                            </a>
                                            <button 
                                                onClick={() => handleCopy(customer.email, 'email')}
                                                className="p-2 rounded-lg bg-slate-200/70 text-slate-600 hover:bg-slate-300 transition-colors"
                                                title="Copy Email"
                                            >
                                                <span className="material-symbols-outlined text-[18px] leading-none block">
                                                    {copiedField === 'email' ? 'check' : 'content_copy'}
                                                </span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-[20px]">store</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">GSTIN / Tax ID</p>
                                            <p className="text-sm font-bold text-slate-800 truncate font-mono">
                                                {customer.gst || <span className="text-slate-400 font-normal italic">Not added</span>}
                                            </p>
                                        </div>
                                    </div>
                                    {customer.gst && (
                                        <button 
                                            onClick={() => handleCopy(customer.gst, 'gst')}
                                            className="p-2 rounded-lg bg-slate-200/70 text-slate-600 hover:bg-slate-300 transition-colors shrink-0"
                                            title="Copy GSTIN"
                                        >
                                            <span className="material-symbols-outlined text-[18px] leading-none block">
                                                {copiedField === 'gst' ? 'check' : 'content_copy'}
                                            </span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div className="flex flex-col items-center py-2">
                                <div 
                                    className="relative group cursor-pointer" 
                                    onClick={() => !isUploading && document.getElementById('photo-upload').click()}
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop}
                                    title="Tap to change photo"
                                >
                                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-blue-300 bg-blue-50/60 flex items-center justify-center overflow-hidden shadow-inner relative group-hover:border-blue-500 group-hover:scale-105 transition-all duration-300 ring-4 ring-blue-100/90 active:scale-95">
                                        {isUploading ? (
                                            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 backdrop-blur-2xs">
                                                <div className="w-6 h-6 border-2 border-[#0057BB] border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        ) : editPhoto ? (
                                            <img key={editPhoto} src={editPhoto} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                                        ) : (
                                            <div 
                                                style={{ backgroundColor: getInitialColor(editName || customer?.name) }}
                                                className="w-full h-full text-white flex items-center justify-center font-black text-2xl uppercase transition-transform duration-300 group-hover:scale-110"
                                            >
                                                {editName?.[0] || 'C'}
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all duration-300 backdrop-blur-2xs text-white">
                                            <span className="material-symbols-outlined text-xl scale-90 group-hover:scale-100 transition-transform duration-300">photo_camera</span>
                                            <span className="text-[8px] font-bold uppercase tracking-wider">Change</span>
                                        </div>
                                    </div>
                                    <input 
                                        id="photo-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </div>
                                <p className="text-[11px] text-slate-500 mt-2 font-semibold">
                                    Tap photo to upload or paste image
                                </p>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Customer Name *</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">person</span>
                                    <input 
                                        type="text"
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl focus:border-[#0057BB] focus:bg-white focus:ring-2 focus:ring-blue-500/10 outline-none text-sm font-semibold text-slate-900 transition-all placeholder:text-slate-400"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        placeholder="Full legal or store name"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold font-mono">+91</span>
                                    <input 
                                        type="tel"
                                        className="w-full pl-12 pr-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl focus:border-[#0057BB] focus:bg-white focus:ring-2 focus:ring-blue-500/10 outline-none text-sm font-semibold text-slate-900 font-mono transition-all placeholder:text-slate-400"
                                        value={editPhone}
                                        onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        placeholder="10-digit mobile number"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">mail</span>
                                    <input 
                                        type="email"
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl focus:border-[#0057BB] focus:bg-white focus:ring-2 focus:ring-blue-500/10 outline-none text-sm font-semibold text-slate-900 transition-all placeholder:text-slate-400"
                                        value={editEmail}
                                        onChange={(e) => setEditEmail(e.target.value)}
                                        placeholder="customer@example.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">GSTIN Number</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">store</span>
                                    <input 
                                        type="text"
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl focus:border-[#0057BB] focus:bg-white focus:ring-2 focus:ring-blue-500/10 outline-none text-sm font-semibold text-slate-900 font-mono uppercase transition-all placeholder:text-slate-400"
                                        value={editGst}
                                        onChange={(e) => setEditGst(e.target.value.toUpperCase())}
                                        placeholder="15-character GSTIN"
                                    />
                                </div>
                            </div>

                            <div className="pt-3 flex gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    disabled={loading}
                                    type="submit"
                                    className="flex-1 py-3 bg-gradient-to-r from-[#0057BB] to-[#1d4ed8] hover:from-[#00479e] hover:to-[#1e40af] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {!isEditing && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50/60 shrink-0">
                        <button 
                            onClick={handleDelete}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-rose-50/70 border border-rose-200/70 hover:bg-rose-100 hover:border-rose-300 rounded-xl text-xs font-bold text-rose-600 transition-all active:scale-[0.99]"
                        >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                            <span>Delete Party Ledger</span>
                        </button>
                    </div>
                )}
            </div>

            <ImportTransactionsModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                customer={customer}
                onSuccess={() => {
                    if (onImportSuccess) onImportSuccess();
                }}
            />
        </div>
    );
};

export default PartyProfileDrawer;
