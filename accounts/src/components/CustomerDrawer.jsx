import React, { useState } from 'react';
import { dbService } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { getFirebaseErrorMessage } from '../utils/errorHandlers';
import { X, ChevronDown } from 'lucide-react';
import { compressImage } from '../utils/imageUtils';

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
                const compressedBase64 = await compressImage(file, 500, 500, 0.7);
                setPhoto(compressedBase64);
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
                    <div className="space-y-6">
                        {error && (
                            <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">error</span>
                                {error}
                            </div>
                        )}

                        {/* Photo Upload */}
                        <div className="flex flex-col items-center pb-2">
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
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Party Name</label>
                            <input
                                required
                                type="text"
                                placeholder="Enter Party Name"
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all outline-none text-slate-900 font-medium"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>

                        {/* Phone Number */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-slate-700">Phone Number</label>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">(optional)</span>
                            </div>
                            <div className="flex items-stretch">
                                <div className="flex items-center justify-center px-4 border border-r-0 border-slate-200 rounded-l-xl bg-slate-50 text-slate-500 text-sm font-bold">
                                    +91
                                </div>
                                <input
                                    type="tel"
                                    placeholder="Enter Phone Number"
                                    className="flex-1 px-4 py-3 border border-slate-200 rounded-r-xl text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all outline-none text-slate-900 font-medium"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    maxLength={10}
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-slate-700">Email</label>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">(optional)</span>
                            </div>
                            <input
                                type="email"
                                placeholder="Enter Email Address"
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all outline-none text-slate-900 font-medium"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>

                        {/* Opening Balance */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-slate-700">Opening Balance</label>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">(optional)</span>
                            </div>
                            <div className="flex items-stretch border border-slate-200 rounded-xl overflow-hidden focus-within:ring-4 focus-within:ring-blue-50/50 transition-all">
                                <div className="flex items-center justify-center px-4 border-r border-slate-200 bg-slate-50 text-slate-500 font-bold">
                                    ₹
                                </div>
                                <input
                                    type="number"
                                    placeholder="Enter amount"
                                    className="flex-1 px-4 py-3 text-sm outline-none text-slate-900 font-medium"
                                    value={openingBalance}
                                    onChange={e => setOpeningBalance(e.target.value)}
                                    min="0"
                                />
                                <div className="relative border-l border-slate-200">
                                    <select
                                        className={`h-full pl-3 pr-8 text-[10px] font-black uppercase tracking-wider outline-none cursor-pointer bg-white transition-colors appearance-none [-webkit-appearance:none] [-moz-appearance:none] ${balanceType === 'give' ? 'text-red-500' : 'text-green-600'
                                            }`}
                                        value={balanceType}
                                        onChange={e => setBalanceType(e.target.value)}
                                    >
                                        <option value="give">You Gave</option>
                                        <option value="get">You Got</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Who are they? */}
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-slate-700">Who are they?</label>
                            <div className="flex items-center gap-8">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative flex items-center justify-center">
                                        <input
                                            type="radio"
                                            name="partyType"
                                            value="customer"
                                            checked={partyType === 'customer'}
                                            onChange={() => setPartyType('customer')}
                                            className="sr-only"
                                        />
                                        <div className={`w-5 h-5 rounded-full border-2 transition-all ${partyType === 'customer' ? 'border-blue-600' : 'border-slate-300 group-hover:border-slate-400'}`} />
                                        {partyType === 'customer' && <div className="absolute w-2.5 h-2.5 bg-blue-600 rounded-full animate-in zoom-in duration-200" />}
                                    </div>
                                    <span className={`text-sm font-bold transition-colors ${partyType === 'customer' ? 'text-slate-900' : 'text-slate-500'}`}>Customer</span>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative flex items-center justify-center">
                                        <input
                                            type="radio"
                                            name="partyType"
                                            value="supplier"
                                            checked={partyType === 'supplier'}
                                            onChange={() => setPartyType('supplier')}
                                            className="sr-only"
                                        />
                                        <div className={`w-5 h-5 rounded-full border-2 transition-all ${partyType === 'supplier' ? 'border-blue-600' : 'border-slate-300 group-hover:border-slate-400'}`} />
                                        {partyType === 'supplier' && <div className="absolute w-2.5 h-2.5 bg-blue-600 rounded-full animate-in zoom-in duration-200" />}
                                    </div>
                                    <span className={`text-sm font-bold transition-colors ${partyType === 'supplier' ? 'text-slate-900' : 'text-slate-500'}`}>Supplier</span>
                                </label>
                            </div>
                        </div>

                        <hr className="border-slate-100" />

                        {/* Collapsible Section */}
                        <details className="group">
                            <summary className="flex items-center justify-between cursor-pointer py-1 select-none list-none [&::-webkit-details-marker]:hidden">
                                <span className="text-sm font-bold text-blue-600">Add GSTIN & Address (Optional)</span>
                                <ChevronDown size={18} className="text-blue-600 group-open:rotate-180 transition-transform duration-300" />
                            </summary>
                            <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">GSTIN Number</label>
                                    <input
                                        type="text"
                                        placeholder="Enter GSTIN"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-blue-500 transition-all outline-none font-medium"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Billing Address</label>
                                    <textarea
                                        placeholder="Enter full address"
                                        rows={3}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-blue-500 transition-all outline-none resize-none font-medium"
                                    />
                                </div>
                            </div>
                        </details>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 mt-auto">
                    <button
                        disabled={loading || !name.trim()}
                        onClick={handleSubmit}
                        className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-lg ${loading || !name.trim()
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100 active:scale-[0.98]'
                            }`}
                    >
                        {loading ? 'Processing...' : (customer ? 'Update Merchant' : 'Add Customer')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomerDrawer;
