import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gavel } from 'lucide-react';

const TermsOfCondition = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 px-4 py-4 flex items-center gap-4 z-10">
                <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft size={24} className="text-slate-600" />
                </button>
                <h1 className="text-lg font-black text-slate-800 tracking-tight">Terms of Condition</h1>
            </div>

            <div className="max-w-3xl mx-auto p-6 space-y-8 pb-20">
                <div className="flex items-center gap-4 p-6 bg-orange-50 rounded-3xl border border-orange-100">
                    <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <Gavel className="text-white" size={24} />
                    </div>
                    <div>
                        <h2 className="text-base font-black text-slate-900">Legal Agreement</h2>
                        <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">Effective Date: May 5, 2026</p>
                    </div>
                </div>

                <section className="space-y-4">
                    <h3 className="text-lg font-black text-slate-900">1. Acceptance of Terms</h3>
                    <p className="text-slate-600 leading-relaxed text-sm">
                        By accessing or using HisabKhata, you agree to be bound by these Terms of Condition. If you do not agree to all of the terms, you may not use our services.
                    </p>
                </section>

                <section className="space-y-4">
                    <h3 className="text-lg font-black text-slate-900">2. Description of Service</h3>
                    <p className="text-slate-600 leading-relaxed text-sm">
                        HisabKhata is a digital ledger application designed to help merchants and individuals track financial transactions. The service is provided "as is" and we are not liable for any financial inaccuracies or data entry errors made by the user.
                    </p>
                </section>

                <section className="space-y-4">
                    <h3 className="text-lg font-black text-slate-900">3. User Responsibility</h3>
                    <p className="text-slate-600 leading-relaxed text-sm">
                        You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account, including the accuracy of all financial data entered.
                    </p>
                </section>

                <section className="space-y-4">
                    <h3 className="text-lg font-black text-slate-900">4. Prohibited Uses</h3>
                    <p className="text-slate-600 leading-relaxed text-sm">
                        You may not use HisabKhata for any illegal purposes, including money laundering, fraud, or storing sensitive data that violates local financial regulations.
                    </p>
                </section>

                <section className="space-y-4">
                    <h3 className="text-lg font-black text-slate-900">5. Termination</h3>
                    <p className="text-slate-600 leading-relaxed text-sm">
                        We reserve the right to terminate or suspend access to our service immediately, without prior notice, for any reason whatsoever, including without limitation if you breach the Terms.
                    </p>
                </section>

                <section className="space-y-4">
                    <h3 className="text-lg font-black text-slate-900">6. Limitation of Liability</h3>
                    <p className="text-slate-600 leading-relaxed text-sm">
                        In no event shall HisabKhata, nor its directors or employees, be liable for any indirect, incidental, special, or consequential damages resulting from your use or inability to use the service.
                    </p>
                </section>

                <section className="space-y-4">
                    <h3 className="text-lg font-black text-slate-900">7. Changes to Terms</h3>
                    <p className="text-slate-600 leading-relaxed text-sm">
                        We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide at least 30 days' notice before any new terms take effect.
                    </p>
                </section>
            </div>
        </div>
    );
};

export default TermsOfCondition;
