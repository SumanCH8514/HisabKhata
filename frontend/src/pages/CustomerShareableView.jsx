import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { dbService, db, sendEmailNotification } from '../services/firebase';
import { ref, onValue, push, set } from 'firebase/database';
import { uploadToR2, R2_FOLDERS } from '../services/r2Storage';
import { compressImage } from '../utils/imageUtils';
import { getDueDateStatus } from '../utils/dueDateUtils';
// Heavy PDF libraries will be imported dynamically when needed

const CustomerShareableView = () => {
    const { id } = useParams();
    const [customer, setCustomer] = useState(null);
    const [owner, setOwner] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [viewImages, setViewImages] = useState([]);
    const [viewIndex, setViewIndex] = useState(0);
    const [globalSettings, setGlobalSettings] = useState(null);
    const [paymentModal, setPaymentModal] = useState({ isOpen: false, step: 'amount', customAmount: '', transactionId: '', screenshot: '', isSubmitting: false });
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [loading, setLoading] = useState(true);

    const handleOpenView = (imgs, idx = 0) => {
        if (!imgs) return;
        if (Array.isArray(imgs)) {
            setViewImages(imgs);
            setViewIndex(idx);
        } else {
            setViewImages([imgs]);
            setViewIndex(0);
        }
    };

    const handleScreenshotChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressed = await compressImage(file, 1200, 1200, 0.8);
                setPaymentModal(prev => ({ ...prev, screenshot: compressed }));
                try {
                    const r2Url = await uploadToR2(compressed, R2_FOLDERS.PAYMENT_PROOF, `proof_${id}_${Date.now()}`);
                    setPaymentModal(prev => ({ ...prev, screenshot: r2Url }));
                } catch (r2Err) {
                    console.warn("R2 upload error, using compressed base64 fallback:", r2Err);
                }
            } catch (err) {
                console.error("Screenshot error:", err);
                alert("Failed to process image.");
            }
        }
    };

    useEffect(() => {
        // Listen to global settings
        const unsubSettings = onValue(ref(db, 'settings'), (snapshot) => {
            if (snapshot.exists()) {
                setGlobalSettings(snapshot.val());
            } else {
                setGlobalSettings({});
            }
        });
        return () => unsubSettings();
    }, []);

    useEffect(() => {
        if (!id) return;

        // Listen to customer details
        const unsubCustomer = onValue(ref(db, `customers/${id}`), (snapshot) => {
            if (snapshot.exists()) {
                const customerData = { id: snapshot.key, ...snapshot.val() };
                setCustomer(customerData);

                // Fetch owner details if userId exists
                if (customerData.userId) {
                    onValue(ref(db, `users/${customerData.userId}`), (ownerSnap) => {
                        if (ownerSnap.exists()) {
                            setOwner(ownerSnap.val());
                        }
                    }, { onlyOnce: true });
                }
            }
        });

        return () => {
            if (typeof unsubCustomer === 'function') unsubCustomer();
        };
    }, [id]);

    useEffect(() => {
        if (!id || !customer) return;

        // Listen to transactions
        const unsubTransactions = dbService.listenCustomerTransactions(id, (data) => {
            // Sort by timestamp descending (latest first)
            const sorted = data.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

            let running = customer.balance || 0;
            const withRunningBalance = sorted.map(tx => {
                const txWithBal = { ...tx, runningBalance: running };
                running -= (tx.amount || 0);
                return txWithBal;
            });
            setTransactions(withRunningBalance); // Already latest first
            setLoading(false);
        });

        return () => {
            if (typeof unsubTransactions === 'function') unsubTransactions();
        };
    }, [id, customer]);

    if (loading || !customer || globalSettings === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 antialiased font-sans">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-[#0057BB] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Loading Secure Statement...</p>
                </div>
            </div>
        );
    }

    if (globalSettings?.shareLinks === false) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center antialiased font-sans">
                <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl shadow-slate-200 border border-slate-100">
                    <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="material-symbols-outlined text-[40px]">link_off</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 mb-4">Sharing Disabled</h1>
                    <p className="text-slate-500 mb-8 leading-relaxed text-sm">
                        Public link sharing for this ledger has been temporarily disabled by the administrator.
                        Please contact the merchant directly for statement details.
                    </p>
                    <div className="pt-6 border-t border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Security Privacy Policy Active</p>
                    </div>
                </div>
            </div>
        );
    }

    const balance = customer?.balance || 0;
    const isReceivable = balance < 0;
    const balanceAbsolute = Math.abs(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const initials = customer.name ? customer.name.substring(0, 1).toUpperCase() : 'C';

    const totalGave = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });
    const totalGot = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });

    const cleanText = (text) => {
        if (!text) return '';
        // Keep only standard printable ASCII characters (32-126) to prevent PDF rendering junk
        return text.toString().replace(/[^\x20-\x7E]/g, '');
    };

    const handleDownloadStatement = async () => {
        const { jsPDF } = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default;
        const doc = new jsPDF();

        // Premium Header
        doc.setFontSize(24);
        doc.setTextColor(0, 87, 187); // #0057BB
        doc.text("Hisab Khata", 14, 20);

        doc.setFontSize(14);
        doc.setTextColor(255, 107, 0); // #FF6B00
        doc.text("PRO", 62, 20);

        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text("HisabKhata.SumanOnline.Com", 20, 24);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Statement for: ${cleanText(customer.name)}`, 14, 30);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 35);

        // Merchant Details (Right Aligned)
        if (owner) {
            doc.setFontSize(9);
            doc.setTextColor(100);

            // Merchant Name row
            const nameLabel = "Merchant Name: ";
            const nameVal = cleanText(owner.name || 'HisabKhata Merchant');
            doc.text(nameLabel + nameVal, 196, 20, { align: 'right' });
            // Draw a small icon-like circle
            doc.setFillColor(0, 87, 187);
            doc.circle(196 - doc.getTextWidth(nameLabel + nameVal) - 3, 19.2, 0.8, 'F');

            if (owner.phone) {
                // Merchant Mobile row
                const phoneLabel = "Merchant Mobile: ";
                const phoneVal = cleanText(owner.phone);
                doc.text(phoneLabel + phoneVal, 196, 26, { align: 'right' });
                // Draw a small icon-like circle
                doc.setFillColor(255, 107, 0);
                doc.circle(196 - doc.getTextWidth(phoneLabel + phoneVal) - 3, 25.2, 0.8, 'F');
            }
        }

        // Horizontal Separator
        doc.setDrawColor(241, 245, 249);
        doc.line(14, 45, 196, 45);

        // Summary Boxes
        doc.setDrawColor(226, 232, 240); // #E2E8F0
        doc.setFillColor(248, 250, 252); // #F8FAFC
        doc.roundedRect(14, 52, 58, 22, 3, 3, 'FD');
        doc.roundedRect(77, 52, 58, 22, 3, 3, 'FD');
        doc.roundedRect(140, 52, 56, 22, 3, 3, 'FD');

        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text("TOTAL PURCHASES", 18, 60);
        doc.text("TOTAL PAYMENTS", 81, 60);
        doc.text("NET BALANCE", 144, 60);

        doc.setFontSize(12);
        doc.setTextColor(239, 68, 68); // Red
        doc.text(`Rs. ${totalGave}`, 18, 68);
        doc.setTextColor(34, 197, 94); // Green
        doc.text(`Rs. ${totalGot}`, 81, 68);
        doc.setTextColor(balance < 0 ? 239 : 34, balance < 0 ? 68 : 197, balance < 0 ? 68 : 94);
        doc.text(`Rs. ${balanceAbsolute}`, 144, 68);

        // Table Data Preparation - Match page sorting (Latest First)
        const tableData = transactions.map((tx) => [
            new Date(tx.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            cleanText(tx.description || 'General Entry'),
            tx.amount < 0 ? Math.abs(tx.amount).toLocaleString('en-IN') : '',
            tx.amount > 0 ? tx.amount.toLocaleString('en-IN') : '',
            `${Math.abs(tx.runningBalance || 0).toLocaleString('en-IN')} ${tx.runningBalance < 0 ? 'Dr' : 'Cr'}`
        ]);

        // Transaction Table
        autoTable(doc, {
            startY: 85,
            head: [['Date', 'Description', 'Debit(-)', 'Credit(+)', 'Balance']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [0, 87, 187],
                textColor: 255,
                fontSize: 10,
                fontStyle: 'bold',
                halign: 'center'
            },
            bodyStyles: {
                fontSize: 9,
                textColor: 50
            },
            columnStyles: {
                0: { cellWidth: 30, halign: 'center' },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 25, halign: 'center' },
                3: { cellWidth: 25, halign: 'center' },
                4: { cellWidth: 30, halign: 'right' },
            },
            alternateRowStyles: {
                fillColor: [250, 251, 252]
            },
            didParseCell: (data) => {
                if (data.section === 'body') {
                    const tx = transactions[data.row.index];
                    if (tx && tx.amount < 0) {
                        // Debit row - Subtle Red
                        data.cell.styles.fillColor = [255, 242, 242];
                    } else if (tx && tx.amount > 0) {
                        // Credit row - Subtle Green
                        data.cell.styles.fillColor = [242, 255, 242];
                    }
                }
            }
        });

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Page ${i} of ${pageCount}`, 196, 285, { align: 'right' });
            doc.text("Generated by HisabKhata PRO - Digital Ledger Solution | SumanOnline.Com", 105, 285, { align: 'center' });
        }

        doc.save(`${customer.name}_Statement_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`);
    };

    const handlePayOnlineClick = () => {
        if (!owner?.upiId) {
            alert("Merchant hasn't configured UPI payments yet.");
            return;
        }
        setPaymentModal(prev => ({ 
            ...prev, 
            isOpen: true, 
            step: 'amount', 
            customAmount: '',
            transactionId: '',
            screenshot: ''
        }));
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            // Optional: You could add a temporary 'Copied!' state here
            alert("UPI ID Copied to Clipboard!");
        });
    };

    const handleAmountSelect = (amount) => {
        setPaymentAmount(amount);
        setPaymentModal(prev => ({ ...prev, step: 'method' }));
    };

    const handleDownloadQR = async () => {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(`upi://pay?pa=${owner?.upiId}&pn=${encodeURIComponent(owner?.name || "HisabKhata")}&tn=${encodeURIComponent("Payment")}&am=${paymentAmount}&cu=INR`)}`;
        
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 800;
            canvas.height = 1400;

            // 1. Background Layer
            ctx.fillStyle = '#F8FAFC';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 2. Decorative Blue Header Shape
            ctx.fillStyle = '#0057BB';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(800, 0);
            ctx.lineTo(800, 250);
            ctx.lineTo(0, 450);
            ctx.fill();

            // 3. Branded Header Text
            ctx.textAlign = 'center';
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 30px "Roboto", Arial';
            ctx.fillText('PAYMENT QR', 400, 80);
            ctx.font = '900 60px "Roboto", Arial';
            ctx.fillText('HisabKhata PRO', 400, 160);
            ctx.font = 'bold 22px "Roboto", Arial';
            ctx.fillText('a SumanOnline Website', 400, 210);

            // 4. White QR Card with Shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
            ctx.shadowBlur = 30;
            ctx.shadowOffsetY = 15;
            ctx.fillStyle = '#FFFFFF';
            
            // Rounded Rectangle for Card
            const cardX = 100, cardY = 280, cardW = 600, cardH = 750, radius = 40;
            ctx.beginPath();
            ctx.moveTo(cardX + radius, cardY);
            ctx.lineTo(cardX + cardW - radius, cardY);
            ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + radius);
            ctx.lineTo(cardX + cardW, cardY + cardH - radius);
            ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - radius, cardY + cardH);
            ctx.lineTo(cardX + radius, cardY + cardH);
            ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - radius);
            ctx.lineTo(cardX, cardY + radius);
            ctx.quadraticCurveTo(cardX, cardY, cardX + radius, cardY);
            ctx.closePath();
            ctx.fill();
            
            ctx.shadowColor = 'transparent';

            // 5. Card Header (UPI Logos Text)
            ctx.fillStyle = '#1E293B';
            ctx.font = 'bold 40px "Roboto", Arial';
            ctx.fillText('BHIM | UPI', 400, 360);
            
            // 6. Draw QR Code
            const qrImg = new Image();
            qrImg.crossOrigin = "anonymous";
            qrImg.src = qrUrl;
            await new Promise(resolve => qrImg.onload = resolve);
            ctx.drawImage(qrImg, 150, 420, 500, 500);

            // 7. Card Footer
            ctx.fillStyle = '#64748B';
            ctx.font = 'bold 22px "Roboto", Arial';
            ctx.fillText('SCAN & PAY WITH ANY UPI APP', 400, 960);
            
            // 8. Amount & Merchant Section
            ctx.fillStyle = '#0057BB';
            ctx.font = '900 75px "Roboto", Arial';
            ctx.fillText(`₹${paymentAmount}`, 400, 1120);

            ctx.fillStyle = '#0F172A';
            ctx.font = '900 48px "Roboto", Arial';
            ctx.fillText(owner?.name || 'Valued Merchant', 400, 1190);
            
            ctx.fillStyle = '#64748B';
            ctx.font = '500 22px "Roboto", Arial';
            const tagline = `Secure payments for ${owner?.name || 'this business'}. Certified HisabKhata Merchant.`;
            
            // Simple text wrapping
            const words = tagline.split(' ');
            let line = '';
            let y = 1240;
            for(let n = 0; n < words.length; n++) {
                let testLine = line + words[n] + ' ';
                let metrics = ctx.measureText(testLine);
                if (metrics.width > 550 && n > 0) {
                    ctx.fillText(line, 400, y);
                    line = words[n] + ' ';
                    y += 35;
                } else {
                    line = testLine;
                }
            }
            ctx.fillText(line, 400, y);

            // 9. Footer Security Branding (Centered)
            const footerText = '100% SECURE DIGITAL PAYMENTS';
            ctx.font = 'bold 20px "Roboto", Arial';
            const footerWidth = ctx.measureText(footerText).width;
            const dotX = 400 - (footerWidth / 2) - 25;

            ctx.fillStyle = '#22C55E';
            ctx.beginPath();
            ctx.arc(dotX, 1340, 10, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#64748B';
            ctx.textAlign = 'center';
            ctx.fillText(footerText, 400, 1347);

            // 10. Generate and Trigger Download
            const dataUrl = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `HisabKhata_Payment_Poster_${owner?.name?.replace(/\s+/g, '_')}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error("Advanced QR Download failed:", error);
            // Simple fallback
            window.open(qrUrl, '_blank');
        }
    };

    const handleMethodSelect = (method) => {
        const upiId = owner?.upiId || '';
        // Encode the name and note to handle spaces and special characters safely
        const payeeName = encodeURIComponent(owner?.name || "HisabKhata");
        const transactionNote = encodeURIComponent("HisabKhata Payments");

        const upiUrl = `upi://pay?pa=${upiId}&pn=${payeeName}&tn=${transactionNote}&am=${paymentAmount}&cu=INR`;

        if (method === 'upi') {
            setPaymentModal(prev => ({ ...prev, step: 'upi_id' }));
        } else {
            setPaymentModal(prev => ({ ...prev, step: 'qr' }));
        }
    };

    const handleConfirmPayment = async () => {
        setPaymentModal(prev => ({ ...prev, isSubmitting: true }));
        try {
            const pendingPaymentId = push(ref(db, 'pending_payments')).key;

            let finalScreenshot = paymentModal.screenshot || '';
            if (finalScreenshot && finalScreenshot.startsWith('data:')) {
                try {
                    finalScreenshot = await uploadToR2(finalScreenshot, R2_FOLDERS.PAYMENT_PROOF, `proof_${pendingPaymentId}_${Date.now()}`);
                } catch (r2Err) {
                    console.warn("R2 upload fallback:", r2Err);
                }
            }

            const pendingData = {
                id: pendingPaymentId,
                customerId: id,
                customerName: customer.name,
                merchantId: customer.userId,
                amount: paymentAmount,
                transactionId: paymentModal.transactionId?.trim() || 'NOT_PROVIDED',
                screenshot: finalScreenshot,
                timestamp: Date.now(),
                status: 'pending'
            };

            await set(ref(db, `pending_payments/${pendingPaymentId}`), pendingData);

            // Send Email to Merchant
            if (owner?.email) {
                const verificationUrl = `${window.location.origin}/verify-payment?id=${pendingPaymentId}`;

                const emailParams = {
                    to_email: owner.email,
                    to_name: owner.name,
                    customer_name: customer.name,
                    merchant_name: owner.name,
                    amount: paymentAmount,
                    balance: Math.abs(balance),
                    transaction_id: paymentModal.transactionId || 'Not Provided',
                    action_url: verificationUrl,
                    type: 'PAYMENT_VERIFICATION',
                    subject: `Action Required: New Payment Verification from ${customer.name} 💰`
                };

                // 1. Queue in DB as backup
                const queueKey = push(ref(db, 'services/email_queue')).key;
                await set(ref(db, `services/email_queue/${queueKey}`), {
                    ...emailParams,
                    screenshot: paymentModal.screenshot || '', // Keep screenshot in DB, but don't send large base64 in email if not needed
                    timestamp: Date.now()
                });

                // 2. Send directly via EmailJS (Proactive)
                await sendEmailNotification(emailParams);
            }

            alert("Payment confirmation sent to merchant! They will verify and update your ledger shortly.");
            setPaymentModal({ isOpen: false, step: 'amount', customAmount: '', transactionId: '', screenshot: '', isSubmitting: false });
        } catch (error) {
            console.error("Error confirming payment:", error);
            alert("Failed to send confirmation. Please try again or contact merchant.");
        } finally {
            setPaymentModal(prev => ({ ...prev, isSubmitting: false }));
        }
    };

    const closePaymentModal = () => {
        setPaymentModal({ isOpen: false, step: 'amount', customAmount: '', transactionId: '', screenshot: '', isSubmitting: false });
    };

    return (
        <div className="min-h-screen flex flex-col bg-white md:bg-[#F4F7FA] antialiased font-sans pb-20 md:pb-0">
            <style>
                {`
                @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap');
                
                body {
                    font-family: 'Roboto', sans-serif;
                }

                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    .print-container { padding: 0 !important; margin: 0 !important; border: none !important; box-shadow: none !important; }
                    .print-rounded { border-radius: 0 !important; }
                    main { padding: 0 !important; max-width: 100% !important; }
                    table { border-collapse: collapse; width: 100%; }
                    th, td { border: 1px solid #E2E8F0; }
                }
                `}
            </style>

            {/* Payment Modal System */}
            {paymentModal.isOpen && (
                <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 no-print">
                    <div className="bg-white w-full max-w-sm rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
                        <div className="px-8 py-6 flex items-center justify-between border-b border-slate-50">
                            <div>
                                <h2 className="text-[14px] font-black text-slate-900 uppercase tracking-widest">
                                    {paymentModal.step === 'amount' && 'Select Amount'}
                                    {paymentModal.step === 'method' && 'Choose Method'}
                                    {paymentModal.step === 'upi_id' && 'Payment UPI ID'}
                                    {paymentModal.step === 'qr' && 'Scan & Pay'}
                                    {paymentModal.step === 'confirm' && 'Confirm Payment'}
                                </h2>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Safe Secure Transactions</p>
                            </div>
                            <button onClick={closePaymentModal} aria-label="Close Payment Modal" className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-500 active:scale-90 transition-transform">
                                <span className="material-symbols-outlined text-[24px]">close</span>
                            </button>
                        </div>

                        <div className="p-8">
                            {paymentModal.step === 'amount' && (
                                <div className="space-y-4">
                                    <button
                                        onClick={() => handleAmountSelect(Math.abs(balance))}
                                        className="w-full bg-blue-600 text-white p-5 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg shadow-blue-100 active:scale-95 transition-all"
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Pay Full Amount</span>
                                        <span className="text-xl font-black">₹{Math.abs(balance).toLocaleString('en-IN')}</span>
                                    </button>

                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                            <span className="text-lg font-black text-slate-300">₹</span>
                                        </div>
                                        <input
                                            type="number"
                                            placeholder="Enter Custom Amount"
                                            className="w-full pl-10 pr-5 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-lg font-black text-slate-800 focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
                                            value={paymentModal.customAmount}
                                            onChange={(e) => setPaymentModal(prev => ({ ...prev, customAmount: e.target.value }))}
                                        />
                                    </div>

                                    <button
                                        disabled={!paymentModal.customAmount || parseFloat(paymentModal.customAmount) <= 0}
                                        onClick={() => handleAmountSelect(parseFloat(paymentModal.customAmount))}
                                        className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-slate-200 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
                                    >
                                        Continue
                                    </button>
                                </div>
                            )}

                            {paymentModal.step === 'method' && (
                                <div className="space-y-4">
                                    <div className="text-center mb-6">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Paying Amount</p>
                                        <h3 className="text-3xl font-black text-slate-900">₹{paymentAmount.toLocaleString('en-IN')}</h3>
                                    </div>

                                    <button
                                        onClick={() => handleMethodSelect('upi')}
                                        className="w-full bg-blue-600 text-white p-5 rounded-2xl flex items-center justify-center gap-4 shadow-lg shadow-blue-100 active:scale-95 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-[28px]">payments</span>
                                        <div className="text-left">
                                            <span className="block text-sm font-black uppercase tracking-widest">PAY WITH UPI ID</span>
                                            <span className="block text-[10px] font-bold opacity-80 uppercase tracking-wider">Copy ID & Pay manually</span>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => handleMethodSelect('qr')}
                                        className="w-full bg-slate-100 text-slate-900 p-5 rounded-2xl flex items-center justify-center gap-4 border border-slate-200 active:scale-95 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-[28px]">qr_code_2</span>
                                        <div className="text-left">
                                            <span className="block text-sm font-black uppercase tracking-widest">Show QR Code</span>
                                            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Scan with any app</span>
                                        </div>
                                    </button>
                                </div>
                            )}

                            {paymentModal.step === 'upi_id' && (
                                <div className="space-y-6 text-center">
                                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Merchant UPI ID</p>
                                        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                            <span className="text-sm font-black text-slate-900 select-all">{owner?.upiId}</span>
                                            <button 
                                                onClick={() => copyToClipboard(owner?.upiId)}
                                                className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center active:scale-90 transition-transform shadow-md"
                                                title="Copy UPI ID"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">content_copy</span>
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-4 leading-relaxed font-medium">
                                            Copy the UPI ID and use it on <span className="font-bold text-slate-700">PhonePe, GPay, Paytm</span> or any UPI app.
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={() => setPaymentModal(prev => ({ ...prev, step: 'confirm' }))}
                                            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all"
                                        >
                                            I've Made Payment
                                        </button>
                                        <button
                                            onClick={() => setPaymentModal(prev => ({ ...prev, step: 'method' }))}
                                            className="text-blue-600 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                                            Change Method
                                        </button>
                                    </div>
                                </div>
                            )}

                            {paymentModal.step === 'qr' && (
                                <div className="flex flex-col items-center gap-6">
                                    <div className="text-center">
                                        <h3 className="text-2xl font-black text-slate-900">₹{paymentAmount.toLocaleString('en-IN')}</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Scan to pay merchant</p>
                                    </div>

                                    <div className="p-4 bg-white border-4 border-slate-900 rounded-[2rem] shadow-2xl relative overflow-hidden">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`upi://pay?pa=${owner?.upiId}&pn=${encodeURIComponent(owner?.name || "Suman Chakrabortty")}&tn=${encodeURIComponent("HisabKhata Payments")}&am=${paymentAmount}&cu=INR`)}`}
                                            alt="UPI QR Code"
                                            width="200"
                                            height="200"
                                            className="w-[200px] h-[200px] aspect-square"
                                        />
                                        <div className="absolute inset-0 border-[12px] border-white pointer-events-none rounded-[1.8rem]"></div>
                                    </div>

                                    <div className="flex items-center gap-2 px-6 py-3 bg-green-50 text-green-700 rounded-full">
                                        <span className="material-symbols-outlined text-[18px]">verified</span>
                                        <span className="text-[10px] font-black uppercase tracking-[0.15em]">Verified UPI Payment</span>
                                    </div>

                                    <div className="flex flex-col items-center gap-3 w-full">
                                        <button
                                            onClick={handleDownloadQR}
                                            className="text-blue-600 text-[11px] font-black uppercase tracking-widest flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">download</span>
                                            Download QR
                                        </button>
                                        
                                        <button
                                            onClick={() => setPaymentModal(prev => ({ ...prev, step: 'method' }))}
                                            className="text-slate-400 text-[11px] font-black uppercase tracking-widest flex items-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                                            Change Method
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => setPaymentModal(prev => ({ ...prev, step: 'confirm' }))}
                                        className="w-full mt-2 bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all"
                                    >
                                        I've Made Payment
                                    </button>
                                </div>
                            )}

                            {paymentModal.step === 'confirm' && (
                                <div className="space-y-5">
                                    <div className="text-center">
                                        <h3 className="text-xl font-black text-slate-900">Confirm Payment</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Please provide transaction details</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="relative">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Transaction ID (Optional)</label>
                                            <input
                                                type="text"
                                                placeholder="Enter Transaction ID / Ref No."
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
                                                value={paymentModal.transactionId}
                                                onChange={(e) => setPaymentModal(prev => ({ ...prev, transactionId: e.target.value }))}
                                            />
                                        </div>

                                        <div className="relative">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Upload Screenshot (Optional)</label>
                                            <div
                                                onClick={() => document.getElementById('screenshot-upload').click()}
                                                className="w-full py-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-100 transition-all overflow-hidden relative"
                                            >
                                                {paymentModal.screenshot ? (
                                                    <div className="absolute inset-0">
                                                        <img src={paymentModal.screenshot} className="w-full h-full object-cover opacity-30" alt="Preview" />
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <span className="bg-white/80 px-3 py-1.5 rounded-full text-[10px] font-black uppercase text-slate-700 shadow-sm">Change Image</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="material-symbols-outlined text-slate-400 text-[32px]">add_a_photo</span>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Payment Proof</span>
                                                    </>
                                                )}
                                                <input
                                                    id="screenshot-upload"
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleScreenshotChange}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 pt-4">
                                        <button
                                            onClick={handleConfirmPayment}
                                            disabled={paymentModal.isSubmitting || (!paymentModal.transactionId?.trim() && !paymentModal.screenshot)}
                                            className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-100 active:scale-95 transition-all disabled:opacity-30"
                                        >
                                            {paymentModal.isSubmitting ? 'Submitting...' : 'Confirm & Notify Merchant'}
                                        </button>
                                        <button
                                            onClick={() => setPaymentModal(prev => ({ ...prev, step: 'amount' }))}
                                            className="text-slate-400 text-[10px] font-black uppercase tracking-widest"
                                        >
                                            I'll Confirm Later
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Image Preview Modal Gallery */}
            {viewImages.length > 0 && (
                <div
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 p-4 animate-in fade-in duration-200 no-print"
                    onClick={() => setViewImages([])}
                >
                    {/* Top bar */}
                    <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10 max-w-4xl mx-auto">
                        <div className="text-white text-xs md:text-sm font-bold bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
                            {viewImages.length > 1 ? `${viewIndex + 1} / ${viewImages.length} Bills` : 'Bill Attachment'}
                        </div>
                        <button 
                            onClick={() => setViewImages([])}
                            className="text-white p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <span className="material-symbols-outlined text-[24px] md:text-[28px]">close</span>
                        </button>
                    </div>

                    {/* Main image with left/right buttons */}
                    <div className="relative max-w-4xl max-h-[75vh] flex items-center justify-center">
                        {viewImages.length > 1 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setViewIndex((prev) => (prev > 0 ? prev - 1 : viewImages.length - 1));
                                }}
                                className="absolute left-2 md:-left-12 z-20 text-white p-2 bg-black/60 hover:bg-black/90 rounded-full backdrop-blur-md transition-all active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[24px]">chevron_left</span>
                            </button>
                        )}

                        <img
                            src={viewImages[viewIndex]}
                            alt={`Bill Attachment ${viewIndex + 1}`}
                            className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
                            onClick={(e) => e.stopPropagation()}
                        />

                        {viewImages.length > 1 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setViewIndex((prev) => (prev < viewImages.length - 1 ? prev + 1 : 0));
                                }}
                                className="absolute right-2 md:-right-12 z-20 text-white p-2 bg-black/60 hover:bg-black/90 rounded-full backdrop-blur-md transition-all active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[24px]">chevron_right</span>
                            </button>
                        )}
                    </div>

                    {/* Bottom thumbnail strip */}
                    {viewImages.length > 1 && (
                        <div 
                            className="mt-4 flex gap-2 overflow-x-auto max-w-full p-2 bg-black/40 rounded-2xl backdrop-blur-md z-10 custom-scrollbar"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {viewImages.map((img, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setViewIndex(idx)}
                                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${viewIndex === idx ? 'border-blue-500 scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                >
                                    <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Desktop Header */}
            <header className="hidden md:flex no-print sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 px-8 h-16 items-center justify-between shadow-xs">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-linear-to-br from-[#0057BB] to-[#003C82] rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20 text-white shrink-0">
                            <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-extrabold text-slate-900 text-base leading-tight tracking-tight">Hisab Khata</span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#0057BB] border border-blue-100">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#0057BB]"></span> Verified Ledger
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium truncate max-w-xs">
                                Statement for <span className="font-semibold text-slate-700">{customer.name}</span>
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {owner?.phone && (
                        <a
                            href={`tel:${owner.phone}`}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                            title={`Call ${owner.name || 'Merchant'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">call</span>
                            <span>{owner.phone}</span>
                        </a>
                    )}
                    {isReceivable && (
                        <button
                            onClick={handlePayOnlineClick}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold tracking-wide shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[18px]">payments</span>
                            Pay Online
                        </button>
                    )}
                    <button
                        onClick={handleDownloadStatement}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold tracking-wide shadow-md shadow-slate-900/10 transition-all active:scale-95 cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-[18px]">download</span>
                        Download Statement
                    </button>
                </div>
            </header>

            {/* Mobile Header */}
            <header className="md:hidden no-print sticky top-0 z-50 bg-[#0057BB] text-white px-4 py-4 flex flex-col gap-1 shadow-md">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-white text-[24px]">account_balance_wallet</span>
                        <h1 className="font-bold text-lg">Hisab Khata</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {owner?.phone && (
                            <a href={`tel:${owner.phone}`} className="p-1">
                                <span className="material-symbols-outlined text-[24px]">call</span>
                            </a>
                        )}
                        {owner?.email && (
                            <a href={`mailto:${owner.email}`} className="p-1">
                                <span className="material-symbols-outlined text-[24px]">mail</span>
                            </a>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-bold text-white text-[10px] uppercase overflow-hidden shrink-0">
                        {customer.photoURL ? (
                            <img src={customer.photoURL} alt={customer.name} className="w-full h-full object-cover" />
                        ) : (
                            initials
                        )}
                    </div>
                    <p className="text-[11px] font-medium text-blue-100 uppercase tracking-wider truncate">Statement: {customer.name}</p>
                </div>
            </header>

            <main className="flex-1 w-full max-w-5xl mx-auto p-0 md:p-8 space-y-4 md:space-y-6 print-container">

                {/* Mobile Identity / Balance Card */}
                <div className="md:hidden bg-[#0057BB] text-white px-4 pb-12 pt-4">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-white text-lg border border-white/20 uppercase overflow-hidden shrink-0">
                            {customer.photoURL ? (
                                <img src={customer.photoURL} alt={customer.name} className="w-full h-full object-cover" />
                            ) : (
                                initials
                            )}
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold text-white truncate">{customer.name}</h2>
                            {customer.phone && <p className="text-xs text-blue-100 font-medium opacity-80">+91 {customer.phone}</p>}
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <p className="text-xs text-blue-100 opacity-80 uppercase font-medium tracking-wider">Net Balance</p>
                        <div className="flex items-center gap-2">
                            <h2 className="text-4xl font-black">₹{balanceAbsolute}</h2>
                            <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full uppercase">
                                {isReceivable ? 'Pending' : 'Settled'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Identity Card (Desktop Only) */}
                <div className="hidden md:block bg-white rounded-2xl border border-slate-200/90 p-7 shadow-xs relative overflow-hidden print-rounded">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-[#0057BB] via-blue-500 to-indigo-600"></div>
                    <div className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="h-16 w-16 rounded-2xl bg-linear-to-br from-slate-100 to-slate-200 flex items-center justify-center font-black text-[#0057BB] text-2xl border border-slate-200/80 shadow-xs uppercase overflow-hidden shrink-0">
                                {customer.photoURL ? (
                                    <img src={customer.photoURL} alt={customer.name} className="w-full h-full object-cover" />
                                ) : (
                                    initials
                                )}
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Account Statement</span>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-[11px] font-semibold text-slate-500">{transactions.length} Entries</span>
                                </div>
                                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{customer.name}</h1>
                                <div className="flex items-center gap-2 pt-0.5">
                                    {customer.phone ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200/60">
                                            <span className="material-symbols-outlined text-[14px] text-slate-500">call</span>
                                            +91 {customer.phone}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-slate-400 italic">No phone linked</span>
                                    )}
                                    {customer.address && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200/60 truncate max-w-xs">
                                            <span className="material-symbols-outlined text-[14px] text-slate-400">location_on</span>
                                            {customer.address}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Net Balance Panel */}
                        <div className={`p-5 rounded-2xl border min-w-[240px] text-right transition-all print:bg-white print:border-slate-200 ${
                            isReceivable 
                                ? 'bg-rose-50/70 border-rose-200/70' 
                                : 'bg-emerald-50/70 border-emerald-200/70'
                        }`}>
                            <div className="flex items-center justify-end gap-1.5 mb-1">
                                <span className={`w-2 h-2 rounded-full ${isReceivable ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Net Balance</p>
                            </div>
                            <h3 className={`text-3xl font-extrabold tracking-tight ${isReceivable ? 'text-rose-600' : 'text-emerald-700'}`}>
                                ₹{balanceAbsolute}
                            </h3>
                            <div className="flex items-center justify-end gap-1.5 mt-1.5">
                                <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                    isReceivable 
                                        ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}>
                                    {isReceivable ? 'Pending Due' : 'Settled / Advance'}
                                </span>
                            </div>
                            {customer.dueDate && isReceivable && (() => {
                                const status = getDueDateStatus(customer.dueDate);
                                if (!status) return null;
                                return (
                                    <div className={`mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border ${status.badgeColor}`}>
                                        <span className="material-symbols-outlined text-[13px]">event</span>
                                        {status.label}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* Desktop 3-Card Summary Grid */}
                <div className="hidden md:grid grid-cols-3 gap-4 no-print">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Purchases</p>
                            <p className="text-2xl font-black text-rose-600">₹{totalGave}</p>
                            <p className="text-[11px] text-slate-500 mt-1 font-medium">Debit / You Gave</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                            <span className="material-symbols-outlined text-[24px]">trending_down</span>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Payments</p>
                            <p className="text-2xl font-black text-emerald-600">₹{totalGot}</p>
                            <p className="text-[11px] text-slate-500 mt-1 font-medium">Credit / You Got</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                            <span className="material-symbols-outlined text-[24px]">trending_up</span>
                        </div>
                    </div>

                    <div className={`p-5 rounded-2xl border shadow-2xs transition-all flex items-center justify-between ${
                        isReceivable ? 'bg-rose-50/40 border-rose-200/60' : 'bg-emerald-50/40 border-emerald-200/60'
                    }`}>
                        <div>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Closing Balance</p>
                            <p className={`text-2xl font-black ${isReceivable ? 'text-rose-600' : 'text-emerald-700'}`}>
                                ₹{balanceAbsolute}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-1 font-medium">
                                {isReceivable ? 'Amount to be paid' : 'Account in clear'}
                            </p>
                        </div>
                        <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${
                            isReceivable 
                                ? 'bg-rose-100/80 border-rose-200 text-rose-700' 
                                : 'bg-emerald-100/80 border-emerald-200 text-emerald-700'
                        }`}>
                            <span className="material-symbols-outlined text-[24px]">account_balance_wallet</span>
                        </div>
                    </div>
                </div>

                {/* Summary Row (Mobile Only Overlay) */}
                <div className="px-4 -mt-8 md:hidden">
                    <div className="grid grid-cols-2 bg-white p-4 rounded-xl shadow-lg border border-slate-100 divide-x divide-slate-100">
                        <div className="pr-4">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Purchases</p>
                            <p className="text-lg font-bold text-red-500">₹{totalGave}</p>
                        </div>
                        <div className="pl-4 text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Payments</p>
                            <p className="text-lg font-bold text-green-600">₹{totalGot}</p>
                        </div>
                    </div>
                </div>

                {/* Ledger Transactions Table Container */}
                <div className="bg-white md:rounded-2xl md:border border-slate-200/90 md:shadow-xs overflow-hidden print-rounded">
                    {/* Desktop table title header */}
                    <div className="hidden md:flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-600 text-[20px]">receipt_long</span>
                            <h2 className="font-bold text-sm text-slate-800 uppercase tracking-wide">Transaction History</h2>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">
                            Showing {transactions.length} record{transactions.length === 1 ? '' : 's'}
                        </span>
                    </div>

                    <div className="overflow-x-auto md:overflow-x-visible">
                        <table className="w-full text-left table-fixed">
                            <thead className="bg-[#F8FAFC] border-b border-slate-200">
                                <tr>
                                    <th className="px-1.5 md:px-6 py-3 md:py-3.5 text-[11px] md:text-xs font-bold text-slate-600 uppercase tracking-wider w-[32%] md:w-[40%]">Date & Details</th>
                                    <th className="px-1 md:px-6 py-3 md:py-3.5 text-[11px] md:text-xs font-bold text-rose-600 uppercase tracking-wider text-center md:text-right w-[21%] md:w-[20%]">Debit (-)</th>
                                    <th className="px-1 md:px-6 py-3 md:py-3.5 text-[11px] md:text-xs font-bold text-emerald-600 uppercase tracking-wider text-center md:text-right w-[21%] md:w-[20%]">Credit (+)</th>
                                    <th className="px-1 md:px-6 py-3 md:py-3.5 text-[11px] md:text-xs font-bold text-slate-600 uppercase tracking-wider text-right w-[26%] md:w-[20%]">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 md:divide-slate-200/70">
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <span className="material-symbols-outlined text-slate-300 text-[40px]">description</span>
                                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No transactions recorded yet</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : transactions.map((tx, index) => {
                                    const amount = tx.amount || 0;
                                    const isGave = amount < 0;
                                    const absAmount = Math.abs(amount).toLocaleString('en-IN');
                                    const date = tx.timestamp ? new Date(tx.timestamp) : null;
                                    const isBalanceDebit = (tx.runningBalance || 0) < 0;

                                    return (
                                        <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors group">
                                            {/* Date Column */}
                                            <td className="px-1.5 md:px-6 py-3 md:py-4 align-top">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <p className="text-[11px] md:text-sm font-bold text-slate-800 leading-tight">
                                                        {date ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                                    </p>
                                                    {index === 0 && (
                                                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] md:text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
                                                            Latest
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[9px] md:text-xs text-slate-500 font-normal mt-0.5 line-clamp-2 md:line-clamp-none break-words leading-relaxed">
                                                    {tx.description || 'General Entry'}
                                                </p>
                                                {(() => {
                                                    const atts = Array.isArray(tx.attachments) && tx.attachments.length > 0 ? tx.attachments : (tx.attachment ? [tx.attachment] : []);
                                                    if (atts.length === 0) return null;
                                                    return (
                                                        <div className="mt-1.5 no-print">
                                                            <button
                                                                onClick={() => handleOpenView(atts, 0)}
                                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 text-[10px] md:text-xs font-semibold transition-colors cursor-pointer border border-blue-100"
                                                                title={`${atts.length} bill attachment(s)`}
                                                            >
                                                                <span className="material-symbols-outlined text-[14px] md:text-[16px]">receipt</span>
                                                                <span>{atts.length} {atts.length === 1 ? 'Bill attached' : 'Bills attached'}</span>
                                                            </button>
                                                        </div>
                                                    );
                                                })()}
                                            </td>

                                            {/* Debit Column */}
                                            <td className={`px-1 md:px-6 py-3 md:py-4 text-center md:text-right align-top ${isGave ? 'bg-rose-50/20 md:bg-transparent' : ''}`}>
                                                {isGave ? (
                                                    <span className="text-[11px] md:text-sm font-extrabold text-rose-600">
                                                        ₹{absAmount}
                                                    </span>
                                                ) : (
                                                    <span className="hidden md:inline text-slate-300 text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Credit Column */}
                                            <td className={`px-1 md:px-6 py-3 md:py-4 text-center md:text-right align-top ${!isGave ? 'bg-emerald-50/20 md:bg-transparent' : ''}`}>
                                                {!isGave ? (
                                                    <span className="text-[11px] md:text-sm font-extrabold text-emerald-600">
                                                        ₹{absAmount}
                                                    </span>
                                                ) : (
                                                    <span className="hidden md:inline text-slate-300 text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Balance Column */}
                                            <td className="px-1 md:px-6 py-3 md:py-4 text-right align-top">
                                                <div className="inline-flex items-center justify-end gap-1 font-black">
                                                    <span className={`text-[11px] md:text-sm ${isBalanceDebit ? 'text-rose-600' : 'text-emerald-700'}`}>
                                                        ₹{Math.abs(tx.runningBalance || 0).toLocaleString('en-IN')}
                                                    </span>
                                                    <span className={`text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                        isBalanceDebit ? 'bg-rose-100/70 text-rose-700' : 'bg-emerald-100/70 text-emerald-700'
                                                    }`}>
                                                        {isBalanceDebit ? 'Dr' : 'Cr'}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Secure Footer */}
                <footer className="text-center space-y-3 py-10 px-4">
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                        <span className="material-symbols-outlined text-[16px] text-emerald-600">verified_user</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Verified Digital Statement</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed max-w-md mx-auto">
                        This digital ledger is provided for account transparency.
                        Generated on {new Date().toLocaleString()}
                        <br className="hidden md:block" />
                        Platform by <a href="https://SumanOnline.Com" target="_blank" rel="noreferrer" className="text-[#0057BB] font-bold hover:underline no-print">SumanOnline.Com</a>
                    </p>
                </footer>
            </main>

            {/* Mobile Fixed Bottom Bar — High Fidelity Action Hub */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3.5 flex items-center gap-3 no-print z-50 safe-bottom shadow-[0_-10px_25px_rgba(0,0,0,0.08)]">
                <button
                    onClick={handleDownloadStatement}
                    className={`${isReceivable ? 'flex-[1.4]' : 'flex-1'} bg-[#0057BB] text-white h-[56px] rounded-2xl font-bold text-[13px] flex items-center justify-center gap-2 shadow-xl shadow-blue-100 active:scale-[0.98] transition-all whitespace-nowrap`}
                >
                    <span className="material-symbols-outlined text-[20px]">download</span>
                    Download Statement
                </button>
                {isReceivable && (
                    <button
                        onClick={handlePayOnlineClick}
                        className="flex-1 bg-[#2E7D32] text-white h-[56px] rounded-2xl font-bold text-[13px] flex items-center justify-center gap-2 shadow-xl shadow-green-100 active:scale-[0.98] transition-all whitespace-nowrap"
                    >
                        <span className="material-symbols-outlined text-[20px]">payments</span>
                        Pay Online
                    </button>
                )}
            </div>
        </div>
    );
};

export default CustomerShareableView;
