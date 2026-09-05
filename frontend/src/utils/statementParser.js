import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import * as XLSX from 'xlsx';

// Set worker source for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const MONTH_MAP = {
    jan: '01', january: '01',
    feb: '02', february: '02',
    mar: '03', march: '03',
    apr: '04', april: '04',
    may: '05',
    jun: '06', june: '06',
    jul: '07', july: '07',
    aug: '08', august: '08',
    sep: '09', sept: '09', september: '09',
    oct: '10', october: '10',
    nov: '11', november: '11',
    dec: '12', december: '12'
};

/**
 * Standardize dates into YYYY-MM-DD
 */
export const normalizeDate = (rawDate, fallbackYear = new Date().getFullYear()) => {
    if (!rawDate) return new Date().toISOString().split('T')[0];
    const cleaned = rawDate.trim().replace(/,/g, '');

    // Format: 05 Aug 2026 or 05 August 2026
    const dayMonthYearRegex = /^(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{2,4}))?$/;
    const dmyMatch = cleaned.match(dayMonthYearRegex);
    if (dmyMatch) {
        const day = dmyMatch[1].padStart(2, '0');
        const monthKey = dmyMatch[2].toLowerCase();
        const month = MONTH_MAP[monthKey] || '01';
        let year = dmyMatch[3] || fallbackYear;
        if (year && String(year).length === 2) year = `20${year}`;
        return `${year}-${month}-${day}`;
    }

    // Format: DD/MM/YYYY or DD-MM-YYYY
    const slashRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/;
    const slashMatch = cleaned.match(slashRegex);
    if (slashMatch) {
        const day = slashMatch[1].padStart(2, '0');
        const month = slashMatch[2].padStart(2, '0');
        let year = slashMatch[3];
        if (year.length === 2) year = `20${year}`;
        return `${year}-${month}-${day}`;
    }

    // Format: YYYY-MM-DD
    const isoRegex = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/;
    const isoMatch = cleaned.match(isoRegex);
    if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
    }

    // Fallback Date object parsing
    const parsed = new Date(cleaned);
    if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
    }

    return new Date().toISOString().split('T')[0];
};

/**
 * Extract structured rows from Khatabook PDF using text coordinates
 */
