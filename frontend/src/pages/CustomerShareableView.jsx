import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { dbService, db, sendEmailNotification } from '../services/firebase';
import { ref, onValue, push, set, get, query, orderByChild, equalTo } from 'firebase/database';
import { uploadToR2, R2_FOLDERS } from '../services/r2Storage';
import { compressImage } from '../utils/imageUtils';
import { getDueDateStatus } from '../utils/dueDateUtils';
// Heavy PDF libraries will be imported dynamically when needed

const CustomerShareableView = () => {
    const { id } = useParams();
    const [customer, setCustomer] = useState(null);
    const [owner, setOwner] = useState(null);
    const [rawTransactions, setRawTransactions] = useState([]);
    const [viewImages, setViewImages] = useState([]);
    const [viewIndex, setViewIndex] = useState(0);
    const [globalSettings, setGlobalSettings] = useState({ shareLinks: true });
    const [paymentModal, setPaymentModal] = useState({ isOpen: false, step: 'amount', customAmount: '', transactionId: '', screenshot: '', isSubmitting: false });
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [copiedUpi, setCopiedUpi] = useState(false);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

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

    // Global Clipboard Paste Listener for Payment Proof
    useEffect(() => {
        if (!paymentModal.isOpen || paymentModal.step !== 'confirm') return;

        const handlePaste = async (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                        try {
                            const compressed = await compressImage(file, 1200, 1200, 0.8);
                            setPaymentModal(prev => ({ ...prev, screenshot: compressed }));
                            try {
                                const r2Url = await uploadToR2(compressed, R2_FOLDERS.PAYMENT_PROOF, `proof_${id}_${Date.now()}`);
                                setPaymentModal(prev => ({ ...prev, screenshot: r2Url }));
                            } catch (r2Err) {
                                console.warn("R2 upload fallback on paste:", r2Err);
                            }
                        } catch (err) {
                            console.error("Paste error:", err);
                        }
                    }
                    break;
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [paymentModal.isOpen, paymentModal.step, id]);

    useEffect(() => {
        // Listen to global settings with fallback
        const settingsRef = ref(db, 'settings');
        const unsubSettings = onValue(settingsRef, (snapshot) => {
            if (snapshot.exists()) {
                setGlobalSettings(snapshot.val());
            } else {
                setGlobalSettings({ shareLinks: true });
            }
        }, (err) => {
            console.warn("Global settings listener warning:", err);
            setGlobalSettings({ shareLinks: true });
        });

        get(settingsRef).then((snap) => {
            if (snap.exists()) setGlobalSettings(snap.val());
        }).catch(() => {});

        return () => {
            if (typeof unsubSettings === 'function') unsubSettings();
        };
    }, []);

    useEffect(() => {
        if (!id) {
            setNotFound(true);
            setLoading(false);
            return;
        }

        let isMounted = true;
        setLoading(true);
        setNotFound(false);

        // 1. Direct one-time fetch for instant render (bypasses potential listener delays)
        const fetchDirectData = async () => {
            try {
                const customerSnap = await get(ref(db, `customers/${id}`));
                if (!isMounted) return;

                if (customerSnap.exists()) {
                    const cData = { id: customerSnap.key, ...customerSnap.val() };
                    setCustomer(cData);
                    setNotFound(false);

                    if (cData.userId) {
                        get(ref(db, `users/${cData.userId}`)).then((uSnap) => {
                            if (isMounted && uSnap.exists()) {
                                setOwner(uSnap.val());
                            }
                        }).catch(() => {});
                    }
                } else {
                    setNotFound(true);
                    setLoading(false);
                    return;
                }

                const txQuery = query(ref(db, 'transactions'), orderByChild('customerId'), equalTo(id));
                const txSnap = await get(txQuery);
                if (!isMounted) return;

                const txList = [];
                if (txSnap.exists()) {
                    txSnap.forEach((child) => {
                        txList.push({ id: child.key, ...child.val() });
                    });
                }
                setRawTransactions(txList);
                setLoading(false);
            } catch (err) {
                console.warn("Direct fetch warning:", err);
                if (isMounted) setLoading(false);
            }
        };

        fetchDirectData();

        // 2. Realtime listener for customer
        const customerRef = ref(db, `customers/${id}`);
        const unsubCustomer = onValue(customerRef, (snapshot) => {
            if (!isMounted) return;
            if (snapshot.exists()) {
                const customerData = { id: snapshot.key, ...snapshot.val() };
                setCustomer(customerData);
                setNotFound(false);

                if (customerData.userId) {
                    onValue(ref(db, `users/${customerData.userId}`), (ownerSnap) => {
                        if (isMounted && ownerSnap.exists()) {
                            setOwner(ownerSnap.val());
                        }
                    }, { onlyOnce: true });
                }
            } else {
                setNotFound(true);
                setLoading(false);
            }
        }, (err) => {
            console.warn("Customer listener warning:", err);
            if (isMounted) setLoading(false);
        });

        // 3. Realtime listener for transactions
        const txQuery = query(ref(db, 'transactions'), orderByChild('customerId'), equalTo(id));
        const unsubTransactions = onValue(txQuery, (snapshot) => {
            if (!isMounted) return;
            const list = [];
            snapshot.forEach((childSnapshot) => {
                list.push({ id: childSnapshot.key, ...childSnapshot.val() });
            });
            setRawTransactions(list);
            setLoading(false);
        }, (err) => {
            console.warn("Transactions listener warning:", err);
            if (isMounted) setLoading(false);
        });

        // 4. Safety Timeout (5s) to guarantee spinner never hangs indefinitely
        const timer = setTimeout(() => {
            if (isMounted && loading) {
                setLoading(false);
            }
        }, 5000);

        return () => {
            isMounted = false;
            clearTimeout(timer);
            if (typeof unsubCustomer === 'function') unsubCustomer();
            if (typeof unsubTransactions === 'function') unsubTransactions();
        };
    }, [id, retryCount]);

    // Compute running balances cleanly
    const transactions = useMemo(() => {
        if (!rawTransactions.length) return [];
        const sorted = [...rawTransactions].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        let running = customer?.balance || 0;
        return sorted.map(tx => {
            const txWithBal = { ...tx, runningBalance: running };
            running -= (tx.amount || 0);
            return txWithBal;
        });
    }, [rawTransactions, customer?.balance]);

    if (notFound || (!loading && !customer)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center antialiased font-sans">
                <div className="max-w-md w-full bg-white p-8 md:p-10 rounded-3xl shadow-xl shadow-slate-200 border border-slate-100">
                    <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
                        <span className="material-symbols-outlined text-[36px]">folder_off</span>
                    </div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 mb-2">Statement Not Found</h1>
                    <p className="text-slate-500 mb-6 leading-relaxed text-xs md:text-sm">
                        This digital statement link is invalid, expired, or may have been updated by the merchant.
                    </p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => setRetryCount(prev => prev + 1)}
                            className="w-full py-3 bg-[#0057BB] hover:bg-[#004291] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                        >
                            Retry Loading
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
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

    const [activeMethodTab, setActiveMethodTab] = useState('upi'); // 'upi' | 'qr' | 'bank' | 'copy'
    const [copiedField, setCopiedField] = useState(''); // track which field was copied

    const handlePayOnlineClick = () => {
        const fullBal = Math.abs(balance || 0);
        setPaymentAmount(fullBal > 0 ? fullBal : 0);
        const hasUpi = Boolean(owner?.upiId);
        const hasBank = Boolean(owner?.accountNumber);
        
        setPaymentModal({ 
            isOpen: true, 
            step: (hasUpi || hasBank) ? 'amount' : 'no_upi', 
            customAmount: fullBal > 0 ? String(fullBal) : '',
            transactionId: '',
            screenshot: '',
            isSubmitting: false
        });
        setActiveMethodTab(hasUpi ? 'upi' : (hasBank ? 'bank' : 'upi'));
    };

    const copyToClipboard = (text, fieldName = 'upi') => {
        if (!text) return;
        const doSuccess = () => {
            setCopiedField(fieldName);
            setTimeout(() => setCopiedField(''), 2200);
        };

        if (navigator?.clipboard?.writeText) {
            navigator.clipboard.writeText(text).then(doSuccess).catch(() => {
                fallbackCopy(text);
                doSuccess();
            });
        } else {
            fallbackCopy(text);
            doSuccess();
        }
    };

    const fallbackCopy = (text) => {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
        } catch (e) {
            console.warn("Copy fallback failed:", e);
        }
    };

    const handleAmountSelect = (amount) => {
        if (!amount || amount <= 0) return;
        setPaymentAmount(amount);
        setPaymentModal(prev => ({ ...prev, step: 'method' }));
    };

    const getUpiIntentUrl = (appScheme = 'upi') => {
        const upiId = owner?.upiId || '';
        const payeeName = encodeURIComponent(owner?.name || "Merchant");
        const transactionNote = encodeURIComponent(`Ledger Payment - ${customer?.name || 'Customer'}`);
        const baseParams = `pa=${upiId}&pn=${payeeName}&tn=${transactionNote}&am=${paymentAmount}&cu=INR`;

        if (appScheme === 'phonepe') {
            return `phonepe://pay?${baseParams}`;
        } else if (appScheme === 'gpay') {
            return `tez://upi/pay?${baseParams}`;
        } else if (appScheme === 'paytm') {
            return `paytmmp://pay?${baseParams}`;
        }
        return `upi://pay?${baseParams}`;
    };

    const handleLaunchUpiApp = (appScheme = 'upi') => {
        const url = getUpiIntentUrl(appScheme);
        window.location.href = url;
        // Automatically switch to confirm step so when user returns from app, they are on proof submission
        setTimeout(() => {
            setPaymentModal(prev => ({ ...prev, step: 'confirm' }));
        }, 1200);
    };

    const handleDownloadQR = async () => {
        const upiUrl = getUpiIntentUrl('upi');
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(upiUrl)}`;
        
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 800;
            canvas.height = 1400;

            // Background Layer
            ctx.fillStyle = '#F8FAFC';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Header Banner
            ctx.fillStyle = '#0057BB';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(800, 0);
            ctx.lineTo(800, 250);
            ctx.lineTo(0, 450);
            ctx.fill();

            // Header Text
            ctx.textAlign = 'center';
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 30px "Roboto", Arial';
            ctx.fillText('PAYMENT QR', 400, 80);
            ctx.font = '900 60px "Roboto", Arial';
            ctx.fillText('HisabKhata PRO', 400, 160);
            ctx.font = 'bold 22px "Roboto", Arial';
            ctx.fillText('a SumanOnline Website', 400, 210);

            // White QR Card with Shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
            ctx.shadowBlur = 30;
            ctx.shadowOffsetY = 15;
            ctx.fillStyle = '#FFFFFF';
            
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

            ctx.fillStyle = '#1E293B';
            ctx.font = 'bold 40px "Roboto", Arial';
            ctx.fillText('BHIM | UPI', 400, 360);
            
            const qrImg = new Image();
            qrImg.crossOrigin = "anonymous";
            qrImg.src = qrUrl;
            await new Promise(resolve => qrImg.onload = resolve);
            ctx.drawImage(qrImg, 150, 420, 500, 500);

            ctx.fillStyle = '#64748B';
            ctx.font = 'bold 22px "Roboto", Arial';
            ctx.fillText('SCAN & PAY WITH ANY UPI APP', 400, 960);
            
            ctx.fillStyle = '#0057BB';
            ctx.font = '900 75px "Roboto", Arial';
            ctx.fillText(`₹${paymentAmount}`, 400, 1120);

            ctx.fillStyle = '#0F172A';
            ctx.font = '900 48px "Roboto", Arial';
            ctx.fillText(owner?.name || 'Valued Merchant', 400, 1190);
            
            ctx.fillStyle = '#64748B';
            ctx.font = '500 22px "Roboto", Arial';
            const tagline = `Secure payment for ${customer?.name || 'Customer'}. Verified HisabKhata Digital Statement.`;
            
            const words = tagline.split(' ');
            let line = '';
            let y = 1240;
            for (let n = 0; n < words.length; n++) {
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

            const dataUrl = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `HisabKhata_Payment_${owner?.name?.replace(/\s+/g, '_')}_Rs${paymentAmount}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error("QR Download failed:", error);
            window.open(qrUrl, '_blank');
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
                    subject: `Payment Verification: ₹${paymentAmount} from ${customer.name} 💰`
                };

                const queueKey = push(ref(db, 'services/email_queue')).key;
                await set(ref(db, `services/email_queue/${queueKey}`), {
                    ...emailParams,
                    screenshot: paymentModal.screenshot || '',
                    timestamp: Date.now()
                });

                sendEmailNotification(emailParams).catch(() => {});
            }

            setPaymentModal(prev => ({ ...prev, step: 'success', isSubmitting: false }));
        } catch (error) {
            console.error("Error confirming payment:", error);
            alert("Failed to submit confirmation. Please retry or contact merchant.");
            setPaymentModal(prev => ({ ...prev, isSubmitting: false }));
        }
    };

    const closePaymentModal = () => {
        setPaymentModal({ isOpen: false, step: 'amount', customAmount: '', transactionId: '', screenshot: '', isSubmitting: false });
        setActiveMethodTab('upi');
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
                <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200 no-print">
                    <div className="bg-white w-full max-w-md rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 max-h-[92vh] flex flex-col">
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    {paymentModal.step !== 'amount' && paymentModal.step !== 'no_upi' && paymentModal.step !== 'success' && (
                                        <button
                                            onClick={() => {
                                                if (paymentModal.step === 'confirm') setPaymentModal(prev => ({ ...prev, step: 'method' }));
                                                else setPaymentModal(prev => ({ ...prev, step: 'amount' }));
                                            }}
                                            className="w-8 h-8 rounded-full hover:bg-slate-200/70 flex items-center justify-center text-slate-600 transition-colors"
                                            title="Back"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                                        </button>
                                    )}
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                                            {paymentModal.step === 'amount' && '1. Choose Amount'}
                                            {paymentModal.step === 'method' && '2. Complete Payment'}
                                            {paymentModal.step === 'confirm' && '3. Submit Payment Proof'}
                                            {paymentModal.step === 'no_upi' && 'Payment Options'}
                                            {paymentModal.step === 'success' && 'Payment Submitted'}
                                        </h2>
                                        <p className="text-[10px] text-slate-400 font-medium">To {owner?.name || 'Merchant'}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={closePaymentModal}
                                    aria-label="Close Payment Modal"
                                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 active:scale-95 transition-all"
                                >
                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                </button>
                            </div>

                            {/* Step Indicator Pills */}
                            {paymentModal.step !== 'no_upi' && paymentModal.step !== 'success' && (
                                <div className="grid grid-cols-3 gap-1.5 mt-3">
                                    <div className={`h-1.5 rounded-full transition-all ${paymentModal.step === 'amount' ? 'bg-[#0057BB]' : 'bg-[#0057BB]/40'}`} />
                                    <div className={`h-1.5 rounded-full transition-all ${paymentModal.step === 'method' ? 'bg-[#0057BB]' : (paymentModal.step === 'confirm' ? 'bg-[#0057BB]/40' : 'bg-slate-200')}`} />
                                    <div className={`h-1.5 rounded-full transition-all ${paymentModal.step === 'confirm' ? 'bg-[#0057BB]' : 'bg-slate-200'}`} />
                                </div>
                            )}
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 overflow-y-auto custom-scrollbar">
                            {/* No UPI Configured */}
                            {paymentModal.step === 'no_upi' && (
                                <div className="text-center py-4 space-y-4">
                                    <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
                                        <span className="material-symbols-outlined text-[32px]">account_balance_wallet</span>
                                    </div>
                                    <h3 className="text-base font-bold text-slate-900">Direct Online Pay Unavailable</h3>
                                    <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                                        The merchant has not configured UPI or bank account details yet. Please contact them directly for payment instructions.
                                    </p>
                                    {owner?.phone && (
                                        <a
                                            href={`tel:${owner.phone}`}
                                            className="inline-flex items-center justify-center gap-2 w-full py-3 bg-[#0057BB] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">call</span>
                                            Call {owner.name || 'Merchant'} ({owner.phone})
                                        </a>
                                    )}
                                </div>
                            )}

                            {/* Step 1: Select Amount */}
                            {paymentModal.step === 'amount' && (
                                <div className="space-y-4">
                                    {/* Full Balance Button */}
                                    {Math.abs(balance) > 0 && (
                                        <button
                                            onClick={() => handleAmountSelect(Math.abs(balance))}
                                            className="w-full bg-[#0057BB] hover:bg-[#004291] text-white p-4 rounded-2xl flex items-center justify-between shadow-md shadow-blue-500/15 active:scale-[0.99] transition-all cursor-pointer group"
                                        >
                                            <div className="text-left">
                                                <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-100">Pay Full Outstanding Due</span>
                                                <span className="block text-2xl font-black mt-0.5">₹{Math.abs(balance).toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-white group-hover:translate-x-1 transition-transform">
                                                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                                            </div>
                                        </button>
                                    )}

                                    {/* Preset Quick Chips */}
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Preset Amounts</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {[500, 1000, 2000, 5000].map(amt => (
                                                <button
                                                    key={amt}
                                                    onClick={() => {
                                                        setPaymentModal(prev => ({ ...prev, customAmount: String(amt) }));
                                                    }}
                                                    className={`py-2.5 px-1 rounded-xl text-xs font-bold border transition-all ${
                                                        paymentModal.customAmount === String(amt)
                                                            ? 'bg-blue-50 border-[#0057BB] text-[#0057BB] shadow-xs'
                                                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    ₹{amt.toLocaleString('en-IN')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Custom Amount Field */}
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Custom Amount</label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 font-bold text-lg">₹</span>
                                            <input
                                                type="number"
                                                min="1"
                                                placeholder="Enter amount to pay"
                                                className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold text-slate-900 focus:bg-white focus:border-[#0057BB] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                value={paymentModal.customAmount}
                                                onChange={(e) => setPaymentModal(prev => ({ ...prev, customAmount: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        disabled={!paymentModal.customAmount || parseFloat(paymentModal.customAmount) <= 0}
                                        onClick={() => handleAmountSelect(parseFloat(paymentModal.customAmount))}
                                        className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        <span>Proceed with ₹{parseFloat(paymentModal.customAmount || 0).toLocaleString('en-IN')}</span>
                                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                    </button>
                                </div>
                            )}

                            {/* Step 2: Choose Method / Perform Payment */}
                            {paymentModal.step === 'method' && (
                                <div className="space-y-4">
                                    {/* Amount Summary Bar */}
                                    <div className="bg-blue-50/70 border border-blue-100 p-3.5 rounded-2xl flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Paying To: {owner?.name || 'Merchant'}</p>
                                            <h3 className="text-2xl font-black text-slate-900 mt-0.5">₹{paymentAmount.toLocaleString('en-IN')}</h3>
                                        </div>
                                        <button
                                            onClick={() => setPaymentModal(prev => ({ ...prev, step: 'amount' }))}
                                            className="px-3 py-1.5 bg-white border border-blue-200 text-xs font-bold text-[#0057BB] hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            Change
                                        </button>
                                    </div>

                                    {/* Sub-tabs for Payment Method */}
                                    <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-bold">
                                        {owner?.upiId && (
                                            <button
                                                onClick={() => setActiveMethodTab('upi')}
                                                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                                    activeMethodTab === 'upi' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                                                }`}
                                            >
                                                <span className="material-symbols-outlined text-[16px]">bolt</span>
                                                UPI Apps
                                            </button>
                                        )}
                                        {owner?.upiId && (
                                            <button
                                                onClick={() => setActiveMethodTab('qr')}
                                                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                                    activeMethodTab === 'qr' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                                                }`}
                                            >
                                                <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                                                QR Code
                                            </button>
                                        )}
                                        {owner?.upiId && (
                                            <button
                                                onClick={() => setActiveMethodTab('copy')}
                                                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                                    activeMethodTab === 'copy' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                                                }`}
                                            >
                                                <span className="material-symbols-outlined text-[16px]">content_copy</span>
                                                UPI ID
                                            </button>
                                        )}
                                        {(owner?.bankName || owner?.accountNumber) && (
                                            <button
                                                onClick={() => setActiveMethodTab('bank')}
                                                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                                    activeMethodTab === 'bank' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                                                }`}
                                            >
                                                <span className="material-symbols-outlined text-[16px]">account_balance</span>
                                                Bank
                                            </button>
                                        )}
                                    </div>

                                    {/* TAB 1: 1-Tap UPI Apps Grid */}
                                    {activeMethodTab === 'upi' && (
                                        <div className="space-y-2.5">
                                            <p className="text-[11px] font-semibold text-slate-500">Tap your preferred app to initiate payment:</p>
                                            <div className="grid grid-cols-2 gap-2.5">
                                                {/* PhonePe */}
                                                <button
                                                    onClick={() => handleLaunchUpiApp('phonepe')}
                                                    className="p-3.5 bg-purple-50 hover:bg-purple-100 border border-purple-200/80 rounded-2xl flex items-center gap-2.5 text-left transition-all active:scale-[0.98] cursor-pointer group"
                                                >
                                                    <div className="w-9 h-9 rounded-xl bg-[#5f259f] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                                                        Pe
                                                    </div>
                                                    <div>
                                                        <span className="block text-xs font-bold text-slate-900">PhonePe</span>
                                                        <span className="block text-[10px] text-purple-700 font-medium">1-Tap Pay</span>
                                                    </div>
                                                </button>

                                                {/* Google Pay */}
                                                <button
                                                    onClick={() => handleLaunchUpiApp('gpay')}
                                                    className="p-3.5 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-2xl flex items-center gap-2.5 text-left transition-all active:scale-[0.98] cursor-pointer group"
                                                >
                                                    <div className="w-9 h-9 rounded-xl bg-[#1a73e8] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                                                        G
                                                    </div>
                                                    <div>
                                                        <span className="block text-xs font-bold text-slate-900">Google Pay</span>
                                                        <span className="block text-[10px] text-blue-700 font-medium">1-Tap Pay</span>
                                                    </div>
                                                </button>

                                                {/* Paytm */}
                                                <button
                                                    onClick={() => handleLaunchUpiApp('paytm')}
                                                    className="p-3.5 bg-sky-50 hover:bg-sky-100 border border-sky-200/80 rounded-2xl flex items-center gap-2.5 text-left transition-all active:scale-[0.98] cursor-pointer group"
                                                >
                                                    <div className="w-9 h-9 rounded-xl bg-[#00baf2] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                                        Pay
                                                    </div>
                                                    <div>
                                                        <span className="block text-xs font-bold text-slate-900">Paytm</span>
                                                        <span className="block text-[10px] text-sky-700 font-medium">1-Tap Pay</span>
                                                    </div>
                                                </button>

                                                {/* BHIM / Any UPI */}
                                                <button
                                                    onClick={() => handleLaunchUpiApp('upi')}
                                                    className="p-3.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-2xl flex items-center gap-2.5 text-left transition-all active:scale-[0.98] cursor-pointer group"
                                                >
                                                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                                        <span className="material-symbols-outlined text-[20px]">bolt</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-xs font-bold text-slate-900">Any UPI App</span>
                                                        <span className="block text-[10px] text-emerald-700 font-medium">BHIM / CRED / Other</span>
                                                    </div>
                                                </button>
                                            </div>

                                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2 text-[11px] text-slate-500">
                                                <span className="material-symbols-outlined text-[16px] text-slate-400 mt-0.5">info</span>
                                                <span>After completing the payment in your app, return here to submit the 12-digit UTR / screenshot proof.</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB 2: Dynamic QR Code */}
                                    {activeMethodTab === 'qr' && (
                                        <div className="flex flex-col items-center gap-3 text-center">
                                            <div className="p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-sm">
                                                <img
                                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(getUpiIntentUrl('upi'))}`}
                                                    alt="UPI QR Code"
                                                    width="180"
                                                    height="180"
                                                    className="w-[180px] h-[180px] aspect-square rounded-lg"
                                                />
                                            </div>
                                            <p className="text-[11px] text-slate-500 font-medium">Scan with Google Pay, PhonePe, Paytm or BHIM</p>
                                            
                                            <div className="flex items-center gap-2 w-full pt-1">
                                                <button
                                                    onClick={handleDownloadQR}
                                                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">download</span>
                                                    Save QR Image
                                                </button>
                                                <button
                                                    onClick={() => handleLaunchUpiApp('upi')}
                                                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                                    Open UPI App
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB 3: Copy UPI ID */}
                                    {activeMethodTab === 'copy' && (
                                        <div className="space-y-3">
                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Merchant UPI ID</p>
                                                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                                                    <span className="text-xs font-bold text-slate-900 select-all font-mono truncate mr-2">{owner?.upiId}</span>
                                                    <button 
                                                        onClick={() => copyToClipboard(owner?.upiId, 'upi')}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                                                            copiedField === 'upi' 
                                                                ? 'bg-emerald-600 text-white shadow-xs' 
                                                                : 'bg-[#0057BB] text-white hover:bg-[#004291]'
                                                        }`}
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">
                                                            {copiedField === 'upi' ? 'check' : 'content_copy'}
                                                        </span>
                                                        <span>{copiedField === 'upi' ? 'Copied' : 'Copy'}</span>
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-slate-500 font-medium px-1">
                                                Open your banking app, paste the UPI ID above, and pay <strong>₹{paymentAmount}</strong>.
                                            </p>
                                        </div>
                                    )}

                                    {/* TAB 4: Bank Account Details */}
                                    {activeMethodTab === 'bank' && (
                                        <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                                <span className="text-xs font-bold text-slate-700">Bank Transfer (IMPS/NEFT)</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">{owner?.bankName || 'Bank Account'}</span>
                                            </div>

                                            {owner?.accountNumber && (
                                                <div>
                                                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Account Number</span>
                                                    <div className="flex items-center justify-between mt-0.5">
                                                        <span className="text-xs font-mono font-bold text-slate-900 select-all">{owner.accountNumber}</span>
                                                        <button 
                                                            onClick={() => copyToClipboard(owner.accountNumber, 'acc')}
                                                            className="text-[11px] font-bold text-[#0057BB] hover:underline flex items-center gap-1"
                                                        >
                                                            <span className="material-symbols-outlined text-[14px]">{copiedField === 'acc' ? 'check' : 'content_copy'}</span>
                                                            {copiedField === 'acc' ? 'Copied' : 'Copy'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {owner?.ifscCode && (
                                                <div>
                                                    <span className="text-[10px] font-semibold text-slate-400 uppercase">IFSC Code</span>
                                                    <div className="flex items-center justify-between mt-0.5">
                                                        <span className="text-xs font-mono font-bold text-slate-900 select-all">{owner.ifscCode}</span>
                                                        <button 
                                                            onClick={() => copyToClipboard(owner.ifscCode, 'ifsc')}
                                                            className="text-[11px] font-bold text-[#0057BB] hover:underline flex items-center gap-1"
                                                        >
                                                            <span className="material-symbols-outlined text-[14px]">{copiedField === 'ifsc' ? 'check' : 'content_copy'}</span>
                                                            {copiedField === 'ifsc' ? 'Copied' : 'Copy'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            <div>
                                                <span className="text-[10px] font-semibold text-slate-400 uppercase">Beneficiary Name</span>
                                                <p className="text-xs font-bold text-slate-900 mt-0.5">{owner?.name || 'Account Holder'}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action to proceed to Confirmation */}
                                    <div className="pt-2">
                                        <button
                                            onClick={() => setPaymentModal(prev => ({ ...prev, step: 'confirm' }))}
                                            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                                        >
                                            <span>Already Paid? Submit Reference / Proof</span>
                                            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Confirm Payment with Proof */}
                            {paymentModal.step === 'confirm' && (
                                <div className="space-y-4">
                                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase text-slate-400">Payment Amount</span>
                                            <p className="text-lg font-bold text-slate-800">₹{paymentAmount.toLocaleString('en-IN')}</p>
                                        </div>
                                        <span className="text-xs font-semibold text-slate-500">To: {owner?.name || 'Merchant'}</span>
                                    </div>

                                    {/* UTR / Transaction ID */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                UPI Ref / UTR / Txn ID
                                            </label>
                                            <span className="text-[10px] text-slate-400">12-digit number</span>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="e.g. 423456789012 or UPI Ref"
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-[#0057BB] outline-none transition-all pr-20"
                                                value={paymentModal.transactionId}
                                                onChange={(e) => setPaymentModal(prev => ({ ...prev, transactionId: e.target.value }))}
                                            />
                                            {navigator?.clipboard?.readText && (
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        try {
                                                            const text = await navigator.clipboard.readText();
                                                            if (text) setPaymentModal(prev => ({ ...prev, transactionId: text.trim() }));
                                                        } catch (err) {
                                                            console.warn("Clipboard read error:", err);
                                                        }
                                                    }}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[10px] font-bold bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-slate-600 transition-colors"
                                                >
                                                    Paste
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Screenshot Proof */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                Payment Screenshot
                                            </label>
                                            <span className="text-[10px] text-slate-400 font-normal">Ctrl+V paste supported</span>
                                        </div>

                                        {paymentModal.screenshot ? (
                                            <div className="relative w-full h-36 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden group">
                                                <img src={paymentModal.screenshot} className="max-h-full max-w-full object-contain" alt="Payment Proof Preview" />
                                                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setPaymentModal(prev => ({ ...prev, screenshot: '' }))}
                                                        className="w-7 h-7 bg-black/70 hover:bg-black text-white rounded-full flex items-center justify-center shadow-md transition-colors"
                                                        title="Remove Image"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                onClick={() => document.getElementById('screenshot-upload').click()}
                                                className="w-full py-5 bg-slate-50 border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all"
                                            >
                                                <span className="material-symbols-outlined text-slate-400 text-[26px]">add_photo_alternate</span>
                                                <span className="text-xs font-semibold text-slate-600">Select Image or Paste from Clipboard</span>
                                                <span className="text-[10px] text-slate-400">JPG, PNG, WebP supported</span>
                                            </div>
                                        )}

                                        <input
                                            id="screenshot-upload"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleScreenshotChange}
                                        />
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            onClick={handleConfirmPayment}
                                            disabled={paymentModal.isSubmitting || (!paymentModal.transactionId?.trim() && !paymentModal.screenshot)}
                                            className="w-full bg-[#0057BB] hover:bg-[#004291] text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all disabled:opacity-35 cursor-pointer flex items-center justify-center gap-2"
                                        >
                                            {paymentModal.isSubmitting ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    <span>Submitting Proof...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-[18px]">verified</span>
                                                    <span>Submit Payment Proof</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Success Confirmation */}
                            {paymentModal.step === 'success' && (
                                <div className="text-center py-4 space-y-4">
                                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                                        <span className="material-symbols-outlined text-[36px]">check_circle</span>
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-bold text-slate-900">Payment Submitted!</h3>
                                        <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                                            The merchant has received your payment details. Once verified, your ledger balance will be updated automatically.
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-left text-xs space-y-1.5 font-medium">
                                        <div className="flex justify-between text-slate-600">
                                            <span>Amount Paid:</span>
                                            <strong className="text-slate-900 font-bold">₹{paymentAmount.toLocaleString('en-IN')}</strong>
                                        </div>
                                        {paymentModal.transactionId && (
                                            <div className="flex justify-between text-slate-600">
                                                <span>Ref / UTR:</span>
                                                <strong className="text-slate-900 font-mono">{paymentModal.transactionId}</strong>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-slate-600">
                                            <span>Status:</span>
                                            <span className="text-amber-600 font-bold">Pending Merchant Approval</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={closePaymentModal}
                                        className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                                    >
                                        Done &amp; Return to Statement
                                    </button>
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
            <header className="hidden md:flex no-print sticky top-0 z-50 bg-white border-b border-slate-200 px-8 h-16 items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#0057BB] rounded-xl flex items-center justify-center shadow-md text-white shrink-0">
                            <span className="material-symbols-outlined text-[22px]">account_balance_wallet</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-extrabold text-slate-900 text-base leading-tight tracking-tight">Hisab Khata</span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#0057BB] border border-blue-200">
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

                {/* Identity & Statement Card (Desktop Only) */}
                <div className="hidden md:block bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden print-rounded">
                    {/* Statement Meta Header */}
                    <div className="bg-slate-50/75 border-b border-slate-200/80 px-8 py-3 flex items-center justify-between text-xs text-slate-500 font-medium">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-400 text-[16px]">verified</span>
                            <span className="font-semibold text-slate-700 tracking-wide uppercase text-[10px]">Verified Digital Statement</span>
                            <span className="text-slate-300">•</span>
                            <span>Ref: <strong className="font-mono text-slate-700">HK-{(id || '').substring(0, 8).toUpperCase()}</strong></span>
                        </div>
                        <div>
                            <span>Generated: <strong className="text-slate-700">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></span>
                        </div>
                    </div>

                    {/* Main Statement Details */}
                    <div className="p-8">
                        <div className="grid grid-cols-12 gap-8 items-center">
                            {/* Left Column: Account Holder */}
                            <div className="col-span-7 flex items-start gap-5">
                                <div className="h-16 w-16 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center font-bold text-slate-700 text-2xl uppercase overflow-hidden shrink-0 shadow-xs">
                                    {customer.photoURL ? (
                                        <img src={customer.photoURL} alt={customer.name} className="w-full h-full object-cover" />
                                    ) : (
                                        initials
                                    )}
                                </div>
                                <div className="space-y-1.5 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer Statement</span>
                                        <span className="text-slate-300">•</span>
                                        <span className="text-[11px] font-semibold text-slate-500">{transactions.length} Transactions</span>
                                    </div>
                                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight truncate">{customer.name}</h1>
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                                        {customer.phone && (
                                            <span className="inline-flex items-center gap-1 font-medium">
                                                <span className="material-symbols-outlined text-[15px] text-slate-400">call</span>
                                                +91 {customer.phone}
                                            </span>
                                        )}
                                        {customer.address && (
                                            <span className="inline-flex items-center gap-1 font-medium truncate max-w-xs text-slate-500">
                                                <span className="material-symbols-outlined text-[15px] text-slate-400">location_on</span>
                                                {customer.address}
                                            </span>
                                        )}
                                    </div>
                                    {owner && (
                                        <p className="text-[11px] text-slate-400 font-medium pt-0.5">
                                            Issued by <span className="font-semibold text-slate-700">{owner.name || 'Merchant'}</span>{owner.phone ? ` • ${owner.phone}` : ''}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Right Column: Net Balance Widget (Clean Fintech Aesthetic) */}
                            <div className="col-span-5 border-l border-slate-100 pl-8 text-right flex flex-col justify-center items-end">
                                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                    {isReceivable ? 'Total Amount Due' : 'Account Balance'}
                                </p>
                                <div className="flex items-baseline justify-end gap-2.5">
                                    <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight font-sans">
                                        ₹{balanceAbsolute}
                                    </h2>
                                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                        isReceivable 
                                            ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    }`}>
                                        {isReceivable ? 'Due (Dr)' : 'Clear / Cr'}
                                    </span>
                                </div>

                                {customer.dueDate && isReceivable && (() => {
                                    const status = getDueDateStatus(customer.dueDate);
                                    if (!status) return null;
                                    return (
                                        <div className="mt-2.5 flex items-center justify-end gap-1.5 text-xs">
                                            <span className="material-symbols-outlined text-[15px] text-amber-600">event</span>
                                            <span className="text-slate-500 font-medium">Payment Due:</span>
                                            <span className="font-bold text-slate-800">{status.formatted}</span>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                                status.isOverdue 
                                                    ? 'bg-red-50 text-red-700 border-red-200' 
                                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                            }`}>
                                                {status.isOverdue ? status.label : `${status.daysDiff}d left`}
                                            </span>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Desktop 3-Metric Summary Strip (Clean & Understated) */}
                <div className="hidden md:grid grid-cols-3 bg-white rounded-2xl border border-slate-200/80 divide-x divide-slate-100 shadow-xs no-print">
                    <div className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Total Purchases</p>
                            <p className="text-xl font-bold text-slate-900">₹{totalGave}</p>
                            <p className="text-[11px] text-rose-600 font-medium mt-0.5">Debit (Gave)</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
                            <span className="material-symbols-outlined text-[20px]">arrow_downward</span>
                        </div>
                    </div>

                    <div className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Total Payments</p>
                            <p className="text-xl font-bold text-slate-900">₹{totalGot}</p>
                            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Credit (Got)</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
                            <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
                        </div>
                    </div>

                    <div className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Closing Balance</p>
                            <p className="text-xl font-bold text-slate-900">₹{balanceAbsolute}</p>
                            <p className={`text-[11px] font-medium mt-0.5 ${isReceivable ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {isReceivable ? 'Pending to Merchant' : 'Account Settled'}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
                            <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
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
                                    <th className="px-2 md:px-6 py-2.5 md:py-3.5 text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-wider w-[36%] md:w-[40%]">Date & Details</th>
                                    <th className="px-1 md:px-6 py-2.5 md:py-3.5 text-[10px] md:text-xs font-bold text-rose-600 uppercase tracking-wider text-center md:text-right w-[21%] md:w-[20%]">Debit (-)</th>
                                    <th className="px-1 md:px-6 py-2.5 md:py-3.5 text-[10px] md:text-xs font-bold text-emerald-600 uppercase tracking-wider text-center md:text-right w-[21%] md:w-[20%]">Credit (+)</th>
                                    <th className="px-2 md:px-6 py-2.5 md:py-3.5 text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-wider text-right w-[22%] md:w-[20%]">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 md:divide-slate-200/70">
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-16 md:py-20 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <span className="material-symbols-outlined text-slate-300 text-[36px] md:text-[40px]">description</span>
                                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px] md:text-xs">No transactions recorded yet</p>
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
                                            {/* Date & Details Column */}
                                            <td className="px-2 md:px-6 py-2.5 md:py-4 align-top">
                                                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                                    <span className="text-[11px] md:text-sm font-bold text-slate-800 leading-tight whitespace-nowrap">
                                                        {date ? (
                                                            <>
                                                                <span className="md:hidden">{date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                                                                <span className="hidden md:inline">{date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                            </>
                                                        ) : '—'}
                                                    </span>
                                                    {index === 0 && (
                                                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[8px] md:text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80 leading-none">
                                                            Latest
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[9px] md:text-xs text-slate-500 font-normal line-clamp-2 md:line-clamp-none break-words leading-tight">
                                                    {tx.description || 'General Entry'}
                                                </p>
                                                {(() => {
                                                    const atts = Array.isArray(tx.attachments) && tx.attachments.length > 0 ? tx.attachments : (tx.attachment ? [tx.attachment] : []);
                                                    if (atts.length === 0) return null;
                                                    return (
                                                        <div className="mt-1 no-print">
                                                            <button
                                                                onClick={() => handleOpenView(atts, 0)}
                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 text-[10px] font-semibold transition-colors cursor-pointer border border-blue-100"
                                                                title={`${atts.length} attachment(s)`}
                                                            >
                                                                <span className="material-symbols-outlined text-[14px] md:text-[15px]">attach_file</span>
                                                                <span className="hidden md:inline text-xs">{atts.length} {atts.length === 1 ? 'Bill attached' : 'Bills attached'}</span>
                                                                {atts.length > 1 && <span className="md:hidden text-[9px] font-bold">{atts.length}</span>}
                                                            </button>
                                                        </div>
                                                    );
                                                })()}
                                            </td>

                                            {/* Debit Column */}
                                            <td className={`px-1 md:px-6 py-2.5 md:py-4 text-center md:text-right align-top ${isGave ? 'bg-rose-50/20 md:bg-transparent' : ''}`}>
                                                {isGave ? (
                                                    <span className="text-[11px] md:text-sm font-extrabold text-rose-600 whitespace-nowrap">
                                                        ₹{absAmount}
                                                    </span>
                                                ) : (
                                                    <span className="hidden md:inline text-slate-300 text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Credit Column */}
                                            <td className={`px-1 md:px-6 py-2.5 md:py-4 text-center md:text-right align-top ${!isGave ? 'bg-emerald-50/20 md:bg-transparent' : ''}`}>
                                                {!isGave ? (
                                                    <span className="text-[11px] md:text-sm font-extrabold text-emerald-600 whitespace-nowrap">
                                                        ₹{absAmount}
                                                    </span>
                                                ) : (
                                                    <span className="hidden md:inline text-slate-300 text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Balance Column */}
                                            <td className="px-2 md:px-6 py-2.5 md:py-4 text-right align-top">
                                                <div className="flex flex-col md:flex-row items-end justify-end md:gap-1 font-bold">
                                                    <span className={`text-[11px] md:text-sm whitespace-nowrap ${isBalanceDebit ? 'text-rose-600' : 'text-emerald-700'}`}>
                                                        ₹{Math.abs(tx.runningBalance || 0).toLocaleString('en-IN')}
                                                    </span>
                                                    <span className={`text-[8px] md:text-[9px] font-bold ${
                                                        isBalanceDebit ? 'text-rose-500' : 'text-emerald-600'
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
