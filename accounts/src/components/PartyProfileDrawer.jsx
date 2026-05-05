import React, { useState, useEffect } from 'react';
import { dbService } from '../services/firebase';

const PartyProfileDrawer = ({ isOpen, onClose, customer, onDeleteSuccess }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editGst, setEditGst] = useState('');
    const [editPhoto, setEditPhoto] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (customer) {
            setEditName(customer.name || '');
            setEditPhone(customer.phone || '');
            setEditEmail(customer.email || '');
            setEditGst(customer.gst || '');
            setEditPhoto(customer.photoURL || '');
        }
    }, [customer, isOpen]);

    if (!isOpen || !customer) return null;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 200 * 1024) { // 200KB limit for base64 storage
                alert('Image size should be less than 200KB');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditPhoto(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

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
            // We don't necessarily need to close the drawer, 
            // the listener in Customers.jsx will update the data automatically.
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm(`Are you sure you want to delete ${customer.name}? All transactions will be removed.`)) {
            try {
                await dbService.deleteCustomer(customer.id);
                onClose();
                if (onDeleteSuccess) onDeleteSuccess();
            } catch (err) {
                alert('Error: ' + err.message);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex justify-end" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/30" onClick={onClose} />

            {/* Drawer panel */}
            <div className="relative w-full max-w-[400px] bg-white h-full shadow-2xl flex flex-col slide-in-right">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-base font-semibold text-gray-900">{isEditing ? 'Edit Profile' : 'Party Profile'}</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                        <span className="material-symbols-outlined text-[22px]">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6">
                    {!isEditing ? (
                        <>
                            {/* Static View Mode */}
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 rounded-full bg-blue-50 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
                                    {customer.photoURL ? (
                                        <img src={customer.photoURL} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-blue-600 font-bold text-xl uppercase">{customer.name?.[0]}</span>
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-bold text-gray-900">{customer.name}</h3>
                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-md uppercase tracking-wider">
                                            Customer
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={() => setIsEditing(true)}
                                className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors mb-8"
                            >
                                <span className="material-symbols-outlined text-[18px]">edit_note</span>
                                Edit Profile
                            </button>

                            <div className="space-y-0 border-t border-gray-100">
                                <div className="flex items-start gap-4 py-6 border-b border-gray-100">
                                    <span className="material-symbols-outlined text-gray-400 text-[20px] mt-0.5">call</span>
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Phone Number</p>
                                        <p className="text-sm font-semibold text-gray-800">{customer.phone || '-'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 py-6 border-b border-gray-100">
                                    <span className="material-symbols-outlined text-gray-400 text-[20px] mt-0.5">mail</span>
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Email Address</p>
                                        <p className="text-sm font-semibold text-gray-800">{customer.email || '-'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 py-6 border-b border-gray-100 relative">
                                    <span className="material-symbols-outlined text-gray-400 text-[20px] mt-0.5">language</span>
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-500 mb-1">SMS & WhatsApp language</p>
                                        <p className="text-sm font-semibold text-gray-800">English</p>
                                    </div>
                                    <span className="material-symbols-outlined text-blue-500 absolute right-0 top-1/2 -translate-y-1/2">expand_more</span>
                                </div>
                                <div className="flex items-start gap-4 py-6 border-b border-gray-100">
                                    <span className="material-symbols-outlined text-gray-400 text-[20px] mt-0.5">storefront</span>
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">GST Number</p>
                                        <p className="text-sm font-semibold text-gray-800">{customer.gst || '-'}</p>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Edit Mode */
                        <form onSubmit={handleUpdate} className="space-y-6">
                            <div className="flex flex-col items-center mb-4">
                                <div className="relative group cursor-pointer" onClick={() => document.getElementById('photo-upload').click()}>
                                    <div className="w-20 h-20 rounded-full border-2 border-blue-100 bg-blue-50 flex items-center justify-center overflow-hidden shadow-inner">
                                        {editPhoto ? (
                                            <img src={editPhoto} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-blue-400 text-2xl font-bold">{editName?.[0]}</span>
                                        )}
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                                            <span className="material-symbols-outlined text-white">photo_camera</span>
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
                                <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest">Tap to change photo</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Customer Name</label>
                                <input 
                                    type="text"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-medium transition-all"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Enter full name"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Phone Number</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">+91</span>
                                    <input 
                                        type="tel"
                                        className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-medium transition-all"
                                        value={editPhone}
                                        onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        placeholder="10-digit mobile number"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Email Address</label>
                                <input 
                                    type="email"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-medium transition-all"
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                    placeholder="Enter email address"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">GST Number</label>
                                <input 
                                    type="text"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-medium transition-all"
                                    value={editGst}
                                    onChange={(e) => setEditGst(e.target.value.toUpperCase())}
                                    placeholder="Enter GSTIN"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    disabled={loading}
                                    type="submit"
                                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Footer Delete Button - Only in view mode */}
                {!isEditing && (
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                        <button 
                            onClick={handleDelete}
                            className="w-full flex items-center justify-center gap-2 py-3 border border-red-200 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                            Delete Party
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PartyProfileDrawer;
