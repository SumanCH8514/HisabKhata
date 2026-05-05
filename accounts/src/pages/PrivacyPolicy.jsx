import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

const PrivacyPolicy = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 px-4 py-4 flex items-center gap-4 z-10">
                <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft size={24} className="text-slate-600" />
                </button>
                <h1 className="text-lg font-black text-slate-800 tracking-tight">Privacy Policy</h1>
            </div>

            <div className="max-w-3xl mx-auto p-6 space-y-8 pb-20">
                <div className="flex items-center gap-4 p-6 bg-blue-50 rounded-3xl border border-blue-100">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <Shield className="text-white" size={24} />
                    </div>
                    <div>
                        <h2 className="text-base font-black text-slate-900">Your Privacy Matters</h2>
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Last Updated: May 2026</p>
                    </div>
                </div>

                <section className="space-y-4">
                    <h3 className="text-lg font-black text-slate-900">1. Information We Collect</h3>
                    <p className="text-slate-600 leading-relaxed text-sm">
                        HisabKhata collects information to provide a better experience to all our users. We collect:
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-slate-600 text-sm">
                        <li><strong>Profile Information:</strong> When you sign up using Google Auth, we access your name, email address, and profile picture to create your business identity.</li>
                        <li><strong>Business Data:</strong> We store the ledger entries, customer details, and transaction history you enter into the application.</li>
                        <li><strong>Device Information:</strong> We may collect technical data such as browser type and device information for performance monitoring.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h3 className="text-lg font-black text-slate-900">2. How We Use Information</h3>
                    <p className="text-slate-600 leading-relaxed text-sm">
                        The information we collect is used solely to:
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-slate-600 text-sm">
                        <li>Provide, maintain, and improve the HisabKhata services.</li>
                        <li>Synchronize your data across multiple devices.</li>
                        <li>Communicate with you regarding account updates or technical support.</li>
                        <li>Ensure the security of your financial records.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h3 className="text-lg font-black text-slate-900">3. Data Security</h3>
                    <p className="text-slate-600 leading-relaxed text-sm">
                        We use Google Firebase to ensure your data is encrypted and stored securely. We do not sell your personal or financial data to third parties. Your ledger is private and accessible only by you through your authenticated account.
                    </p>
                </section>

                <section className="space-y-4">
                    <h3 className="text-lg font-black text-slate-900">4. Google User Data</h3>
                    <p className="text-slate-600 leading-relaxed text-sm">
                        HisabKhata's use and transfer of information received from Google APIs to any other app will adhere to <a href="https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes" className="text-blue-600 underline">Google API Service User Data Policy</a>, including the Limited Use requirements.
                    </p>
                </section>

                <section className="space-y-4">
                    <h3 className="text-lg font-black text-slate-900">5. Contact Us</h3>
                    <p className="text-slate-600 leading-relaxed text-sm">
                        If you have any questions about this Privacy Policy, please contact us at:
                        <br />
                        <span className="font-bold text-[#0051bb]">support@sumanonline.com</span>
                    </p>
                </section>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
