import React, { useState, useEffect } from 'react';
import { dbService } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { getFirebaseErrorMessage } from '../utils/errorHandlers';
import { X, ChevronDown, User, Phone, Mail, FileText, MapPin, Building, UploadCloud, Trash2 } from 'lucide-react';
import { compressImage } from '../utils/imageUtils';
import { uploadToR2, R2_FOLDERS, deleteFromR2 } from '../services/r2Storage';

const CustomerDrawer = ({ isOpen, onClose, customer = null }) => {
    const { currentUser } = useAuth();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [gst, setGst] = useState('');
    const [address, setAddress] = useState('');
    const [openingBalance, setOpeningBalance] = useState('');
    const [balanceType, setBalanceType] = useState('give'); // 'give' (You'll Give) | 'get' (You'll Get)
    const [partyType, setPartyType] = useState('customer'); // 'customer' | 'supplier'
    const [photo, setPhoto] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showMoreDetails, setShowMoreDetails] = useState(false);

    useEffect(() => {
        if (customer) {
            setName(customer.name || '');
            setPhone(customer.phone || '');
            setEmail(customer.email || '');
            setGst(customer.gst || '');
            setAddress(customer.address || '');
            setPartyType(customer.type || 'customer');
            setPhoto(customer.photoURL || '');
            const bal = customer.balance || 0;
            setOpeningBalance(bal !== 0 ? Math.abs(bal).toString() : '');
            setBalanceType(bal < 0 ? 'give' : 'get');
            if (customer.gst || customer.address) {
                setShowMoreDetails(true);
            }
        } else {
            setName('');
            setPhone('');
            setEmail('');
            setGst('');
            setAddress('');
            setOpeningBalance('');
            setBalanceType('give');
            setPartyType('customer');
            setPhoto('');
            setShowMoreDetails(false);
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

    const handleRemovePhoto = (e) => {
        e.stopPropagation();
        if (photo && photo.startsWith('http')) {
            deleteFromR2(photo).catch(() => {});
        }
        setPhoto('');
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!name.trim() || !currentUser) {
            setError('Please enter a valid party name.');
            return;
        }

        setError('');
        setLoading(true);
        try {
            const balanceNum = parseFloat(openingBalance) || 0;
            // Negative balance means We GAVE and we will GET back
            // Positive balance means We GOT and we will GIVE back
            const finalBalance = balanceType === 'give' ? -Math.abs(balanceNum) : Math.abs(balanceNum);
            
            const data = {
                name: name.trim(),
                phone: phone.trim(),
                email: email.trim(),
                gst: gst.trim(),
                address: address.trim(),
                balance: balanceNum > 0 ? finalBalance : 0,
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
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-[3px] transition-opacity animate-in fade-in duration-200" 
                onClick={onClose} 
            />

            {/* Slide-over Drawer Panel */}
            <div className="relative w-full max-w-[460px] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-white sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0057BB] flex items-center justify-center font-bold">
                            <User size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 leading-tight">
                                {customer ? 'Edit Party Details' : 'Add New Party'}
                            </h2>
                            <p className="text-xs text-slate-500 font-medium">
                                {partyType === 'customer' ? 'Customer ledger account' : 'Supplier / vendor ledger account'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                        aria-label="Close drawer"
                    >
                        <X size={19} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar space-y-5">
                    
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl flex items-center gap-2 animate-in fade-in">
                            <span className="material-symbols-outlined text-[18px]">error</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Party Type Segmented Selector */}
                    <div className="bg-slate-100/80 p-1 rounded-xl flex items-center gap-1 border border-slate-200/60">
                        <button
                            type="button"
                            onClick={() => setPartyType('customer')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                partyType === 'customer'
                                    ? 'bg-white text-[#0057BB] shadow-sm border border-slate-200/50'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <User size={14} />
                            Customer
                        </button>
                        <button
                            type="button"
                            onClick={() => setPartyType('supplier')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                partyType === 'supplier'
                                    ? 'bg-white text-[#0057BB] shadow-sm border border-slate-200/50'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Building size={14} />
                            Supplier (Vendor)
                        </button>
                    </div>

                    {/* Photo Upload Area */}
                    <div className="flex items-center gap-4 p-3 bg-slate-50/70 border border-slate-200/60 rounded-2xl">
                        <div 
                            className="relative group cursor-pointer shrink-0" 
                            onClick={() => !isUploading && document.getElementById('new-party-photo').click()}
                        >
                            <div className="w-14 h-14 rounded-full border-2 border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden transition-all group-hover:border-[#0057BB]">
                                {isUploading ? (
                                    <div className="w-5 h-5 border-2 border-[#0057BB] border-t-transparent rounded-full animate-spin"></div>
                                ) : photo ? (
                                    <img src={photo} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={22} className="text-slate-400 group-hover:text-[#0057BB] transition-colors" />
                                )}
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
                            <p className="text-xs font-bold text-slate-800">Party Photo</p>
                            <p className="text-[11px] text-slate-400 font-medium">JPEG, PNG or WebP image</p>
                        </div>
                        {photo ? (
                            <button
                                type="button"
                                onClick={handleRemovePhoto}
                                className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors flex items-center gap-1"
                            >
                                <Trash2 size={13} />
                                Remove
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => document.getElementById('new-party-photo').click()}
                                className="px-3 py-1.5 text-xs font-semibold text-[#0057BB] bg-blue-50/70 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1"
                            >
                                <UploadCloud size={14} />
                                Upload
                            </button>
                        )}
                    </div>

                    {/* Party Name */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                            Party Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative flex items-center">
                            <User size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                            <input
                                required
                                type="text"
                                placeholder="e.g. Ramesh Kumar or Supermart"
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-[#0057BB] focus:ring-2 focus:ring-[#0057BB]/10 bg-slate-50/30 focus:bg-white transition-all outline-none text-slate-900 font-medium placeholder:text-slate-400"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700">Phone Number</label>
                            <span className="text-[11px] text-slate-400 font-medium">Optional</span>
                        </div>
                        <div className="flex items-stretch rounded-xl border border-slate-200 focus-within:border-[#0057BB] focus-within:ring-2 focus-within:ring-[#0057BB]/10 bg-slate-50/30 focus-within:bg-white overflow-hidden transition-all">
                            <div className="flex items-center justify-center px-3.5 bg-slate-100/70 text-slate-600 text-xs font-bold border-r border-slate-200 select-none">
                                +91
                            </div>
                            <input
                                type="tel"
                                placeholder="10-digit mobile number"
                                className="flex-1 px-3.5 py-2.5 text-sm bg-transparent outline-none text-slate-900 font-medium placeholder:text-slate-400"
                                value={phone}
                                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                maxLength={10}
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700">Email Address</label>
                            <span className="text-[11px] text-slate-400 font-medium">Optional</span>
                        </div>
                        <div className="relative flex items-center">
                            <Mail size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                            <input
                                type="email"
                                placeholder="name@example.com"
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-[#0057BB] focus:ring-2 focus:ring-[#0057BB]/10 bg-slate-50/30 focus:bg-white transition-all outline-none text-slate-900 font-medium placeholder:text-slate-400"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Opening Balance */}
                    <div className="space-y-2 p-3.5 bg-slate-50/70 border border-slate-200/70 rounded-2xl">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-800">Opening Balance</label>
                            <span className="text-[11px] text-slate-400 font-medium">Optional</span>
                        </div>
                        <div className="flex items-center rounded-xl border border-slate-200 bg-white overflow-hidden focus-within:border-[#0057BB] focus-within:ring-2 focus-within:ring-[#0057BB]/10 transition-all">
                            <div className="flex items-center justify-center px-3.5 text-slate-500 font-bold text-sm bg-slate-50 border-r border-slate-200 select-none">
                                ₹
                            </div>
                            <input
                                type="number"
                                placeholder="0.00"
                                className="flex-1 px-3.5 py-2.5 text-sm bg-transparent outline-none text-slate-900 font-semibold placeholder:text-slate-300"
                                value={openingBalance}
                                onChange={e => setOpeningBalance(e.target.value)}
                                min="0"
                                step="any"
                            />
                        </div>
                        {/* Balance Direction Selector */}
                        {parseFloat(openingBalance) > 0 && (
                            <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in duration-200">
                                <button
                                    type="button"
                                    onClick={() => setBalanceType('give')}
                                    className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all border text-center ${
                                        balanceType === 'give'
                                            ? 'bg-red-50 text-red-600 border-red-300 shadow-sm'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    You'll Get (Advance Due)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBalanceType('get')}
                                    className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all border text-center ${
                                        balanceType === 'get'
                                            ? 'bg-green-50 text-green-700 border-green-300 shadow-sm'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    You'll Give (Credit)
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Additional Business Details Accordion */}
                    <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white">
                        <button
                            type="button"
                            onClick={() => setShowMoreDetails(!showMoreDetails)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/50 hover:bg-slate-50 transition-colors text-left"
                        >
                            <div className="flex items-center gap-2">
                                <FileText size={15} className="text-slate-500" />
                                <span className="text-xs font-bold text-slate-700">Add GSTIN & Business Address</span>
                            </div>
                            <ChevronDown 
                                size={16} 
                                className={`text-slate-400 transition-transform duration-200 ${showMoreDetails ? 'rotate-180 text-[#0057BB]' : ''}`} 
                            />
                        </button>
                        {showMoreDetails && (
                            <div className="p-4 space-y-3.5 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">GSTIN Number</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 22AAAAA0000A1Z5"
                                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:border-[#0057BB] outline-none font-medium text-slate-900 uppercase"
                                        value={gst}
                                        onChange={e => setGst(e.target.value.toUpperCase())}
                                        maxLength={15}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Billing Address</label>
                                    <textarea
                                        placeholder="Enter complete street and city address"
                                        rows={2}
                                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:border-[#0057BB] outline-none resize-none font-medium text-slate-900"
                                        value={address}
                                        onChange={e => setAddress(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                </div>

                {/* Footer Action Bar */}
                <div className="px-6 py-4 bg-slate-50/90 border-t border-slate-100 flex items-center gap-3 mt-auto sticky bottom-0 z-20">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-1/3 h-[44px] border border-slate-300 hover:bg-white rounded-xl text-xs font-bold text-slate-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={loading || !name.trim()}
                        onClick={handleSubmit}
                        className={`flex-1 h-[44px] rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm ${
                            loading || !name.trim()
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-[#0057BB] hover:bg-[#00489e] text-white shadow-blue-500/10 active:scale-[0.99]'
                        }`}
                    >
                        {loading ? 'Saving Party...' : (customer ? 'Update Party' : 'Save & Add Party')}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default CustomerDrawer;
