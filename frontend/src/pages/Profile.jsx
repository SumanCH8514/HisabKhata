import React, { useState, useEffect } from 'react';
import { dbService } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
    User, 
    Phone, 
    Store, 
    MapPin, 
    Tag, 
    Building2, 
    FileText, 
    Landmark, 
    Users, 
    ChevronRight, 
    ArrowLeft,
    Camera,
    Smartphone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import AppMobileHeader from '../components/AppMobileHeader';
import { calculateProfileStrength } from '../utils/profileUtils';
import { compressImage } from '../utils/imageUtils';
import { uploadToR2, deleteFromR2, R2_FOLDERS } from '../services/r2Storage';

const Profile = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingField, setEditingField] = useState({ key: '', label: '', value: '' });
    const [isUploading, setIsUploading] = useState(false);
    const [profileData, setProfileData] = useState({
        name: '',
        phone: '',
        email: '',
        photoURL: '',
        businessName: '',
        businessCategory: '',
        businessType: '',
        businessAddress: '',
        pan: '',
        gst: '',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        upiId: '',
        staffCount: ''
    });

    useEffect(() => {
        if (currentUser) {
            const unsubscribe = dbService.listenToUserProfile(currentUser.uid, (data) => {
                if (data) {
                    setProfileData(prev => ({
                        ...prev,
                        ...data,
                        name: data.name || '',
                        phone: data.phone || data.mobile || '',
                        email: data.email || '',
                        photoURL: data.photoURL || '',
                        businessName: data.businessName || ''
                    }));
                }
            });
            return () => unsubscribe();
        }
    }, [currentUser]);

    const processImageFile = async (file) => {
        if (!file || !file.type?.startsWith('image/')) return;
        setIsUploading(true);
        const oldPhotoURL = profileData.photoURL;
        try {
            const compressedBase64 = await compressImage(file, 500, 500, 0.8);
            let finalPhotoURL = compressedBase64;
            try {
                finalPhotoURL = await uploadToR2(compressedBase64, R2_FOLDERS.PROFILE, `user_${currentUser.uid}_${Date.now()}`);
                // If successfully uploaded to R2 and there was an old R2 photo, delete it
                if (oldPhotoURL && oldPhotoURL.startsWith('http') && oldPhotoURL !== finalPhotoURL) {
                    deleteFromR2(oldPhotoURL).catch(err => console.warn('Could not remove old profile photo from R2:', err));
                }
            } catch (r2Err) {
                console.warn("R2 upload error, falling back to compressed image:", r2Err);
            }
            await dbService.updateUserProfile(currentUser.uid, { photoURL: finalPhotoURL });
        } catch (error) {
            console.error("Photo processing/upload failed:", error);
            alert("Failed to process or upload photo. Please try again.");
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
            processImageFile(files[0]);
        }
    };

    useEffect(() => {
        const onWindowPaste = (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type && items[i].type.startsWith('image/')) {
                    const blob = items[i].getAsFile();
                    if (blob) {
                        e.preventDefault();
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
    }, [currentUser, profileData]);

    const openEditModal = (key, label, value) => {
        setEditingField({ key, label, value: value || '' });
        setIsModalOpen(true);
    };

    const handleSaveField = async () => {
        setLoading(true);
        try {
            const updateData = { [editingField.key]: editingField.value };
            // Special handling for phone if needed
            if (editingField.key === 'phone') updateData.mobile = editingField.value;
            
            await dbService.updateUserProfile(currentUser.uid, updateData);
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error updating field:", error);
            alert("Failed to update field.");
        } finally {
            setLoading(false);
        }
    };

    const strength = calculateProfileStrength(profileData);

    const initial = (profileData.name?.charAt(0) || currentUser?.email?.charAt(0) || 'M').toUpperCase();

    const SectionHeader = ({ title }) => (
        <div className="bg-slate-50 px-6 py-3 mt-6 first:mt-0 border-y border-slate-100">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</h3>
        </div>
    );

    const ProfileItem = ({ icon: Icon, label, value, fieldKey }) => (
        <div 
            onClick={() => openEditModal(fieldKey, label, value)}
            className="flex items-center gap-4 px-6 py-5 bg-white border-b border-slate-50 active:bg-slate-50 transition-colors cursor-pointer group"
        >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-active:bg-blue-600 group-active:text-white transition-all">
                <Icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight mb-0.5">{label}</p>
                <p className="text-sm font-bold text-slate-900 truncate">{value || 'Tap to set'}</p>
            </div>
            <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-400 transition-colors" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex overflow-x-hidden">
            <Sidebar />

            <div className="flex-1 md:ml-[260px] pb-20 md:pb-0 flex flex-col min-w-0 min-h-screen">
                {/* Mobile Branded Header */}
                <AppMobileHeader 
                    onBack={() => navigate(-1)} 
                    showLogout={false} 
                />

                {/* Desktop Page Title Header */}
                <div className="hidden md:flex items-center justify-between px-8 py-5 bg-white border-b border-slate-200/80">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            <span>Account</span>
                            <span>/</span>
                            <span className="text-[#0057BB]">Business Profile</span>
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
                            <Store size={24} className="text-[#0057BB]" />
                            Business Identity & Profile
                        </h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Manage your merchant identity, tax credentials, banking details, and store verification.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={() => navigate('/settings')}
                            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-xs transition-colors cursor-pointer"
                        >
                            <span>Settings</span>
                        </button>
                    </div>
                </div>

                {/* =========================================================================
                    DESKTOP VIEW (md:block) — 2-Column Responsive Dashboard
                   ========================================================================= */}
                <main className="hidden md:block flex-1 w-full max-w-6xl mx-auto p-8 lg:p-10">
                    <div className="grid grid-cols-12 gap-8 items-start">
                        
                        {/* LEFT COLUMN: 4 cols — Identity Card & Strength */}
                        <div className="col-span-12 lg:col-span-4 space-y-6">
                            
                            {/* Merchant Identity Card */}
                            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col items-center text-center relative overflow-hidden">
                                
                                {/* Photo Uploader */}
                                <div 
                                    className="relative group cursor-pointer" 
                                    onClick={() => !isUploading && document.getElementById('avatar-upload-desktop').click()}
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop}
                                    title="Click, paste (Ctrl+V), or drag & drop photo"
                                >
                                    <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 border-4 border-slate-50 shadow-md overflow-hidden flex items-center justify-center text-4xl font-black text-white relative group-hover:scale-105 transition-transform aspect-square">
                                        {isUploading ? (
                                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                                <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            </div>
                                        ) : profileData.photoURL ? (
                                            <img 
                                                key={profileData.photoURL}
                                                src={profileData.photoURL} 
                                                alt="Profile" 
                                                className="w-full h-full object-cover" 
                                            />
                                        ) : (
                                            initial
                                        )}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 bg-[#0057BB] p-2 rounded-xl border-2 border-white text-white shadow-md hover:bg-blue-700 transition-colors">
                                        <Camera size={16} />
                                    </div>
                                    <input 
                                        id="avatar-upload-desktop"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </div>

                                <button 
                                    onClick={() => !isUploading && document.getElementById('avatar-upload-desktop').click()}
                                    className="mt-3.5 text-[#0057BB] text-xs font-black uppercase tracking-wider hover:underline disabled:opacity-50 cursor-pointer"
                                    disabled={isUploading}
                                >
                                    {isUploading ? 'Uploading...' : 'Change Store Photo'}
                                </button>
                                <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG or WEBP (Max 5MB)</p>

                                <div className="w-full pt-4 mt-4 border-t border-slate-100">
                                    <h2 className="text-base font-black text-slate-900 leading-tight">
                                        {profileData.businessName || 'My Business'}
                                    </h2>
                                    <p className="text-xs font-bold text-slate-500 mt-0.5">
                                        {profileData.name || 'Merchant Owner'}
                                    </p>
                                    
                                    <div className="mt-3 inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <span>Verified Merchant</span>
                                    </div>
                                </div>
                            </div>

                            {/* Profile Strength Card */}
                            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                                        Profile Health
                                    </h3>
                                    <span className={`text-xs font-black ${strength.color}`}>
                                        {strength.percentage}%
                                    </span>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                        <span>Completeness:</span>
                                        <span className={`font-bold ${strength.color}`}>{strength.label}</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full ${strength.barColor} transition-all duration-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.3)]`} 
                                            style={{ width: `${strength.percentage}%` }}
                                        />
                                    </div>
                                </div>

                                <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                                    A complete profile unlocks automatic GST invoice generation, business loan eligibility, and verified customer payment reminders.
                                </p>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: 8 cols — Structured Information Sections */}
                        <div className="col-span-12 lg:col-span-8 space-y-6">
                            
                            {/* Section 1: Personal & Business Identity */}
                            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                        <User size={16} className="text-[#0057BB]" />
                                        <span>Personal & Business Identity</span>
                                    </h3>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    <div 
                                        onClick={() => openEditModal('name', 'Owner Name', profileData.name)}
                                        className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer group"
                                    >
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Owner Name</p>
                                            <p className="text-sm font-bold text-slate-900 mt-0.5">{profileData.name || <span className="text-slate-400 font-normal italic">Set owner name</span>}</p>
                                        </div>
                                        <span className="text-xs font-bold text-[#0057BB] group-hover:underline">Edit</span>
                                    </div>

                                    <div 
                                        onClick={() => openEditModal('phone', 'Registered Phone Number', profileData.phone)}
                                        className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer group"
                                    >
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Registered Phone</p>
                                            <p className="text-sm font-bold text-slate-900 mt-0.5">{profileData.phone || <span className="text-slate-400 font-normal italic">Set mobile number</span>}</p>
                                        </div>
                                        <span className="text-xs font-bold text-[#0057BB] group-hover:underline">Edit</span>
                                    </div>

                                    <div 
                                        onClick={() => openEditModal('businessName', 'Business / Shop Name', profileData.businessName)}
                                        className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer group"
                                    >
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Business / Shop Name</p>
                                            <p className="text-sm font-bold text-slate-900 mt-0.5">{profileData.businessName || <span className="text-slate-400 font-normal italic">Set business name</span>}</p>
                                        </div>
                                        <span className="text-xs font-bold text-[#0057BB] group-hover:underline">Edit</span>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Store Details & Category */}
                            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                        <Store size={16} className="text-[#0057BB]" />
                                        <span>Store Details & Category</span>
                                    </h3>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    <div 
                                        onClick={() => openEditModal('address', 'Store Address', profileData.address)}
                                        className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer group"
                                    >
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Business Address</p>
                                            <p className="text-sm font-bold text-slate-900 mt-0.5">{profileData.address || <span className="text-slate-400 font-normal italic">Set business address</span>}</p>
                                        </div>
                                        <span className="text-xs font-bold text-[#0057BB] group-hover:underline">Edit</span>
                                    </div>

                                    <div 
                                        onClick={() => openEditModal('category', 'Business Category', profileData.category)}
                                        className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer group"
                                    >
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Business Category</p>
                                            <p className="text-sm font-bold text-slate-900 mt-0.5">{profileData.category || <span className="text-slate-400 font-normal italic">e.g. Grocery, Electronics, Garments</span>}</p>
                                        </div>
                                        <span className="text-xs font-bold text-[#0057BB] group-hover:underline">Edit</span>
                                    </div>

                                    <div 
                                        onClick={() => openEditModal('type', 'Business Structure', profileData.type)}
                                        className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer group"
                                    >
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Business Structure</p>
                                            <p className="text-sm font-bold text-slate-900 mt-0.5">{profileData.type || <span className="text-slate-400 font-normal italic">e.g. Retailer, Wholesaler, Distributor</span>}</p>
                                        </div>
                                        <span className="text-xs font-bold text-[#0057BB] group-hover:underline">Edit</span>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Financial & Payment Info */}
                            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                        <Landmark size={16} className="text-[#0057BB]" />
                                        <span>Financial & Payment Details</span>
                                    </h3>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    <div 
                                        onClick={() => openEditModal('gstin', 'GSTIN Number', profileData.gstin)}
                                        className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer group"
                                    >
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">GSTIN / Tax ID</p>
                                            <p className="text-sm font-bold text-slate-900 mt-0.5">{profileData.gstin || <span className="text-slate-400 font-normal italic">Add GSTIN number</span>}</p>
                                        </div>
                                        <span className="text-xs font-bold text-[#0057BB] group-hover:underline">Edit</span>
                                    </div>

                                    <div 
                                        onClick={() => openEditModal('bankAccount', 'Bank Account & IFSC', profileData.bankAccount)}
                                        className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer group"
                                    >
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bank Account Details</p>
                                            <p className="text-sm font-bold text-slate-900 mt-0.5">{profileData.bankAccount || <span className="text-slate-400 font-normal italic">Add bank account number & IFSC</span>}</p>
                                        </div>
                                        <span className="text-xs font-bold text-[#0057BB] group-hover:underline">Edit</span>
                                    </div>

                                    <div 
                                        onClick={() => openEditModal('upiId', 'Business UPI ID', profileData.upiId)}
                                        className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer group"
                                    >
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Primary UPI ID</p>
                                            <p className="text-sm font-bold text-slate-900 mt-0.5">{profileData.upiId || <span className="text-slate-400 font-normal italic">e.g. shopname@upi</span>}</p>
                                        </div>
                                        <span className="text-xs font-bold text-[#0057BB] group-hover:underline">Edit</span>
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Staff & Operations */}
                            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                        <Users size={16} className="text-[#0057BB]" />
                                        <span>Staff & Team Details</span>
                                    </h3>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    <div 
                                        onClick={() => openEditModal('staffDetails', 'Staff & Team Count', profileData.staffDetails)}
                                        className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer group"
                                    >
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Staff Count & Roles</p>
                                            <p className="text-sm font-bold text-slate-900 mt-0.5">{profileData.staffDetails || <span className="text-slate-400 font-normal italic">Set team count and roles</span>}</p>
                                        </div>
                                        <span className="text-xs font-bold text-[#0057BB] group-hover:underline">Edit</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </main>

                {/* =========================================================================
                    MOBILE VIEW (< md) — Exact Existing Layout Preserved
                   ========================================================================= */}
                <main className="md:hidden max-w-2xl mx-auto w-full bg-white min-h-screen shadow-sm relative z-10">
                    {/* Photo & Strength Section */}
                    <div className="pt-6 pb-5 flex flex-col items-center border-b border-slate-100 bg-white">
                        <div 
                            className="relative group cursor-pointer" 
                            onClick={() => !isUploading && document.getElementById('avatar-upload-mobile').click()}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            title="Click, paste (Ctrl+V), or drag & drop photo"
                        >
                            <div className="w-24 h-24 min-w-[96px] min-h-[96px] rounded-full bg-pink-500 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center text-3xl font-black text-white relative group-hover:scale-105 transition-transform aspect-square">
                                {isUploading ? (
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    </div>
                                ) : profileData.photoURL ? (
                                    <img 
                                        key={profileData.photoURL}
                                        src={profileData.photoURL} 
                                        alt="Profile" 
                                        className="w-full h-full object-cover" 
                                    />
                                ) : (
                                    initial
                                )}
                            </div>
                            <div className="absolute bottom-0 right-0 bg-blue-600 p-1.5 rounded-full border-2 border-white text-white shadow-lg">
                                <Camera size={16} />
                            </div>
                            <input 
                                id="avatar-upload-mobile"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>
                        <button 
                            onClick={() => !isUploading && document.getElementById('avatar-upload-mobile').click()}
                            className="mt-3 text-blue-600 text-xs font-black uppercase tracking-wider hover:underline disabled:opacity-50"
                            disabled={isUploading}
                        >
                            {isUploading ? 'Uploading...' : 'Edit photo'}
                        </button>

                        <div className="w-full px-6 mt-5 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-tight">
                                <span className="text-slate-400">Profile strength : <span className={strength.color}>{strength.label}</span></span>
                                <span className={strength.color}>{strength.percentage}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full ${strength.barColor} transition-all duration-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.3)]`} 
                                    style={{ width: `${strength.percentage}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Info Lists */}
                    <div className="pb-10">
                        <SectionHeader title="Personal Info" />
                        <ProfileItem 
                            icon={User} 
                            label="Name" 
                            value={profileData.name} 
                            fieldKey="name"
                        />
                        <ProfileItem 
                            icon={Phone} 
                            label="Registered number" 
                            value={profileData.phone} 
                            fieldKey="phone"
                        />
                        <ProfileItem 
                            icon={Store} 
                            label="Business name" 
                            value={profileData.businessName} 
                            fieldKey="businessName"
                        />

                        <SectionHeader title="Business info" />
                        <ProfileItem 
                            icon={MapPin} 
                            label="Business address" 
                            value={profileData.address} 
                            fieldKey="address"
                        />
                        <ProfileItem 
                            icon={Tag} 
                            label="Business Category" 
                            value={profileData.category} 
                            fieldKey="category"
                        />
                        <ProfileItem 
                            icon={Building2} 
                            label="Business Type" 
                            value={profileData.type} 
                            fieldKey="type"
                        />

                        <SectionHeader title="Financial info" />
                        <ProfileItem 
                            icon={FileText} 
                            label="GSTIN" 
                            value={profileData.gstin} 
                            fieldKey="gstin"
                        />
                        <ProfileItem 
                            icon={Landmark} 
                            label="Bank account" 
                            value={profileData.bankAccount} 
                            fieldKey="bankAccount"
                        />
                        <ProfileItem 
                            icon={Smartphone} 
                            label="UPI ID" 
                            value={profileData.upiId} 
                            fieldKey="upiId"
                        />

                        <SectionHeader title="Staff info" />
                        <ProfileItem 
                            icon={Users} 
                            label="Details" 
                            value={profileData.staffDetails} 
                            fieldKey="staffDetails"
                        />
                    </div>
                </main>

                {/* Edit Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Update {editingField.label}</h4>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <ChevronRight size={24} className="rotate-90" />
                                </button>
                            </div>
                            <div className="p-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{editingField.label}</label>
                                    <input 
                                        type="text"
                                        autoFocus
                                        value={editingField.value}
                                        onChange={(e) => setEditingField({ ...editingField, value: e.target.value })}
                                        className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-500 transition-all outline-none"
                                        placeholder={`Enter ${editingField.label}...`}
                                    />
                                </div>
                                <div className="mt-8 flex gap-3">
                                    <button 
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 py-4 text-sm font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleSaveField}
                                        disabled={loading}
                                        className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {loading ? 'Saving...' : 'Update'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modern Footer on Desktop */}
                <Footer className="mt-auto hidden md:block" />
            </div>

            {/* Mobile Nav */}
            <BottomNav />
        </div>
    );
};

export default Profile;
