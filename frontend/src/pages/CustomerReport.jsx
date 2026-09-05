import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dbService } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import EntryDetailsDrawer from '../components/EntryDetailsDrawer';
// PDF libraries will be imported dynamically

const CustomerReport = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser, userData } = useAuth();
    const [customer, setCustomer] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [isEntryDetailsOpen, setIsEntryDetailsOpen] = useState(false);

    const handleEntryClick = (tx) => {
        setSelectedTransaction(tx);
        setIsEntryDetailsOpen(true);
    };

    // Default date range: 30 days ago to today
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
    const [isStartDateChanged, setIsStartDateChanged] = useState(false);
    const [isEndDateChanged, setIsEndDateChanged] = useState(false);
    const [showDurationModal, setShowDurationModal] = useState(false);
    const [selectedDuration, setSelectedDuration] = useState('Date Range');

    const durationOptions = [
        { label: 'All', value: 'All' },
        { label: 'Single Day', value: 'Single Day' },
        { label: 'Last Week', value: 'Last Week' },
        { label: 'Last Month', value: 'Last Month' },
        { label: 'Date Range', value: 'Date Range' }
    ];

    const handleDurationSelect = (duration) => {
        setSelectedDuration(duration);
        const now = new Date();
        let start = new Date();

        switch (duration) {
            case 'All':
                start = new Date(0); // Very early date
                break;
            case 'Single Day':
                start = now;
                break;
            case 'Last Week':
                start.setDate(now.getDate() - 7);
                break;
            case 'Last Month':
                start.setDate(now.getDate() - 30);
                break;
            case 'Date Range':
                // Don't change dates, just allow custom selection
                setShowDurationModal(false);
                return;
        }

        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(now.toISOString().split('T')[0]);
        setIsStartDateChanged(true);
        setIsEndDateChanged(true);
        setShowDurationModal(false);
    };

    useEffect(() => {
        if (!currentUser || !id) return;

        const unsubCustomer = dbService.listenCustomer(id, (data) => {
            setCustomer(data);
        });

        const unsubTx = dbService.listenCustomerTransactions(id, (data) => {
            setTransactions(data);
            setLoading(false);
        });

        return () => {
            if (typeof unsubCustomer === 'function') unsubCustomer();
            if (typeof unsubTx === 'function') unsubTx();
        };
    }, [currentUser, id]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const txDate = new Date(tx.timestamp || tx.date);
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            const matchesDate = txDate >= start && txDate <= end;
            const matchesSearch = (tx.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                tx.amount.toString().includes(searchQuery);
            const matchesType = filterType === 'ALL' ||
                (filterType === 'GAVE' && (tx.type === 'GAVE' || tx.amount < 0)) ||
                (filterType === 'GOT' && (tx.type === 'GOT' || tx.amount > 0));

            return matchesDate && matchesSearch && matchesType;
        }).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }, [transactions, startDate, endDate, searchQuery, filterType]);

    const stats = useMemo(() => {
        const start = new Date(startDate);
        // Calculate Opening Balance (all transactions before startDate)
        const openingBalance = transactions
            .filter(tx => new Date(tx.timestamp || 0) < start)
            .reduce((acc, tx) => acc + (tx.amount || 0), 0);

        const gave = filteredTransactions.filter(tx => tx.amount < 0 || tx.type === 'GAVE').reduce((acc, tx) => acc + Math.abs(tx.amount), 0);
        const got = filteredTransactions.filter(tx => tx.amount > 0 || tx.type === 'GOT').reduce((acc, tx) => acc + tx.amount, 0);

        // Net Balance = Opening + Total Got - Total Gave
        const net = openingBalance + got - gave;

        return {
            gave,
            got,
            total: filteredTransactions.length,
            openingBalance,
            net
        };
    }, [filteredTransactions, transactions, startDate]);

    const formatDate = (ts) => {
        const d = new Date(ts);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(',', '');
    };

    const sanitizeText = (text) => {
        if (!text) return '-';
        // Remove emojis and specific non-standard symbols that break default fonts
        // but keep normal punctuation and spacing
        return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
            .replace(/[^\x00-\x7F]/g, ' ') // Replace other non-ASCII with space instead of deleting
            .trim();
    };

    const handleDownloadPDF = async () => {
        const { jsPDF } = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // --- TOP BAR ---
        doc.setFillColor(0, 50, 120); // Darker blue like the pic
        doc.rect(0, 0, pageWidth, 15, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Hisab Khata", 15, 10);

        // "PRO" in orange
        const titleWidth = doc.getTextWidth("Hisab ");
        doc.setTextColor(255, 165, 0); // Orange
        doc.setFont("helvetica", "bolditalic");
        doc.text("Khata", 15 + titleWidth, 10);

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text(`Merchant: ${userData?.displayName || userData?.name || 'User'}`, pageWidth - 70, 10);

        // --- HEADER INFO ---
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.text(`${customer?.name || 'Customer'} Statement`, pageWidth / 2, 30, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Phone Number: ${customer?.phone || 'N/A'}`, pageWidth / 2, 37, { align: 'center' });
        doc.text(`(${new Date(startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })} - ${new Date(endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })})`, pageWidth / 2, 44, { align: 'center' });

        // --- SUMMARY BOX ---
        const summaryY = 52;
        doc.setDrawColor(220, 220, 220);
        doc.setFillColor(252, 252, 252);
        doc.roundedRect(10, summaryY, pageWidth - 20, 25, 2, 2, 'FD');

        // Dividers
        doc.line(pageWidth * 0.25 + 5, summaryY + 5, pageWidth * 0.25 + 5, summaryY + 20);
        doc.line(pageWidth * 0.5, summaryY + 5, pageWidth * 0.5, summaryY + 20);
        doc.line(pageWidth * 0.75 - 5, summaryY + 5, pageWidth * 0.75 - 5, summaryY + 20);

        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text("Opening Balance", 15, summaryY + 7);
        doc.text("Total Debit(-)", pageWidth * 0.25 + 10, summaryY + 7);
        doc.text("Total Credit(+)", pageWidth * 0.5 + 5, summaryY + 7);
        doc.text("Net Balance", pageWidth * 0.75, summaryY + 7);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Rs. ${Math.abs(stats.openingBalance).toLocaleString('en-IN')}.00 ${stats.openingBalance < 0 ? 'Dr' : 'Cr'}`, 15, summaryY + 15);
        doc.text(`Rs. ${stats.gave.toLocaleString('en-IN')}.00`, pageWidth * 0.25 + 10, summaryY + 15);
        doc.text(`Rs. ${stats.got.toLocaleString('en-IN')}.00`, pageWidth * 0.5 + 5, summaryY + 15);

        // Net Balance Styling
        const netVal = stats.net;
        const isDr = netVal < 0;
        if (isDr) {
            doc.setTextColor(185, 28, 28); // Deeper red for Dr
        } else {
            doc.setTextColor(22, 163, 74); // Green for Cr
        }
        doc.text(`Rs. ${Math.abs(netVal).toLocaleString('en-IN')}.00 ${isDr ? 'Dr' : 'Cr'}`, pageWidth * 0.75, summaryY + 15);

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(150, 150, 150);
        doc.text(`(on ${new Date(startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })})`, 15, summaryY + 21);
        doc.text(`(${customer?.name || 'Customer'} will ${isDr ? 'give' : 'get'})`, pageWidth * 0.75, summaryY + 21);

        // --- ENTRIES INFO ---
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`No. of Entries: ${stats.total} (All)`, 10, summaryY + 35);

        // --- TABLE ---
        const tableData = filteredTransactions.map(tx => {
            const isGave = tx.amount < 0 || tx.type === 'GAVE';
            const absAmt = Math.abs(tx.amount);
            const balance = Math.abs(tx.balance || 0);
            const balSuffix = (tx.balance || 0) < 0 ? 'Dr' : 'Cr';

            return [
                formatDate(tx.timestamp),
                sanitizeText(tx.description),
                isGave ? `${absAmt.toFixed(2)}` : '',
                !isGave ? `${absAmt.toFixed(2)}` : '',
                `${balance.toFixed(2)} ${balSuffix}`
            ];
        });

        autoTable(doc, {
            startY: summaryY + 38,
            head: [['Date', 'Details', 'Debit(-)', 'Credit(+)', 'Balance']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [240, 240, 240],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                lineWidth: 0.1,
                lineColor: [200, 200, 200]
            },
            styles: {
                fontSize: 9,
                cellPadding: 3,
                valign: 'middle'
            },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 25, halign: 'right', fillColor: [255, 249, 249] }, // Light red background for debit
                3: { cellWidth: 25, halign: 'right', fillColor: [249, 255, 249] }, // Light green background for credit
                4: { cellWidth: 35, halign: 'right' }
            },
            didDrawCell: (data) => {
                // Style Balance column colors
                if (data.section === 'body' && data.column.index === 4) {
                    const val = data.cell.raw;
                    if (val && typeof val === 'string' && val.includes('Dr')) {
                        doc.setTextColor(239, 68, 68); // Red for Dr
                    } else if (val && typeof val === 'string' && val.includes('Cr')) {
                        doc.setTextColor(22, 163, 74); // Green for Cr
                    }
                }
            }
        });

        // --- FOOTER BAR ---
        const footerY = pageHeight - 15;
        doc.setFillColor(0, 50, 120);
        doc.rect(0, footerY, pageWidth, 15, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text("Start Using HisabKhata.", 10, footerY + 8);

        // Help and T&C
        doc.setTextColor(255, 255, 255);
        doc.text(`Need Help: +91-8918153949`, pageWidth - 60, footerY + 6);

        const tcText = "T&C Apply";
        const tcWidth = doc.getTextWidth(tcText);
        doc.text(tcText, pageWidth - tcWidth - 10, footerY + 12);
        doc.link(pageWidth - tcWidth - 10, footerY + 9, tcWidth, 4, { url: 'https://hisabkhata.sumanonline.com/terms-of-condition' });

        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - 25, footerY - 5);

        doc.save(`${customer?.name || 'Customer'}_Statement.pdf`);
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0057BB]"></div>
        </div>
    );

    return (
        <div className="h-screen bg-[#F8FAFC] flex flex-col max-w-md mx-auto shadow-2xl relative overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Header & Controls (Blue Background) - STICKY */}
            <div className="bg-[#0057BB] px-4 pt-4 pb-5 flex flex-col gap-4 text-white sticky top-0 z-50 shadow-md">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/customers', { state: { selectedCustomerId: id } })}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors -ml-1"
                    >
                        <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                    </button>
                    <h1 className="text-[18px] font-medium tracking-wide">Report of {customer?.name}</h1>
                </div>

                {/* Date Selection Box */}
                <div className="flex bg-white rounded shadow-sm h-[48px] text-slate-800">
                    <div
                        onClick={(e) => {
                            try { e.currentTarget.querySelector('input').showPicker(); } catch (err) { }
                        }}
                        className="flex-1 flex items-center justify-center gap-2 border-r border-slate-100 relative cursor-pointer hover:bg-slate-50 transition-colors rounded-l"
                    >
                        <span className="material-symbols-outlined text-slate-500 text-[18px]">calendar_today</span>
                        <span className="text-[14px] font-bold text-[#0057BB] uppercase">
                            {isStartDateChanged ? new Date(startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, ' ') : 'START DATE'}
                        </span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                setIsStartDateChanged(true);
                            }}
                            className="absolute inset-0 opacity-0 pointer-events-none"
                        />
                    </div>
                    <div
                        onClick={(e) => {
                            try { e.currentTarget.querySelector('input').showPicker(); } catch (err) { }
                        }}
                        className="flex-1 flex items-center justify-center gap-2 relative cursor-pointer hover:bg-slate-50 transition-colors rounded-r"
                    >
                        <span className="material-symbols-outlined text-slate-500 text-[18px]">calendar_today</span>
                        <span className="text-[14px] font-bold text-[#0057BB] uppercase">
                            {isEndDateChanged ? new Date(endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, ' ') : 'END DATE'}
                        </span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value);
                                setIsEndDateChanged(true);
                            }}
                            className="absolute inset-0 opacity-0 pointer-events-none"
                        />
                    </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="flex bg-white rounded shadow-sm h-[48px] text-slate-800 items-center px-2 gap-2">
                    <span className="material-symbols-outlined text-[#0057BB] text-[24px]">search</span>
                    <div className="flex-1 h-[34px] border border-slate-300 rounded flex items-center px-2">
                        <input
                            type="text"
                            placeholder="Search Entries"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full text-[13px] !outline-none !ring-0 font-medium placeholder:text-slate-400 bg-transparent border-none focus:border-none"
                            style={{ outline: 'none', boxShadow: 'none' }}
                        />
                    </div>
                    <div
                        onClick={() => setShowDurationModal(true)}
                        className="w-[140px] h-full bg-[#EAF2FC] flex items-center justify-between px-3 relative border-l border-slate-100 -mr-2 cursor-pointer"
                    >
                        <span className="text-[12px] font-bold text-[#0057BB] uppercase">{selectedDuration}</span>
                        <span className="material-symbols-outlined text-[#0057BB] text-[18px]">expand_more</span>
                    </div>
                </div>
            </div>

            <div className="px-0 py-0 space-y-0 flex-1 overflow-y-auto custom-scrollbar pb-24">

                {/* Net Balance Section */}
                <div className="py-4 px-4 flex items-center justify-between bg-white border-b border-slate-100">
                    <span className="text-[18px] font-semibold text-slate-900">Net Balance</span>
                    <span className={`text-[18px] font-medium ${stats.net >= 0 ? 'text-green-600' : 'text-[#ef4444]'}`}>
                        ₹ {Math.abs(stats.net).toLocaleString('en-IN')}
                    </span>
                </div>

                {/* Summary Table Header */}
                <div className="grid grid-cols-12 bg-white border-y border-slate-100 py-3">
                    <div className="col-span-5 px-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TOTAL</p>
                        <p className="text-[14px] font-bold text-slate-900">{stats.total} Entries</p>
                    </div>
                    <div className="col-span-4 text-right pr-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">YOU GAVE</p>
                        <p className="text-[14px] font-bold text-red-500">₹ {stats.gave.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="col-span-3 text-right pr-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">YOU GOT</p>
                        <p className="text-[14px] font-bold text-green-600">₹ {stats.got.toLocaleString('en-IN')}</p>
                    </div>
                </div>

                {/* Transaction List */}
                <div className="divide-y divide-slate-100">
                    {filteredTransactions.map((tx, idx) => {
                        const isGave = tx.amount < 0 || tx.type === 'GAVE';
                        const absAmt = Math.abs(tx.amount);

                        return (
                            <div
                                key={tx.id || idx}
                                onClick={() => handleEntryClick(tx)}
                                className="grid grid-cols-12 bg-white items-start py-3 border-b border-slate-50 min-h-[80px] cursor-pointer hover:bg-slate-50 transition-colors"
                            >
                                <div className="col-span-5 px-4 flex flex-col gap-1">
                                    <p className="text-[13px] font-bold text-slate-800">{formatDate(tx.timestamp)}</p>
                                    <div className="flex">
                                        <div className="bg-[#fef2f2] px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-400">
                                            Bal. ₹ {Math.abs(tx.balance || 0).toLocaleString('en-IN')}
                                        </div>
                                    </div>
                                    <p className="text-[12px] text-slate-500 leading-snug mt-0.5 line-clamp-3">{tx.description || '-'}</p>
                                </div>
                                <div className={`col-span-4 flex items-center justify-center h-full ${isGave ? 'bg-[#fff9f9]' : ''}`}>
                                    {isGave && (
                                        <p className="text-[14px] font-bold text-red-500">
                                            ₹ {absAmt.toLocaleString('en-IN')}
                                        </p>
                                    )}
                                </div>
                                <div className={`col-span-3 flex items-center justify-center h-full ${!isGave ? 'bg-[#f9fff9]' : ''}`}>
                                    {!isGave && (
                                        <p className="text-[14px] font-bold text-green-600">
                                            ₹ {absAmt.toLocaleString('en-IN')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-200 p-3 flex gap-3 z-[60]">
                <button
                    onClick={handleDownloadPDF}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 border-2 border-[#0057BB] text-[#0057BB] rounded-xl text-sm font-black uppercase tracking-widest hover:bg-blue-50 transition-all"
                >
                    <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
                    DOWNLOAD
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#0057BB] text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-blue-100 active:scale-[0.98] transition-all">
                    <span className="material-symbols-outlined text-[20px]">share</span>
                    SHARE
                </button>
            </div>
            {/* Duration Modal */}
            {showDurationModal && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50">
                    <div className="w-full max-w-md bg-white rounded-t-2xl p-6 animate-slide-up">
                        <h3 className="text-[18px] font-bold text-slate-900 mb-6">Select report duration</h3>
                        <div className="space-y-6">
                            {durationOptions.map((opt) => (
                                <div
                                    key={opt.value}
                                    onClick={() => handleDurationSelect(opt.value)}
                                    className="flex items-center justify-between cursor-pointer group"
                                >
                                    <span className={`text-[16px] font-medium ${selectedDuration === opt.value ? 'text-[#0057BB]' : 'text-slate-600'}`}>
                                        {opt.label}
                                    </span>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedDuration === opt.value ? 'border-[#0057BB]' : 'border-slate-300'}`}>
                                        {selectedDuration === opt.value && (
                                            <div className="w-2.5 h-2.5 rounded-full bg-[#0057BB]"></div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {/* Entry Details Drawer */}
            <EntryDetailsDrawer
                isOpen={isEntryDetailsOpen}
                onClose={() => setIsEntryDetailsOpen(false)}
                transaction={selectedTransaction}
                customer={customer}
                onEdit={() => { }} // Disable edit from report view or handle it if needed
            />
        </div>
    );
};

export default CustomerReport;
