import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useNavigate, useParams } from 'react-router-dom';
import { dbService, db } from '../services/firebase';
import { ref, onValue } from 'firebase/database';

const EditCustomer = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: ''
    });

    useEffect(() => {
        if (!id) return;

        const unsub = onValue(ref(db, `customers/${id}`), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                setFormData({
                    name: data.name || '',
                    phone: data.phone || '',
                    email: data.email || '',
                    address: data.address || ''
                });
            }
            setLoading(false);
        });

        return () => unsub();
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        try {
            await dbService.updateCustomer(id, formData);
            navigate(`/customer/${id}`);
        } catch (err) {
            setError('Failed to update customer: ' + err.message);
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="font-body-md text-on-background">
                <Sidebar />
                <Header />
                <main className="ml-0 lg:ml-64 p-4 lg:p-stack-lg flex items-center justify-center min-h-[calc(100vh-4rem)]">
                    <p className="text-slate-500">Loading customer details...</p>
                </main>
            </div>
        );
    }

    return (
        <div className="font-body-md text-on-background">
            <Sidebar />
            <Header />
            <main className="ml-0 lg:ml-64 p-4 lg:p-stack-lg bg-surface min-h-[calc(100vh-4rem)] relative">
                <div className="max-w-xl mx-auto space-y-stack-lg pt-10">
                    <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-on-surface">Edit Customer Details</h2>
                            <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-on-surface">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
                            {error && <div className="bg-error-container text-on-error-container p-3 rounded-md text-sm">{error}</div>}
                            
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Full Name *</label>
                                <input 
                                    required 
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
                                    type="text" 
                                    value={formData.name} 
                                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Phone Number *</label>
                                    <input 
                                        required
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
                                        type="tel" 
                                        value={formData.phone} 
                                        onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email Address *</label>
                                    <input 
                                        required
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
                                        type="email" 
                                        value={formData.email} 
                                        onChange={(e) => setFormData({...formData, email: e.target.value})} 
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Business Address</label>
                                <textarea 
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all resize-none"
                                    rows={3}
                                    value={formData.address} 
                                    onChange={(e) => setFormData({...formData, address: e.target.value})} 
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button 
                                    type="button"
                                    onClick={() => navigate(-1)}
                                    className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg active:scale-[0.98] disabled:opacity-50"
                                >
                                    {saving ? 'Updating...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default EditCustomer;
