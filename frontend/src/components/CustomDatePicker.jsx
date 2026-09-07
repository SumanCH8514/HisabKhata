import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    try {
        const [year, month, day] = dateStr.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return dateStr;
    }
};

const toDateString = (year, month, day) => {
    const y = year.toString();
    const m = (month + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const parseDateString = (str) => {
    if (!str) {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
    }
    const parts = str.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        return { year: parts[0], month: parts[1] - 1, day: parts[2] };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
};

const CustomDatePicker = ({
    value,
    onChange,
    className = '',
    buttonClassName = '',
    align = 'left',
    placement = 'bottom',
    minDate = null,
    maxDate = null,
    presets = null,
    renderTrigger = null,
    children = null
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewMode, setViewMode] = useState('days');
    
    const parsed = parseDateString(value);
    const [viewYear, setViewYear] = useState(parsed.year);
    const [viewMonth, setViewMonth] = useState(parsed.month);
    const [tempSelected, setTempSelected] = useState(value);

    const containerRef = useRef(null);

    useEffect(() => {
        if (value) {
            const p = parseDateString(value);
            setViewYear(p.year);
            setViewMonth(p.month);
            setTempSelected(value);
        }
    }, [value, isOpen]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const today = new Date();
    const todayStr = toDateString(today.getFullYear(), today.getMonth(), today.getDate());

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = toDateString(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const prevMonth = () => {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(viewYear - 1);
        } else {
            setViewMonth(viewMonth - 1);
        }
    };

    const nextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(viewYear + 1);
        } else {
            setViewMonth(viewMonth + 1);
        }
    };

    const handleSelectDay = (day) => {
        const selectedStr = toDateString(viewYear, viewMonth, day);
        if (minDate && selectedStr < minDate) return;
        if (maxDate && selectedStr > maxDate) return;
        setTempSelected(selectedStr);
        if (onChange) onChange(selectedStr);
        setIsOpen(false);
    };

    const handlePresetClick = (presetStr) => {
        if (!presetStr) return;
        const p = parseDateString(presetStr);
        setViewYear(p.year);
        setViewMonth(p.month);
        setTempSelected(presetStr);
        if (onChange) onChange(presetStr);
        setIsOpen(false);
    };

    const yearsList = [];
    const currentYear = today.getFullYear();
    for (let y = currentYear - 10; y <= currentYear + 5; y++) {
        yearsList.push(y);
    }

    const calendarCells = [];
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        calendarCells.push({
            day: daysInPrevMonth - i,
            isCurrentMonth: false,
            isPrev: true
        });
    }
    for (let i = 1; i <= daysInMonth; i++) {
        calendarCells.push({
            day: i,
            isCurrentMonth: true
        });
    }
    const remainingCells = 42 - calendarCells.length;
    for (let i = 1; i <= remainingCells; i++) {
        calendarCells.push({
            day: i,
            isCurrentMonth: false,
            isNext: true
        });
    }

    const activePresets = presets !== null ? presets : [
        { label: 'Today', value: todayStr },
        { label: 'Yesterday', value: yesterdayStr },
        {
            label: '1st of Month',
            value: (() => {
                const d = new Date();
                d.setDate(1);
                return toDateString(d.getFullYear(), d.getMonth(), 1);
            })()
        }
    ];

    return (
        <div className={`relative ${isOpen ? 'z-40' : ''} ${className}`} ref={containerRef}>
            {renderTrigger ? (
                renderTrigger({
                    isOpen,
                    open: () => { setIsOpen(true); setViewMode('days'); },
                    close: () => setIsOpen(false),
                    toggle: () => { setIsOpen(!isOpen); setViewMode('days'); },
                    value,
                    formattedValue: formatDisplayDate(value)
                })
            ) : children ? (
                <div onClick={() => { setIsOpen(!isOpen); setViewMode('days'); }}>
                    {typeof children === 'function' ? children({ isOpen, value, formattedValue: formatDisplayDate(value) }) : children}
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => {
                        setIsOpen(!isOpen);
                        setViewMode('days');
                    }}
                    className={`w-full bg-white px-2.5 sm:px-3 h-12 rounded-[14px] border border-slate-200 shadow-xs flex items-center justify-between gap-1 hover:border-slate-400 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all duration-200 cursor-pointer active:scale-[0.99] ${buttonClassName}`}
                >
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <Calendar className="shrink-0 text-slate-500" size={17} />
                        <span className="text-[13px] sm:text-sm font-bold text-slate-800 whitespace-nowrap">
                            {formatDisplayDate(value || todayStr)}
                        </span>
                    </div>
                    <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
                </button>
            )}

            {isOpen && (
                <>
                    <div 
                        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[190] md:hidden"
                        onClick={() => setIsOpen(false)} 
                    />

                    <div className={`
                        fixed bottom-0 left-0 right-0 z-[200] bg-white rounded-t-[28px] p-4 shadow-2xl border-t border-slate-200
                        md:absolute md:w-[264px] md:rounded-xl md:p-3 md:border md:border-slate-200/95 md:shadow-2xl md:z-[300]
                        ${placement === 'top' ? 'md:bottom-full md:top-auto md:mb-2' : 'md:bottom-auto md:top-full md:mt-2'}
                        ${align === 'right' ? 'md:right-0 md:left-auto' : 'md:left-0 md:right-auto'}
                        animate-in slide-in-from-bottom md:zoom-in-95 duration-150
                    `}>
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-2 md:hidden" />

                        {Array.isArray(activePresets) && activePresets.length > 0 && (
                            <div className="flex items-center gap-1 pb-2 mb-2 border-b border-slate-100 overflow-x-auto custom-scrollbar text-[11px]">
                                {activePresets.map((preset) => {
                                    const isSelected = tempSelected === preset.value;
                                    return (
                                        <button
                                            key={preset.label}
                                            type="button"
                                            onClick={() => handlePresetClick(preset.value)}
                                            className={`px-2.5 py-1 rounded-md font-bold shrink-0 transition-all cursor-pointer ${
                                                isSelected 
                                                    ? 'bg-[#0057BB] text-white shadow-xs' 
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                            }`}
                                        >
                                            {preset.label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="flex items-center justify-between mb-2 px-0.5">
                            <div className="flex items-center gap-0.5">
                                <button
                                    type="button"
                                    onClick={() => setViewMode(viewMode === 'months' ? 'days' : 'months')}
                                    className="text-xs font-bold text-slate-900 hover:text-blue-600 flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                    <span>{MONTH_NAMES[viewMonth]}</span>
                                    <ChevronDown size={12} className="text-slate-400" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode(viewMode === 'years' ? 'days' : 'years')}
                                    className="text-xs font-bold text-slate-900 hover:text-blue-600 flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                    <span>{viewYear}</span>
                                    <ChevronDown size={12} className="text-slate-400" />
                                </button>
                            </div>

                            <div className="flex items-center gap-0.5">
                                <button
                                    type="button"
                                    onClick={prevMonth}
                                    className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer"
                                    title="Previous Month"
                                >
                                    <ChevronLeft size={15} />
                                </button>
                                <button
                                    type="button"
                                    onClick={nextMonth}
                                    className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer"
                                    title="Next Month"
                                >
                                    <ChevronRight size={15} />
                                </button>
                            </div>
                        </div>

                        {viewMode === 'months' && (
                            <div className="grid grid-cols-3 gap-1.5 py-1">
                                {SHORT_MONTH_NAMES.map((m, idx) => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => {
                                            setViewMonth(idx);
                                            setViewMode('days');
                                        }}
                                        className={`py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                                            viewMonth === idx 
                                                ? 'bg-[#0057BB] text-white shadow-xs' 
                                                : 'hover:bg-slate-100 text-slate-700'
                                        }`}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        )}

                        {viewMode === 'years' && (
                            <div className="grid grid-cols-3 gap-1.5 py-1 max-h-40 overflow-y-auto custom-scrollbar">
                                {yearsList.map((y) => (
                                    <button
                                        key={y}
                                        type="button"
                                        onClick={() => {
                                            setViewYear(y);
                                            setViewMode('days');
                                        }}
                                        className={`py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                                            viewYear === y 
                                                ? 'bg-[#0057BB] text-white shadow-xs' 
                                                : 'hover:bg-slate-100 text-slate-700'
                                        }`}
                                    >
                                        {y}
                                    </button>
                                ))}
                            </div>
                        )}

                        {viewMode === 'days' && (
                            <div>
                                <div className="grid grid-cols-7 gap-0.5 text-center mb-0.5">
                                    {WEEKDAY_NAMES.map((d, i) => (
                                        <span 
                                            key={d} 
                                            className={`text-[10px] font-bold py-0.5 ${i === 0 || i === 6 ? 'text-slate-400' : 'text-slate-500'}`}
                                        >
                                            {d}
                                        </span>
                                    ))}
                                </div>

                                <div className="grid grid-cols-7 gap-0.5">
                                    {calendarCells.map((cell, idx) => {
                                        if (!cell.isCurrentMonth) {
                                            return (
                                                <div 
                                                    key={idx} 
                                                    className="h-7 flex items-center justify-center text-[10px] text-slate-300 font-medium select-none"
                                                >
                                                    {cell.day}
                                                </div>
                                            );
                                        }

                                        const cellDateStr = toDateString(viewYear, viewMonth, cell.day);
                                        const isSelected = tempSelected === cellDateStr;
                                        const isToday = todayStr === cellDateStr;
                                        const isDisabled = (minDate && cellDateStr < minDate) || (maxDate && cellDateStr > maxDate);

                                        if (isDisabled) {
                                            return (
                                                <div
                                                    key={idx}
                                                    className="h-7 w-full rounded-lg flex items-center justify-center text-[11px] font-medium text-slate-300 select-none cursor-not-allowed"
                                                >
                                                    {cell.day}
                                                </div>
                                            );
                                        }

                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => handleSelectDay(cell.day)}
                                                className={`
                                                    h-7 w-full rounded-lg flex flex-col items-center justify-center text-[11px] font-bold transition-all cursor-pointer relative
                                                    ${isSelected 
                                                        ? 'bg-[#0057BB] text-white shadow-xs scale-105 z-10' 
                                                        : isToday 
                                                            ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200' 
                                                            : 'text-slate-800 hover:bg-slate-100 active:scale-95'
                                                    }
                                                `}
                                            >
                                                <span>{cell.day}</span>
                                                {isToday && !isSelected && (
                                                    <span className="w-1 h-1 rounded-full bg-[#0057BB] absolute bottom-0.5" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 text-[10px] font-medium">
                                <strong className="text-slate-700 font-bold">{formatDisplayDate(tempSelected) || 'No date'}</strong>
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="px-2.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md transition-colors cursor-pointer"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default CustomDatePicker;
