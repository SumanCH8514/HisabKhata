import React, { useState } from 'react';
import { dbService } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { getFirebaseErrorMessage } from '../utils/errorHandlers';
import { X, ChevronDown } from 'lucide-react';
import { compressImage } from '../utils/imageUtils';
import { uploadToR2, R2_FOLDERS } from '../services/r2Storage';

const CustomerDrawer = ({ isOpen, onClose, customer = null }) => {
    const { currentUser } = useAuth();
    const [name, setName] = useState(customer?.name || '');
    const [phone, setPhone] = useState(customer?.phone || '');
    const [email, setEmail] = useState(customer?.email || '');
    const [openingBalance, setOpeningBalance] = useState(Math.abs(customer?.balance || 0) || '');
    const [balanceType, setBalanceType] = useState(
        !customer ? 'give'
            : (customer.balance || 0) >= 0 ? 'get' : 'give'
    );
    const [partyType, setPartyType] = useState('customer');
    const [photo, setPhoto] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            setIsUploading(true);
            try {
                const compressedBase64 = await compressImage(file, 500, 500, 0.8);
                // Set temporary preview
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
                phone,
                email: email.trim(),
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
            setName(''); setPhone(''); setEmail(''); setOpeningBalance('');
        } catch (err) {
            setError(getFirebaseErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity" onClick={onClose} />

            {/* Drawer panel */}
            <div className="relative w-full max-w-[420px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-slate-800">
                        {customer ? 'Edit Party' : 'Add New Party'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                    <div className="space-y-5">
                        {error && (
                            <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">error</span>
                                {error}
                            </div>
                        )}

                        {/* Photo Upload */}
                        <div className="flex flex-col items-center pb-1">
                            <div className="relative group cursor-pointer" onClick={() => !isUploading && document.getElementById('new-party-photo').click()}>
                                <div className="w-20 h-20 rounded-full border-2 border-slate-100 bg-slate-50 flex items-center justify-center overflow-hidden shadow-inner relative">
                                    {isUploading ? (
                                        <div className="absolute inset-0 flex items-center justify-center bg-white/50">
                                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    ) : photo ? (
                                        <img src={photo} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="material-symbols-outlined text-slate-300 text-3xl">add_a_photo</span>
                                    )}
                                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                                        <span className="material-symbols-outlined text-white text-xl">photo_camera</span>
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
                            <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest">Party Photo (Optional)</p>
                        </div>

                        {/* Party Name */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700">Party Name</label>
                            <input
                                required
                                type="text"
                                placeholder="Enter Party Name"
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none text-slate-800 font-medium placeholder:text-slate-400 shadow-sm"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>

                        {/* Phone Number */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-slate-700">Phone Number</label>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">(optional)</span>
                            </div>
                            <div className="flex items-stretch border border-slate-200 rounded-xl overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all bg-white shadow-sm">
                                <span className="flex items-center justify-center px-3.5 bg-slate-50 text-slate-600 text-sm font-bold border-r border-slate-200 select-none">
                                    +91
                                </span>
                                <input
                                    type="tel"
                                    placeholder="Enter Phone Number"
                                    className="flex-1 px-4 py-3 text-sm outline-none text-slate-800 font-medium bg-transparent border-0 placeholder:text-slate-400"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    maxLength={10}
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-slate-700">Email</label>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">(optional)</span>
                            </div>
                            <input
                                type="email"
                                placeholder="Enter Email Address"
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none text-slate-800 font-medium placeholder:text-slate-400 shadow-sm"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>

                        {/* Opening Balance */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-slate-700">Opening Balance</label>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">(optional)</span>
                            </div>
                            <div className="flex items-stretch border border-slate-200 rounded-xl overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all bg-white shadow-sm">
                                <span className="flex items-center justify-center px-4 bg-slate-50 text-slate-600 text-sm font-bold border-r border-slate-200 select-none">
                                    ₹
                                </span>
                                <input
                                    type="number"
                                    placeholder="Enter amount"
                                    className="flex-1 px-4 py-3 text-sm outline-none text-slate-800 font-medium bg-transparent border-0 placeholder:text-slate-400"
                                    value={openingBalance}
                                    onChange={e => setOpeningBalance(e.target.value)}
                                    min="0"
                                />
                                <div className="relative border-l border-slate-200 bg-slate-50 hover:bg-slate-100/80 transition-colors flex items-center">
                                    <select
                                        className={`h-full pl-3 pr-8 py-3 text-xs font-bold uppercase tracking-wider outline-none cursor-pointer bg-transparent border-0 transition-colors appearance-none ${
                                            balanceType === 'give' ? 'text-red-500' : 'text-green-600'
                                        }`}
                                        value={balanceType}
                                        onChange={e => setBalanceType(e.target.value)}
                                    >
                                        <option value="give">You Gave</option>
                                        <option value="get">You Got</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Who are they? */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Who are they?</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setPartyType('customer')}
                                    className={`py-2.5 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2.5 transition-all shadow-sm ${
                                        partyType === 'customer'
                                            ? 'bg-blue-50/70 border-blue-500 text-blue-700 ring-1 ring-blue-500/20'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${partyType === 'customer' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`}>
                                        {partyType === 'customer' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </span>
                                    Customer
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPartyType('supplier')}
                                    className={`py-2.5 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2.5 transition-all shadow-sm ${
                                        partyType === 'supplier'
                                            ? 'bg-blue-50/70 border-blue-500 text-blue-700 ring-1 ring-blue-500/20'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${partyType === 'supplier' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`}>
                                        {partyType === 'supplier' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </span>
                                    Supplier
                                </button>
                            </div>
                        </div>

                        <hr className="border-slate-100" />

                        {/* Collapsible Section */}
                        <details className="group border border-slate-200 rounded-xl p-3.5 bg-slate-50/40 transition-all">
                            <summary className="flex items-center justify-between cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden font-bold text-sm text-[#0057BB]">
                                <span className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">add_circle</span>
                                    Add GSTIN & Address (Optional)
                                </span>
                                <ChevronDown size={18} className="text-[#0057BB] group-open:rotate-180 transition-transform duration-300" />
                            </summary>
                            <div className="mt-3.5 pt-3.5 border-t border-slate-200 space-y-3.5 animate-in slide-in-from-top-2 duration-300">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">GSTIN Number</label>
                                    <input
                                        type="text"
                                        placeholder="Enter 15-digit GSTIN"
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none font-medium placeholder:text-slate-400 shadow-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Billing Address</label>
                                    <textarea
                                        placeholder="Enter full address"
                                        rows={2}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none resize-none font-medium placeholder:text-slate-400 shadow-sm"
                                    />
                                </div>
                            </div>
                        </details>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 bg-white border-t border-slate-100 mt-auto">
                    <button
                        disabled={loading || !name.trim()}
                        onClick={handleSubmit}
                        className={`w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all shadow-sm ${
                            loading || !name.trim()
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                : 'bg-[#0057BB] text-white hover:bg-blue-700 shadow-blue-200 active:scale-[0.99]'
                        }`}
                    >
                        {loading ? 'Processing...' : (customer ? 'Update Party' : 'Add Customer')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomerDrawer;
