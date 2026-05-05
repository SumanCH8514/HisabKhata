import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const PlaceholderPage = ({ title, icon }) => {
    const { isAdmin } = useAuth();

    return (
        <div className="font-body-md text-on-background">
            <Sidebar />
            <Header />
            <main className="ml-0 lg:ml-64 p-4 lg:p-stack-lg min-h-[calc(100vh-4rem)] flex items-center justify-center">
                <div className="text-center space-y-4 max-w-md mx-auto">
                    <div className="h-24 w-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                        <span className="material-symbols-outlined text-6xl">{icon}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-on-surface">{title}</h2>
                    <p className="text-slate-500">This feature is currently under development. Stay tuned for updates in the next version of HisabKhata!</p>
                    
                    <div className="flex flex-col gap-3 pt-4">
                        {isAdmin && (
                            <Link 
                                to="/admin"
                                className="px-6 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-all shadow-lg shadow-amber-100 flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">admin_panel_settings</span>
                                Open Admin Console
                            </Link>
                        )}
                        <button 
                            onClick={() => window.history.back()}
                            className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export const Reports = () => <PlaceholderPage title="Financial Reports" icon="analytics" />;
export const Settings = () => <PlaceholderPage title="Account Settings" icon="settings" />;
export const Support = () => <PlaceholderPage title="Customer Support" icon="headset_mic" />;
