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
    Camera
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import { calculateProfileStrength } from '../utils/profileUtils';
import { compressImage } from '../utils/imageUtils';

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
        address: '',
        category: '',
        type: '',
        gstin: '',
        bankAccount: '',
        staffDetails: ''
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

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            setIsUploading(true);
            try {
                const compressedBase64 = await compressImage(file, 500, 500, 0.7);
                await dbService.updateUserProfile(currentUser.uid, { photoURL: compressedBase64 });
            } catch (error) {
                console.error("Photo processing/upload failed:", error);
                alert("Failed to process or upload photo. Please try again.");
            } finally {
                setIsUploading(false);
            }
        }
    };

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
        <div className="min-h-screen bg-[#F8FAFC] flex overflow-hidden">
            <Sidebar />

            <div className="flex-1 md:ml-[260px] pb-24 md:pb-0 flex flex-col relative h-screen overflow-y-auto">
                {/* Mobile Branded Header - Ultra Compact */}
                <div className="md:hidden flex items-center justify-between px-4 py-1.5 bg-white border-b border-gray-100 sticky top-0 z-30">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-[#0057BB] rounded-md flex items-center justify-center shadow-sm">
                            <span className="material-symbols-outlined text-white text-[16px]">account_balance_wallet</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-[#0057BB] font-black text-[15px] tracking-tight">Hisab Khata</span>
                            <span className="text-[#FF6B00] font-black italic text-[10px]">PRO</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => navigate(-1)}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                    </button>
                </div>

                {/* Page Title — High Fidelity Branding */}
                <div className="bg-white border-b border-gray-200 px-6 py-2 md:py-3 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-100 shrink-0">
                        <span className="material-symbols-outlined text-white text-[22px]">person_outline</span>
                    </div>
                    <div>
                        <h1 className="text-[17px] md:text-[19px] font-black text-gray-900 tracking-tight leading-none uppercase">Profile</h1>
                        <p className="text-[#8eacc0] text-[10px] mt-1 uppercase tracking-[0.2em] font-black leading-none">Business Identity</p>
                    </div>
                </div>

                <main className="max-w-2xl mx-auto w-full bg-white min-h-screen shadow-sm relative z-10">
                    {/* Photo & Strength Section */}
                    <div className="pt-8 pb-6 flex flex-col items-center border-b border-slate-100 bg-white">
                        <div className="relative group cursor-pointer" onClick={() => !isUploading && document.getElementById('avatar-upload').click()}>
                            <div className="w-24 h-24 rounded-full bg-pink-500 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center text-3xl font-black text-white relative">
                                {isUploading ? (
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    </div>
                                ) : profileData.photoURL ? (
                                    <img 
                                        key={profileData.photoURL} // Force refresh on URL change
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
                                id="avatar-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>
                        <button 
                            onClick={() => !isUploading && document.getElementById('avatar-upload').click()}
                            className="mt-3 text-blue-600 text-xs font-black uppercase tracking-wider hover:underline disabled:opacity-50"
                            disabled={isUploading}
                        >
                            {isUploading ? 'Uploading...' : 'Edit photo'}
                        </button>

                        <div className="w-full px-6 mt-6 space-y-2">
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
            </div>

            {/* Mobile Nav */}
            <BottomNav />
        </div>
    );
};

export default Profile;
