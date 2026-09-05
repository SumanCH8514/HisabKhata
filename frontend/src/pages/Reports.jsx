import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import { dbService } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
// Heavy libraries (jsPDF, autoTable, XLSX) will be imported dynamically

const Reports = () => {
    const { currentUser, userData, globalSettings } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [period, setPeriod] = useState('This Month');
    
    // Default date range: 1st of current month to today
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

    useEffect(() => {
        if (!currentUser) return;

        const unsubCustomers = dbService.listenUserCustomers(currentUser.uid, (data) => {
            setCustomers(data);
        });

        const unsubTx = dbService.listenAllUserTransactions(currentUser.uid, (data) => {
            setTransactions(data);
            setLoading(false);
        });

        return () => {
            if (typeof unsubCustomers === 'function') unsubCustomers();
            if (typeof unsubTx === 'function') unsubTx();
        };
    }, [currentUser]);

    const handlePeriodChange = (val) => {
        setPeriod(val);
        const now = new Date();
        let start = new Date();
        let end = new Date();

        if (val === 'All') {
            start = new Date(0); // Beginning of time
            end = now;
        } else if (val === 'This Month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = now;
        } else if (val === 'Last Month') {
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0);
        } else if (val === 'Last 7 Days') {
            start = new Date();
            start.setDate(now.getDate() - 7);
            end = now;
        }
        
        if (val !== 'Custom Range') {
            setStartDate(start.toISOString().split('T')[0]);
            setEndDate(end.toISOString().split('T')[0]);
        }
    };

    const getCustomerName = (id) => {
        const customer = customers.find(c => c.id === id);
        return customer ? customer.name : 'Unknown';
    };

    const filteredTx = transactions.filter(tx => {
        const txDate = new Date(tx.timestamp || tx.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        const matchesDate = txDate >= start && txDate <= end;
        const matchesSearch = getCustomerName(tx.customerId).toLowerCase().includes(searchQuery.toLowerCase()) || 
                             (tx.description || '').toLowerCase().includes(searchQuery.toLowerCase());
        
        return matchesDate && matchesSearch;
    }).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const totalGive = filteredTx.filter(tx => tx.amount < 0 || tx.type === 'GAVE').reduce((acc, tx) => acc + Math.abs(tx.amount), 0);
    const totalGot = filteredTx.filter(tx => tx.amount > 0 || tx.type === 'GOT').reduce((acc, tx) => acc + tx.amount, 0);
    const netBalance = totalGot - totalGive;

    const formatDate = (ts) => {
        if (!ts) return '-';
        const d = new Date(ts);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const sanitizeText = (text) => {
        if (!text) return '-';
        return text.replace(/[^\x00-\x7F]/g, ' ')
                   .replace(/\s+/g, ' ')
                   .trim();
    };

    const handleDownloadPDF = async () => {
        const { jsPDF } = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // --- HEADER & BRANDING ---
        doc.setFillColor(0, 87, 187); // Primary Blue
        doc.rect(0, 0, pageWidth, 45, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("Hisab ", 15, 18);
        const hisabWidth = doc.getTextWidth("Hisab ");
        doc.setTextColor(255, 165, 0); // Orange
        doc.text("Khata", 15 + hisabWidth, 18);

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("TRANSACTION REPORT", 15, 28);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const dateRangeText = `Statement for: ${new Date(startDate).toLocaleDateString('en-GB')} to ${new Date(endDate).toLocaleDateString('en-GB')}`;
        doc.text(dateRangeText, 15, 34);

        // Merchant Name (top right)
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        const merchantName = (userData?.businessName || currentUser?.displayName || 'Merchant').toUpperCase();
        const mWidth = doc.getTextWidth(merchantName);
        doc.text(merchantName, pageWidth - mWidth - 15, 18);
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        const mPhone = userData?.phone || "";
        const pWidth = doc.getTextWidth(mPhone);
        if(mPhone) doc.text(mPhone, pageWidth - pWidth - 15, 24);

        // --- SUMMARY BOX ---
        const summaryY = 52;
        doc.setDrawColor(220, 220, 220);
        doc.setFillColor(252, 252, 252);
        doc.roundedRect(10, summaryY, pageWidth - 20, 25, 2, 2, 'FD');

        // Dividers
        doc.line(pageWidth * 0.33, summaryY + 5, pageWidth * 0.33, summaryY + 20);
        doc.line(pageWidth * 0.66, summaryY + 5, pageWidth * 0.66, summaryY + 20);

        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text("Total Debit(-)", 15, summaryY + 7);
        doc.text("Total Credit(+)", pageWidth * 0.33 + 5, summaryY + 7);
        doc.text("Net Balance", pageWidth * 0.66 + 5, summaryY + 7);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Rs. ${totalGive.toLocaleString('en-IN')}.00`, 15, summaryY + 15);
        doc.text(`Rs. ${totalGot.toLocaleString('en-IN')}.00`, pageWidth * 0.33 + 5, summaryY + 15);
        
        // Net Balance Styling
        const isDr = netBalance < 0;
        if (isDr) {
            doc.setTextColor(185, 28, 28); // Deeper red for Dr
        } else {
            doc.setTextColor(22, 163, 74); // Green for Cr
        }
        doc.text(`Rs. ${Math.abs(netBalance).toLocaleString('en-IN')}.00 ${isDr ? 'Dr' : 'Cr'}`, pageWidth * 0.66 + 5, summaryY + 15);
        
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(150, 150, 150);
        doc.text(`(Total Entries: ${filteredTx.length})`, 15, summaryY + 21);
        doc.text(`(Net ${isDr ? 'Debit' : 'Credit'})`, pageWidth * 0.66 + 5, summaryY + 21);

        // --- TABLE ---
        const tableData = filteredTx.map(tx => {
            const isGave = tx.amount < 0 || tx.type === 'GAVE';
            const amount = Math.abs(tx.amount);
            return [
                formatDate(tx.timestamp || tx.date),
                sanitizeText(getCustomerName(tx.customerId)),
                sanitizeText(tx.description),
                isGave ? `Rs. ${amount}.00` : '-',
                !isGave ? `Rs. ${amount}.00` : '-'
            ];
        });

        autoTable(doc, {
            startY: 85,
            head: [['DATE', 'CUSTOMER NAME', 'DETAILS', 'DEBIT (-)', 'CREDIT (+)']],
            body: tableData,
            theme: 'striped',
            headStyles: { 
                fillColor: [240, 240, 240], 
                textColor: [80, 80, 80], 
                fontSize: 8, 
                fontStyle: 'bold',
                halign: 'center'
            },
            bodyStyles: { fontSize: 8, textColor: [50, 50, 50], cellPadding: 4 },
            columnStyles: {
                0: { cellWidth: 25, halign: 'center' },
                1: { cellWidth: 40 },
                2: { cellWidth: 'auto' },
                3: { cellWidth: 25, halign: 'right', fillColor: [255, 249, 249] },
                4: { cellWidth: 25, halign: 'right', fillColor: [249, 255, 249] }
            }
        });

        // --- FOOTER ---
        const footerY = pageHeight - 15;
        doc.setFillColor(0, 50, 120);
        doc.rect(0, footerY, pageWidth, 15, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text("Start Using HisabKhata.", 10, footerY + 8);

        // Help and T&C
        doc.text(`Need Help: +91-8918153949`, pageWidth - 65, footerY + 6);
        const tcText = "T&C Apply";
        const tcWidth = doc.getTextWidth(tcText);
        doc.text(tcText, pageWidth - tcWidth - 10, footerY + 12);
        doc.link(pageWidth - tcWidth - 10, footerY + 9, tcWidth, 4, { url: 'https://hisabkhata.sumanonline.com/terms-of-condition' });

        doc.save(`HisabKhata_Report_${startDate}_to_${endDate}.pdf`);
    };

    const handleDownloadExcel = async () => {
        const XLSX = await import('xlsx');
        const data = filteredTx.map(tx => ({
            Date: formatDate(tx.timestamp || tx.date),
            Customer: getCustomerName(tx.customerId),
            Details: tx.description || '-',
            'You Gave': tx.amount < 0 || tx.type === 'GAVE' ? Math.abs(tx.amount) : 0,
            'You Got': tx.amount > 0 || tx.type === 'GOT' ? tx.amount : 0
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Transactions");
        XLSX.writeFile(wb, `HisabKhata_Report_${startDate}_to_${endDate}.xlsx`);
    };

    return (
        <div className="flex h-screen overflow-hidden bg-[#f5f5f5]" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
            <Sidebar />

            <div className="flex flex-1 ml-0 md:ml-[260px] overflow-hidden">
                {/* Sub-sidebar (Reports List) — Hidden on mobile */}
                <div className="hidden md:flex w-[280px] bg-white border-r border-gray-200 flex-col flex-shrink-0">
                    <div className="px-6 py-5">
                        <h1 className="text-xl font-bold text-gray-800">Reports</h1>
                    </div>
                    
                    <div className="px-2">
                        <p className="px-4 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest">PARTIES REPORTS</p>
                        
                        <div className="mt-1">
                            <button className="w-[calc(100%-16px)] mx-2 flex items-center gap-4 px-4 py-4 bg-blue-50 text-blue-600 rounded-lg transition-colors border-l-4 border-blue-600">
                                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                                    <span className="material-symbols-outlined text-[20px]">swap_horiz</span>
                                </div>
                                <div className="text-left overflow-hidden">
                                    <p className="text-sm font-bold leading-tight truncate">Transaction Report</p>
                                    <p className="text-[11px] text-blue-400 mt-0.5 truncate">All customers, All Transactions</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content Pane */}
                <div className="flex-1 flex flex-col min-w-0 bg-white">
                    {/* Mobile Header — Branding */}
                    <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-[#0057BB] rounded flex items-center justify-center">
                                <span className="material-symbols-outlined text-white text-[20px]">bar_chart</span>
                            </div>
                            <h1 className="text-[#0057BB] font-black text-[19px] tracking-tight">Reports</h1>
                        </div>
                        <div className="flex items-center gap-4 text-gray-500">
                            <span className="material-symbols-outlined text-[24px]">search</span>
                            <span className="material-symbols-outlined text-[24px]">more_vert</span>
                        </div>
                    </div>

                    {/* Page Header — Desktop styled */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between px-4 md:px-8 py-4 border-b border-gray-200 gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-sm">
                                <span className="material-symbols-outlined text-[22px]">swap_horiz</span>
                            </div>
                            <h2 className="text-lg font-bold text-gray-800">Transactions Reports</h2>
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={handleDownloadPDF}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-[11px] font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                                Download PDF
                            </button>
                            <button 
                                onClick={handleDownloadExcel}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-[11px] font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                <span className="material-symbols-outlined text-[18px]">table_view</span>
                                Download Excel
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="px-4 md:px-8 border-b border-gray-100 flex items-center gap-10">
                        <button className="py-4 text-sm font-bold text-blue-600 border-b-2 border-blue-600 transition-all">
                            Customers <span className="ml-1 px-1.5 py-0.5 bg-blue-50 text-blue-500 rounded-full text-[10px]">{customers.length}</span>
                        </button>
                    </div>

                    {/* Filters Row */}
                    <div className="px-4 md:px-8 py-5 border-b border-gray-100 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 items-end text-left">
                        <div className="col-span-1 md:col-span-3">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Customer Name</p>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
                                <input 
                                    type="text"
                                    placeholder="Search"
                                    className="w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-md text-sm outline-none focus:border-blue-400 transition-all placeholder:text-gray-300 font-medium"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="col-span-1 md:col-span-3">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Period</p>
                            <div className="relative">
                                <select 
                                    className="w-full pl-3 pr-9 py-2 bg-white border border-gray-300 rounded-md text-sm outline-none appearance-none cursor-pointer text-gray-700 font-medium"
                                    value={period}
                                    onChange={e => handlePeriodChange(e.target.value)}
                                >
                                    <option>All</option>
                                    <option>This Month</option>
                                    <option>Last Month</option>
                                    <option>Last 7 Days</option>
                                    <option>Custom Range</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-600 pointer-events-none">expand_more</span>
                            </div>
                        </div>
                        <div className="col-span-1 md:col-span-3">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Start</p>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">calendar_today</span>
                                <input 
                                    type="date"
                                    className="w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-md text-sm outline-none focus:border-blue-400 transition-all text-gray-700 font-medium"
                                    value={startDate}
                                    onChange={e => {
                                        setStartDate(e.target.value);
                                        setPeriod('Custom Range');
                                    }}
                                />
                            </div>
                        </div>
                        <div className="col-span-1 md:col-span-3">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">End</p>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">calendar_today</span>
                                <input 
                                    type="date"
                                    className="w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-md text-sm outline-none focus:border-blue-400 transition-all text-gray-700 font-medium"
                                    value={endDate}
                                    onChange={e => {
                                        setEndDate(e.target.value);
                                        setPeriod('Custom Range');
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Content Area */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-6 bg-white custom-scrollbar">
                        <p className="text-sm font-bold text-gray-800 mb-6 px-2 md:px-0 text-left">Total {filteredTx.length} entries</p>
                        
                        {/* Summary Area — Responsive Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 px-2 md:px-0">
                            <div className="bg-[#FCE8E6]/40 p-5 md:p-6 rounded-xl border border-red-100 flex flex-col items-center shadow-sm">
                                <span className="text-red-500 text-[10px] md:text-[11px] font-black uppercase tracking-widest mb-2">TOTAL GAVE</span>
                                <span className="text-red-500 text-xl md:text-2xl font-black">₹{totalGive.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="bg-[#E6F4EA]/40 p-5 md:p-6 rounded-xl border border-green-100 flex flex-col items-center shadow-sm">
                                <span className="text-green-600 text-[10px] md:text-[11px] font-black uppercase tracking-widest mb-2">TOTAL GOT</span>
                                <span className="text-green-600 text-xl md:text-2xl font-black">₹{totalGot.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="bg-slate-50/50 p-5 md:p-6 rounded-xl border border-slate-100 flex flex-col items-center shadow-sm">
                                <span className="text-slate-500 text-[10px] md:text-[11px] font-black uppercase tracking-widest mb-2">NET BALANCE</span>
                                <span className={`text-xl md:text-2xl font-black ${netBalance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    ₹{Math.abs(netBalance).toLocaleString('en-IN')}
                                </span>
                            </div>
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block border border-gray-100 rounded-lg overflow-hidden shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-[#f8f9fa] border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest w-[18%]">Date</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest w-[22%]">Customer Name</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest w-[30%]">Details</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest w-[15%] text-right">You Gave</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest w-[15%] text-right">You Got</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredTx.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-20 text-center text-gray-400 font-medium">No transactions found for this period.</td>
                                        </tr>
                                    ) : filteredTx.map((tx, idx) => {
                                        const isGave = tx.amount < 0 || tx.type === 'GAVE' || tx.type === 'credit';
                                        const absAmt = Math.abs(tx.amount);
                                        return (
                                            <tr key={tx.id || idx} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-5 text-[13px] font-medium text-gray-700">{formatDate(tx.timestamp || tx.date)}</td>
                                                <td className="px-6 py-5 text-[13px] font-bold text-gray-800">
                                                    <Link to={`/reports/customer/${tx.customerId}`} className="hover:text-blue-600 transition-colors">
                                                        {getCustomerName(tx.customerId)}
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-5 text-[13px] text-gray-500 truncate max-w-[200px]">{tx.description || '-'}</td>
                                                <td className="px-6 py-5 text-right text-[14px] font-bold text-red-500">
                                                    {isGave ? `₹${absAmt.toLocaleString('en-IN')}` : '-'}
                                                </td>
                                                <td className="px-6 py-5 text-right text-[14px] font-bold text-green-600">
                                                    {!isGave ? `₹${absAmt.toLocaleString('en-IN')}` : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile List View */}
                        <div className="md:hidden space-y-3 pb-20">
                            {filteredTx.length === 0 ? (
                                <div className="px-6 py-20 text-center text-gray-400 font-medium">No transactions found for this period.</div>
                            ) : filteredTx.map((tx, idx) => {
                                const isGave = tx.amount < 0 || tx.type === 'GAVE' || tx.type === 'credit';
                                const absAmt = Math.abs(tx.amount);
                                const custName = getCustomerName(tx.customerId);
                                return (
                                    <Link 
                                        to={`/reports/customer/${tx.customerId}`}
                                        key={tx.id || idx} 
                                        className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between gap-4 shadow-sm active:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-[#0057BB] font-black flex-shrink-0 border border-blue-50">
                                                {custName.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col gap-0.5 min-w-0 text-left">
                                                <p className="text-[14px] font-bold text-gray-900 truncate">{custName}</p>
                                                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wide">{formatDate(tx.timestamp || tx.date)}</p>
                                                {tx.description && <p className="text-[12px] text-gray-500 truncate mt-0.5">{tx.description}</p>}
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className={`text-[15px] font-black ${isGave ? 'text-red-500' : 'text-green-600'}`}>
                                                ₹{absAmt.toLocaleString('en-IN')}
                                            </p>
                                            <span className={`text-[9px] font-extrabold uppercase tracking-widest mt-0.5 px-1.5 py-0.5 rounded-sm ${isGave ? 'bg-red-50 text-red-400' : 'bg-green-50 text-green-500'}`}>
                                                {isGave ? 'GAVE' : 'GOT'}
                                            </span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Nav — Mobile only */}
            <BottomNav />
        </div>
    );
};

export default Reports;