export const parseKhatabookPdf = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;

    let fullTextItems = [];
    let statementYear = new Date().getFullYear();
    let headerMeta = {
        title: '',
        phone: '',
        dateRange: '',
        openingBalance: 0,
        totalDebit: 0,
        totalCredit: 0,
        netBalance: 0,
        entriesCount: 0
    };

    // Extract all text elements with coordinates page by page
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Items on this page
        const pageItems = textContent.items.map(item => ({
            text: item.str.trim(),
            x: Math.round(item.transform[4]),
            y: Math.round(item.transform[5]),
            width: Math.round(item.width),
            height: Math.round(item.height),
            page: pageNum
        })).filter(i => i.text.length > 0);

        fullTextItems.push({ pageNum, items: pageItems });
    }

    // Combine raw strings for metadata discovery
    const rawAllStrings = fullTextItems.flatMap(p => p.items.map(i => i.text));
    const fullTextJoined = rawAllStrings.join(' ');

    // 1. Discover Statement Year & Date Range
    const dateRangeMatch = fullTextJoined.match(/\((\d{1,2}\s+[A-Za-z]+(?:\s+\d{4})?)\s*-\s*(\d{1,2}\s+[A-Za-z]+\s*(\d{4}))\)/i);
    if (dateRangeMatch) {
        headerMeta.dateRange = `${dateRangeMatch[1]} - ${dateRangeMatch[2]}`;
        if (dateRangeMatch[3]) {
            statementYear = parseInt(dateRangeMatch[3], 10);
        }
    } else {
        const anyYearMatch = fullTextJoined.match(/\b(202[0-9]|203[0-9])\b/);
        if (anyYearMatch) {
            statementYear = parseInt(anyYearMatch[1], 10);
        }
    }

    // 2. Discover Phone Number
    const phoneMatch = fullTextJoined.match(/Phone Number:\s*(\+?\d[\d\s-]{8,15})/i);
    if (phoneMatch) {
        headerMeta.phone = phoneMatch[1].replace(/[^\d+]/g, '');
    }

    // 3. Discover Statement Title / Party Name
    const titleMatch = fullTextJoined.match(/([A-Za-z0-9\s._-]+Statement)/i);
    if (titleMatch) {
        headerMeta.title = titleMatch[1].replace(/Statement/i, '').trim();
    }

    // 4. Discover Totals from Header Summary
    const totalDebitMatch = fullTextJoined.match(/Total Debit\(-?\)\s*₹?\s*([\d,]+\.?\d*)/i);
    if (totalDebitMatch) {
        headerMeta.totalDebit = parseFloat(totalDebitMatch[1].replace(/,/g, '')) || 0;
    }

    const totalCreditMatch = fullTextJoined.match(/Total Credit\(\+?\)\s*₹?\s*([\d,]+\.?\d*)/i);
    if (totalCreditMatch) {
        headerMeta.totalCredit = parseFloat(totalCreditMatch[1].replace(/,/g, '')) || 0;
    }

    const openingBalMatch = fullTextJoined.match(/Opening Balance\s*₹?\s*([\d,]+\.?\d*)/i);
    if (openingBalMatch) {
        headerMeta.openingBalance = parseFloat(openingBalMatch[1].replace(/,/g, '')) || 0;
    }

    const netBalMatch = fullTextJoined.match(/Net Balance\s*₹?\s*([\d,]+\.?\d*)\s*(Dr|Cr)?/i);
    if (netBalMatch) {
        const amount = parseFloat(netBalMatch[1].replace(/,/g, '')) || 0;
        const isCr = (netBalMatch[2] || '').toLowerCase() === 'cr';
        headerMeta.netBalance = isCr ? amount : -amount;
    }

    // 5. Parse Rows page by page
    const transactions = [];

    for (const { pageNum, items } of fullTextItems) {
        // Group items by line (Y coordinate, tolerance ~ 4 units)
        const linesMap = new Map();
        for (const item of items) {
            let foundKey = null;
            for (const key of linesMap.keys()) {
                if (Math.abs(key - item.y) <= 4) {
                    foundKey = key;
                    break;
                }
            }
            if (foundKey !== null) {
                linesMap.get(foundKey).push(item);
            } else {
                linesMap.set(item.y, [item]);
            }
        }

        // Sort lines from top to bottom (Y descending in PDF coordinate system)
        const sortedYKeys = Array.from(linesMap.keys()).sort((a, b) => b - a);

        let colXDate = null;
        let colXDetails = null;
        let colXDebit = null;
        let colXCredit = null;
        let colXBalance = null;

        for (const y of sortedYKeys) {
            const lineItems = linesMap.get(y).sort((a, b) => a.x - b.x);
            const lineText = lineItems.map(i => i.text).join(' ');

            // Check if this is the table header line
            if (lineText.includes('Date') && lineText.includes('Debit') && lineText.includes('Credit')) {
                for (const item of lineItems) {
                    const t = item.text.toLowerCase();
                    if (t.includes('date')) colXDate = item.x;
                    else if (t.includes('details')) colXDetails = item.x;
                    else if (t.includes('debit')) colXDebit = item.x;
                    else if (t.includes('credit')) colXCredit = item.x;
                    else if (t.includes('balance')) colXBalance = item.x;
                }
                continue;
            }

            // Skip non-transaction headers, footers & branding
            if (
                lineText.includes('Grand Total') ||
                lineText.includes('Report Generated') ||
                lineText.includes('SuvamDharKhata') ||
                lineText.includes('Khatabook') ||
                lineText.includes('Start Using') ||
                lineText.includes('Help:') ||
                lineText.includes('Page ') ||
                lineText.includes('No. of Entries') ||
                (lineText.includes('Opening Balance') && lineText.includes('₹')) ||
                lineText.includes('Debit(-)') ||
                lineText.includes('Credit(+)')
            ) {
                continue;
            }

            // A valid transaction row begins with a date: e.g. "05 Aug" or "13 Aug" or "05 August 2026"
            const firstItem = lineItems[0];
            const dateRegex = /^(\d{1,2})\s+([A-Za-z]{3,9})(?:\s+(\d{4}))?$/;
            
            // Check if first item or combined first 2 items form a date
            let rowDate = null;
            let itemIndexStart = 1;

            if (firstItem && dateRegex.test(firstItem.text)) {
                rowDate = firstItem.text;
                itemIndexStart = 1;
            } else if (lineItems.length >= 2) {
                const combinedDate = `${lineItems[0].text} ${lineItems[1].text}`;
                if (dateRegex.test(combinedDate)) {
                    rowDate = combinedDate;
                    itemIndexStart = 2;
                }
            }

            if (!rowDate) continue; // Not a transaction row

            const normalizedDate = normalizeDate(rowDate, statementYear);

            // Extract the remaining elements: details, debit, credit, balance
            const remainingItems = lineItems.slice(itemIndexStart);
            if (remainingItems.length === 0) continue;

            // Look for numeric amounts and description
            let descriptionParts = [];
            let debitAmount = null;
            let creditAmount = null;
            let rowBalance = null;

            for (const item of remainingItems) {
                const cleanStr = item.text.replace(/,/g, '');
                const numMatch = cleanStr.match(/^([\d.]+)(\s*(Dr|Cr))?$/i);

                if (numMatch && !isNaN(parseFloat(numMatch[1]))) {
                    const val = parseFloat(numMatch[1]);
                    const suffix = numMatch[3] ? numMatch[3].toUpperCase() : '';

                    // If it has Dr or Cr suffix, it's the balance column
                    if (suffix || (colXBalance && Math.abs(item.x - colXBalance) < 40)) {
                        rowBalance = suffix === 'CR' ? val : -val;
                        continue;
                    }

                    // Check column position against header if available
                    if (colXDebit && colXCredit) {
                        const distToDebit = Math.abs(item.x - colXDebit);
                        const distToCredit = Math.abs(item.x - colXCredit);
                        if (distToDebit < distToCredit && debitAmount === null) {
                            debitAmount = val;
                        } else if (creditAmount === null) {
                            creditAmount = val;
                        } else {
                            descriptionParts.push(item.text);
                        }
                    } else {
                        // Fallback positional heuristic:
                        if (debitAmount === null && creditAmount === null) {
                            if (item.x < (colXBalance || 500)) {
                                debitAmount = val;
                            }
                        } else if (creditAmount === null) {
                            creditAmount = val;
                        }
                    }
                } else {
                    descriptionParts.push(item.text);
                }
            }

            const description = descriptionParts.join(' ').trim();

            if (debitAmount !== null && (creditAmount === null || debitAmount > 0)) {
                transactions.push({
                    id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                    date: normalizedDate,
                    displayDate: rowDate,
                    description: description || 'Ledger Entry',
                    amount: debitAmount,
                    type: 'GAVE', // Debit is You Gave
                    balance: rowBalance,
                    selected: true
                });
            } else if (creditAmount !== null) {
                transactions.push({
                    id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                    date: normalizedDate,
                    displayDate: rowDate,
                    description: description || 'Payment Received',
                    amount: creditAmount,
                    type: 'GOT', // Credit is You Got
                    balance: rowBalance,
                    selected: true
                });
            }
        }
    }

    headerMeta.entriesCount = transactions.length;

    return {
        success: true,
        meta: headerMeta,
        transactions
    };
};

