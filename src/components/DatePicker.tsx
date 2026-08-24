import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (dateStr: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  align?: 'left' | 'right';
  label?: string;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Helper to parse 'DD-MMM-YYYY' or ISO date strings
function parseCustomDate(str: string): Date {
  if (!str) return new Date();
  
  // Format DD-MMM-YYYY (e.g., 24-Aug-2026)
  const match = str.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const monthStr = match[2].toLowerCase();
    const year = parseInt(match[3], 10);
    const monthIndex = MONTH_NAMES.findIndex(m => m.toLowerCase() === monthStr);
    if (monthIndex !== -1) {
      return new Date(year, monthIndex, day);
    }
  }

  // Format YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10));
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

// Helper to format Date to 'DD-MMM-YYYY'
function formatCustomDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select date',
  className = '',
  inputClassName = '',
  align = 'left',
  label
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = parseCustomDate(value);
  const [viewDate, setViewDate] = useState<Date>(selectedDate);

  // Sync viewDate with selectedDate when opened or value changes
  useEffect(() => {
    setViewDate(parseCustomDate(value));
  }, [value, isOpen]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value, 10);
    setViewDate(new Date(newYear, currentMonth, 1));
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value, 10);
    setViewDate(new Date(currentYear, newMonth, 1));
  };

  const handleSelectDay = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    onChange(formatCustomDate(newDate));
    setIsOpen(false);
  };

  const handleQuickPreset = (preset: 'today' | 'startOfMonth' | 'endOfMonth') => {
    const now = new Date();
    let target = new Date();
    if (preset === 'today') {
      target = now;
    } else if (preset === 'startOfMonth') {
      target = new Date(currentYear, currentMonth, 1);
    } else if (preset === 'endOfMonth') {
      target = new Date(currentYear, currentMonth + 1, 0);
    }
    onChange(formatCustomDate(target));
    setIsOpen(false);
  };

  // Calendar math
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayIndex }, (_, i) => i);

  // Year options (-5 to +5 years around 2026)
  const years = Array.from({ length: 15 }, (_, i) => 2020 + i);

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth &&
      today.getFullYear() === currentYear
    );
  };

  const isSelected = (day: number) => {
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth &&
      selectedDate.getFullYear() === currentYear
    );
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {label && (
        <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
          {label}
        </label>
      )}

      {/* Input / Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-1.5 cursor-pointer bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs font-mono font-medium text-gray-900 hover:border-[#EA580C] focus-within:border-[#EA580C] focus-within:ring-1 focus-within:ring-[#EA580C] transition-all select-none ${inputClassName}`}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {value || placeholder}
        </span>
        <CalendarIcon className="w-3.5 h-3.5 text-gray-400 shrink-0 hover:text-[#EA580C] transition-colors" />
      </div>

      {/* Calendar Dropdown Popover */}
      {isOpen && (
        <div
          className={`absolute z-60 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl p-3 animate-in fade-in zoom-in-95 duration-100 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Month / Year Navigation */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded cursor-pointer transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 font-sans">
              {/* Month Dropdown */}
              <select
                value={currentMonth}
                onChange={handleMonthChange}
                className="text-xs font-bold text-gray-800 bg-transparent hover:bg-gray-100 rounded px-1 py-0.5 cursor-pointer outline-none"
              >
                {FULL_MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>

              {/* Year Dropdown */}
              <select
                value={currentYear}
                onChange={handleYearChange}
                className="text-xs font-bold text-gray-800 bg-transparent hover:bg-gray-100 rounded px-1 py-0.5 cursor-pointer outline-none"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded cursor-pointer transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[10px] font-bold text-gray-400 font-sans uppercase">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1 text-center font-mono text-xs">
            {blanks.map((b) => (
              <div key={`blank-${b}`} className="w-7 h-7" />
            ))}
            {days.map((day) => {
              const selected = isSelected(day);
              const today = isToday(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`w-7 h-7 rounded flex items-center justify-center cursor-pointer transition-colors text-xs ${
                    selected
                      ? 'bg-[#EA580C] text-white font-bold shadow-xs'
                      : today
                      ? 'border border-[#EA580C] text-[#EA580C] font-bold hover:bg-orange-50'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick Presets Footer */}
          <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-sans">
            <button
              type="button"
              onClick={() => handleQuickPreset('startOfMonth')}
              className="text-gray-500 hover:text-gray-800 hover:underline cursor-pointer px-1 py-0.5 rounded"
            >
              1st of Mo
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset('today')}
              className="text-[#EA580C] font-bold hover:text-orange-700 cursor-pointer px-1 py-0.5 rounded hover:bg-orange-50"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset('endOfMonth')}
              className="text-gray-500 hover:text-gray-800 hover:underline cursor-pointer px-1 py-0.5 rounded"
            >
              End of Mo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
