import React, { useState, useEffect } from 'react';
import { dbService } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { getFirebaseErrorMessage } from '../utils/errorHandlers';
import { X, ChevronDown, User, Phone, Mail, Building2, MapPin, Camera, Sparkles, Check } from 'lucide-react';
import { compressImage } from '../utils/imageUtils';
import { uploadToR2, R2_FOLDERS } from '../services/r2Storage';

const CustomerDrawer = ({ isOpen, onClose, customer = null }) => {
    const { currentUser } = useAuth();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [gst, setGst] = useState('');
    const [address, setAddress] = useState('');
    const [openingBalance, setOpeningBalance] = useState('');
    const [balanceType, setBalanceType] = useState('give'); // 'give' | 'get'
    const [partyType, setPartyType] = useState('customer'); // 'customer' | 'supplier'
    const [photo, setPhoto] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isAddressOpen, setIsAddressOpen] = useState(false);

    useEffect(() => {
        if (customer && isOpen) {
            setName(customer.name || '');
            setPhone(customer.phone || '');
            setEmail(customer.email || '');
            setGst(customer.gst || '');
            setAddress(customer.address || '');
            setOpeningBalance(customer.balance ? String(Math.abs(customer.balance)) : '');
            setBalanceType((customer.balance || 0) >= 0 ? 'get' : 'give');
            setPartyType(customer.type || 'customer');
            setPhoto(customer.photoURL || '');
        } else if (!customer && isOpen) {
            setName('');
            setPhone('');
            setEmail('');
            setGst('');
            setAddress('');
            setOpeningBalance('');
            setBalanceType('give');
            setPartyType('customer');
            setPhoto('');
            setError('');
        }
    }, [customer, isOpen]);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            setIsUploading(true);
            try {
                const compressedBase64 = await compressImage(file, 500, 500, 0.8);
                setPhoto(compressedBase64);
                try {
                    const r2Url = await uploadToR2(compressedBase64, R2_FOLDERS.PROFILE, `cust_${Date.now()}`);
                    setPhoto(r2Url);
                } catch (r2Err) {
                    console.warn("R2 upload error, storing compressed image fallback:", r2Err);
                }
            } catch (error) {
                console.error("Compression error:", error);
                alert("Failed to process image");
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!name.trim() || !currentUser) return;

        setError('');
        setLoading(true);
        try {
            const balanceNum = Number(openingBalance) || 0;
            const finalBalance = balanceType === 'get' ? Math.abs(balanceNum) : -Math.abs(balanceNum);
            const data = {
                name: name.trim(),
                phone: phone.trim(),
                email: email.trim(),
                gst: gst.trim(),
                address: address.trim(),
                balance: finalBalance,
                type: partyType,
                photoURL: photo
            };

            if (customer) {
                await dbService.updateCustomer(customer.id, data);
            } else {
                await dbService.addCustomer(currentUser.uid, data);
            }
            onClose();
        } catch (err) {
            setError(getFirebaseErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex justify-end">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" 
                onClick={onClose} 
            />

            {/* Drawer panel */}
            <div className="relative w-full max-w-[460px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 z-10">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-[#0057BB] border border-blue-100/60 shadow-sm">
                            <User size={18} />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-slate-800 tracking-tight">
                                {customer ? 'Edit Party Details' : 'Add New Party'}
                            </h2>
                            <p className="text-[11px] font-medium text-slate-400">
                                {customer ? 'Update party information' : 'Create a new customer or supplier ledger'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                        title="Close Drawer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-50 border border-red-200/80 text-red-600 text-xs px-4 py-3 rounded-xl flex items-center gap-2 font-medium animate-in fade-in duration-200">
                                <span className="material-symbols-outlined text-[18px]">error</span>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Photo Upload Card */}
                        <div className="flex items-center gap-4 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100">
                            <div 
                                className="relative group cursor-pointer shrink-0" 
                                onClick={() => !isUploading && document.getElementById('new-party-photo').click()}
                            >
                                <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#0057BB] bg-white flex items-center justify-center overflow-hidden transition-all shadow-sm group-hover:shadow-md">
                                    {isUploading ? (
                                        <div className="w-5 h-5 border-2 border-[#0057BB] border-t-transparent rounded-full animate-spin"></div>
                                    ) : photo ? (
                                        <img src={photo} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-[#0057BB] transition-colors">
                                            <Camera size={20} />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-2xl">
                                        <Camera size={20} className="text-white" />
                                    </div>
                                </div>
                                <input 
                                    id="new-party-photo"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-800 mb-0.5">Profile Photo</p>
                                <p className="text-[11px] text-slate-400 leading-tight">Optional. Auto-compressed for fast loading.</p>
                            </div>
                        </div>

                        {/* Party Type Selector (Segmented Cards) */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Party Type</label>
                            <div className="grid grid-cols-2 gap-2 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
                                <button
                                    type="button"
                                    onClick={() => setPartyType('customer')}
                                    className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                                        partyType === 'customer'
                                            ? 'bg-white text-[#0057BB] shadow-sm'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <User size={14} />
                                    <span>Customer</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPartyType('supplier')}
                                    className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                                        partyType === 'supplier'
                                            ? 'bg-white text-[#0057BB] shadow-sm'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <Building2 size={14} />
                                    <span>Supplier</span>
                                </button>
                            </div>
                        </div>

                        {/* Party Name */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    Party Name <span className="text-red-500">*</span>
                                </label>
                            </div>
                            <div className="relative flex items-center">
                                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                                    <User size={16} />
                                </div>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. Rahul Sharma"
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal outline-none focus:border-[#0057BB] focus:ring-4 focus:ring-blue-500/10 transition-all"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Phone Number */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Phone Number</label>
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Optional</span>
                            </div>
                            <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus-within:bg-white focus-within:border-[#0057BB] focus-within:ring-4 focus-within:ring-blue-500/10 transition-all overflow-hidden">
                                <div className="flex items-center gap-1 px-3.5 py-2.5 bg-slate-100/70 border-r border-slate-200 text-slate-600 text-xs font-bold shrink-0">
                                    <span>🇮🇳</span>
                                    <span>+91</span>
                                </div>
                                <input
                                    type="tel"
                                    placeholder="10-digit mobile number"
                                    className="flex-1 px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal bg-transparent outline-none"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                                    maxLength={10}
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Email Address</label>
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Optional</span>
                            </div>
                            <div className="relative flex items-center">
                                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                                    <Mail size={16} />
                                </div>
                                <input
                                    type="email"
                                    placeholder="e.g. rahul@example.com"
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal outline-none focus:border-[#0057BB] focus:ring-4 focus:ring-blue-500/10 transition-all"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Opening Balance (Clean Unified Component) */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Opening Balance</label>
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Optional</span>
                            </div>
                            <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus-within:bg-white focus-within:border-[#0057BB] focus-within:ring-4 focus-within:ring-blue-500/10 transition-all overflow-hidden">
                                <div className="px-3.5 py-2.5 bg-slate-100/70 border-r border-slate-200 text-slate-700 font-bold text-sm shrink-0">
                                    ₹
                                </div>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    className="flex-1 px-3.5 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal bg-transparent outline-none min-w-0"
                                    value={openingBalance}
                                    onChange={e => setOpeningBalance(e.target.value)}
                                    min="0"
                                    step="any"
                                />
                                <div className="relative border-l border-slate-200 bg-white shrink-0">
                                    <select
                                        className={`h-full pl-3 pr-7 py-2.5 text-xs font-black uppercase tracking-wider outline-none cursor-pointer bg-transparent transition-colors appearance-none ${
                                            balanceType === 'give' ? 'text-red-500' : 'text-green-600'
                                        }`}
                                        value={balanceType}
                                        onChange={e => setBalanceType(e.target.value)}
                                    >
                                        <option value="give">You'll Get</option>
                                        <option value="get">You'll Give</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium px-1">
                                {balanceType === 'give' ? "Select 'You'll Get' if party owes you money" : "Select 'You'll Give' if you owe money to party"}
                            </p>
                        </div>

                        {/* GSTIN & Address Accordion */}
                        <div className="pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setIsAddressOpen(!isAddressOpen)}
                                className="w-full flex items-center justify-between py-2 text-xs font-bold text-[#0057BB] hover:text-blue-700 transition-colors group"
                            >
                                <span className="flex items-center gap-1.5">
                                    <Building2 size={15} />
                                    Add GSTIN & Business Address
                                </span>
                                <ChevronDown 
                                    size={16} 
                                    className={`transition-transform duration-200 ${isAddressOpen ? 'rotate-180' : ''}`} 
                                />
                            </button>

                            {isAddressOpen && (
                                <div className="mt-3 space-y-3 p-3.5 bg-slate-50/70 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">GSTIN Number</label>
                                        <input
                                            type="text"
                                            placeholder="22AAAAA0000A1Z5"
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold uppercase text-slate-900 placeholder:text-slate-400 placeholder:font-normal outline-none focus:border-[#0057BB] transition-all"
                                            value={gst}
                                            onChange={e => setGst(e.target.value.toUpperCase())}
                                            maxLength={15}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Billing Address</label>
                                        <textarea
                                            placeholder="Street, City, State, Pincode"
                                            rows={2}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#0057BB] transition-all resize-none"
                                            value={address}
                                            onChange={e => setAddress(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                {/* Footer Action */}
                <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 h-[44px] border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={loading || !name.trim()}
                        onClick={handleSubmit}
                        className={`flex-1 h-[44px] rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm ${
                            loading || !name.trim()
                                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                                : 'bg-[#0057BB] hover:bg-blue-700 text-white shadow-blue-200/50 active:scale-[0.99]'
                        }`}
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <Check size={16} />
                                <span>{customer ? 'Update Party' : 'Save Customer'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomerDrawer;