/**
 * Parse XLSX or CSV statement
 */
export const parseSpreadsheetStatement = async (file) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (!rawJson || rawJson.length === 0) {
        throw new Error('Spreadsheet appears to be empty');
    }

    let headerRowIndex = -1;
    let colMap = { date: -1, description: -1, debit: -1, credit: -1, amount: -1, type: -1 };

    for (let r = 0; r < Math.min(rawJson.length, 15); r++) {
        const row = rawJson[r].map(c => String(c).toLowerCase().trim());
        const hasDate = row.some(c => c.includes('date'));
        const hasDetails = row.some(c => c.includes('detail') || c.includes('particular') || c.includes('remark') || c.includes('desc') || c.includes('note'));
        const hasDebitOrCredit = row.some(c => c.includes('debit') || c.includes('credit') || c.includes('gave') || c.includes('got') || c.includes('amount'));

        if (hasDate && (hasDetails || hasDebitOrCredit)) {
            headerRowIndex = r;
            row.forEach((col, idx) => {
                if (col.includes('date')) colMap.date = idx;
                else if (col.includes('detail') || col.includes('desc') || col.includes('particular') || col.includes('note') || col.includes('remark')) colMap.description = idx;
                else if (col.includes('debit') || col.includes('gave') || col.includes('out')) colMap.debit = idx;
                else if (col.includes('credit') || col.includes('got') || col.includes('in') || col.includes('paid')) colMap.credit = idx;
                else if (col.includes('amount')) colMap.amount = idx;
                else if (col.includes('type')) colMap.type = idx;
            });
            break;
        }
    }

    if (headerRowIndex === -1) {
        headerRowIndex = 0;
        colMap = { date: 0, description: 1, debit: 2, credit: 3, amount: -1, type: -1 };
    }

    const transactions = [];
    for (let r = headerRowIndex + 1; r < rawJson.length; r++) {
        const row = rawJson[r];
        if (!row || row.length === 0) continue;

        const rawDate = row[colMap.date];
        if (!rawDate) continue;

        const rawDesc = colMap.description !== -1 ? String(row[colMap.description] || '') : '';
        const rawDebit = colMap.debit !== -1 ? parseFloat(String(row[colMap.debit]).replace(/[^\d.-]/g, '')) : null;
        const rawCredit = colMap.credit !== -1 ? parseFloat(String(row[colMap.credit]).replace(/[^\d.-]/g, '')) : null;
        const rawAmount = colMap.amount !== -1 ? parseFloat(String(row[colMap.amount]).replace(/[^\d.-]/g, '')) : null;
        const rawTypeStr = colMap.type !== -1 ? String(row[colMap.type] || '').toUpperCase() : '';

        if (String(rawDate).toLowerCase().includes('total') || rawDesc.toLowerCase().includes('grand total')) continue;

        let dateStr = '';
        if (rawDate instanceof Date) {
            dateStr = rawDate.toISOString().split('T')[0];
        } else {
            dateStr = normalizeDate(String(rawDate));
        }

        if (rawDebit && !isNaN(rawDebit) && rawDebit > 0) {
            transactions.push({
                id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                date: dateStr,
                displayDate: dateStr,
                description: rawDesc || 'Debit Entry',
                amount: rawDebit,
                type: 'GAVE',
                selected: true
            });
        } else if (rawCredit && !isNaN(rawCredit) && rawCredit > 0) {
            transactions.push({
                id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                date: dateStr,
                displayDate: dateStr,
                description: rawDesc || 'Payment Received',
                amount: rawCredit,
                type: 'GOT',
                selected: true
            });
        } else if (rawAmount && !isNaN(rawAmount)) {
            const isGot = rawTypeStr.includes('GOT') || rawTypeStr.includes('CREDIT') || rawAmount > 0;
            transactions.push({
                id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                date: dateStr,
                displayDate: dateStr,
                description: rawDesc || (isGot ? 'Payment Received' : 'Debit Entry'),
                amount: Math.abs(rawAmount),
                type: isGot ? 'GOT' : 'GAVE',
                selected: true
            });
        }
    }

    return {
        success: true,
        meta: {
            title: file.name.replace(/\.[^/.]+$/, ''),
            entriesCount: transactions.length
        },
        transactions
    };
};

/**
 * Universal statement file parser entry point
 */
export const parseStatementFile = async (file) => {
    const extension = file.name.split('.').pop().toLowerCase();
    if (extension === 'pdf') {
        return await parseKhatabookPdf(file);
    } else if (['xlsx', 'xls', 'csv'].includes(extension)) {
        return await parseSpreadsheetStatement(file);
    } else {
        throw new Error('Unsupported file format. Please upload a PDF, XLSX, or CSV file.');
    }
};
