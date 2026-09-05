/**
 * Utility functions for Customer Due Dates in HisabKhata
 */

/**
 * Returns YYYY-MM-DD string for today + given number of days
 * @param {number} days 
 * @returns {string} YYYY-MM-DD
 */
export const getFutureDateString = (days = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Normalizes any date value (timestamp, ISO string, YYYY-MM-DD) into YYYY-MM-DD
 * @param {string|number|Date} dateVal 
 * @returns {string|null}
 */
export const normalizeDateString = (dateVal) => {
    if (!dateVal) return null;
    if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
        return dateVal;
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Formats a due date into a human readable string (e.g. "15 Sep 2026")
 * @param {string|number|Date} dateVal 
 * @param {boolean} includeYear 
 * @returns {string}
 */
export const formatDueDate = (dateVal, includeYear = true) => {
    if (!dateVal) return '';
    const norm = normalizeDateString(dateVal);
    if (!norm) return '';
    const [year, month, day] = norm.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    
    return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: includeYear ? 'numeric' : undefined
    });
};

/**
 * Calculates due date status: overdue, today, or upcoming
 * @param {string|number|Date} dateVal 
 * @returns {object|null}
 */
export const getDueDateStatus = (dateVal) => {
    const norm = normalizeDateString(dateVal);
    if (!norm) return null;

    const todayStr = getFutureDateString(0);
    const [ty, tm, td] = todayStr.split('-').map(Number);
    const [dy, dm, dd] = norm.split('-').map(Number);

    const todayDate = new Date(ty, tm - 1, td);
    const targetDate = new Date(dy, dm - 1, dd);

    const diffTime = targetDate.getTime() - todayDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        const absDays = Math.abs(diffDays);
        return {
            isSet: true,
            isOverdue: true,
            isToday: false,
            isUpcoming: false,
            daysDiff: diffDays,
            label: absDays === 1 ? 'Overdue by 1 day' : `Overdue by ${absDays} days`,
            shortLabel: `${absDays}d overdue`,
            formatted: formatDueDate(norm),
            badgeColor: 'bg-red-50 text-red-600 border-red-200'
        };
    } else if (diffDays === 0) {
        return {
            isSet: true,
            isOverdue: false,
            isToday: true,
            isUpcoming: false,
            daysDiff: 0,
            label: 'Due Today',
            shortLabel: 'Due Today',
            formatted: formatDueDate(norm),
            badgeColor: 'bg-amber-50 text-amber-700 border-amber-200'
        };
    } else if (diffDays === 1) {
        return {
            isSet: true,
            isOverdue: false,
            isToday: false,
            isUpcoming: true,
            daysDiff: 1,
            label: 'Due Tomorrow',
            shortLabel: 'Due Tomorrow',
            formatted: formatDueDate(norm),
            badgeColor: 'bg-blue-50 text-blue-700 border-blue-200'
        };
    } else {
        return {
            isSet: true,
            isOverdue: false,
            isToday: false,
            isUpcoming: true,
            daysDiff: diffDays,
            label: `Due in ${diffDays} days (${formatDueDate(norm)})`,
            shortLabel: `Due: ${formatDueDate(norm, false)}`,
            formatted: formatDueDate(norm),
            badgeColor: 'bg-blue-50 text-blue-700 border-blue-200'
        };
    }
};

/**
 * Checks if a customer's due date is today
 */
export const isDueToday = (dateVal) => {
    const norm = normalizeDateString(dateVal);
    return !!norm && norm === getFutureDateString(0);
};

/**
 * Checks if a customer's due date is in the future
 */
export const isUpcomingDue = (dateVal) => {
    const norm = normalizeDateString(dateVal);
    return !!norm && norm > getFutureDateString(0);
};

/**
 * Checks if a customer's due date is in the past
 */
export const isOverdue = (dateVal) => {
    const norm = normalizeDateString(dateVal);
    return !!norm && norm < getFutureDateString(0);
};
