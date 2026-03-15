import React, { useState, useRef, useEffect } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  startOfWeek,
  endOfWeek,
  isBefore,
  startOfDay,
} from 'date-fns';

interface DatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  minDate?: string; // YYYY-MM-DD format
  maxDate?: string; // YYYY-MM-DD format
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function DatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = "Select a date...",
  className = "",
  disabled = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => value ? new Date(value) : new Date());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Set the view to the selected date when opening
  useEffect(() => {
    if (isOpen && value) {
      setCurrentMonth(new Date(value));
    } else if (isOpen && !value) {
      setCurrentMonth(new Date());
    }
  }, [isOpen, value]);

  const selectedDate = value ? new Date(value) : null;
  const minDateObj = minDate ? startOfDay(new Date(minDate)) : null;
  const maxDateObj = maxDate ? startOfDay(new Date(maxDate)) : null;

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const dateFormat = "d";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const handleDateClick = (day: Date) => {
    // Check min/max constraints
    if (minDateObj && isBefore(day, minDateObj)) return;
    if (maxDateObj && isBefore(maxDateObj, day)) return;
    
    // Convert to YYYY-MM-DD
    const localDate = new Date(day.getTime() - (day.getTimezoneOffset() * 60000));
    const dateString = localDate.toISOString().split('T')[0];
    
    onChange(dateString);
    setIsOpen(false);
  };

  const formattedDisplay = selectedDate 
    ? format(selectedDate, "MMM d, yyyy") 
    : placeholder;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className={`w-full flex items-center justify-between px-4 py-2.5 border-2 rounded-xl bg-white/80 transition-all text-left outline-none cursor-pointer
          ${disabled ? "opacity-60 cursor-not-allowed border-gray-100" : isOpen ? "border-cyan-400 ring-4 ring-cyan-400/10" : "border-cyan-100 hover:border-cyan-300 focus:border-cyan-400"}
        `}
      >
        <div className="flex items-center gap-2 overflow-hidden text-cyan-900">
          <svg className="w-5 h-5 text-cyan-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className={`block truncate ${!selectedDate ? "text-cyan-800/60 font-medium" : "font-semibold"}`}>
            {formattedDisplay}
          </span>
        </div>
      </div>

      {/* Calendar Dropdown */}
      {isOpen && (
        <div className="absolute z-[100] w-[300px] mt-2 bg-white rounded-xl shadow-xl shadow-cyan-900/10 border border-cyan-100 p-4 animate-scale-in origin-top">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={prevMonth}
              className="p-1 hover:bg-cyan-50 rounded-lg text-cyan-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="font-bold text-cyan-900">
              {format(currentMonth, "MMMM yyyy")}
            </div>
            <button 
              onClick={nextMonth}
              className="p-1 hover:bg-cyan-50 rounded-lg text-cyan-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <div key={day} className="text-center text-xs font-bold text-cyan-600/70 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isTodayDate = isToday(day);
              
              let isDisabled = false;
              if (minDateObj && isBefore(day, minDateObj)) isDisabled = true;
              if (maxDateObj && isBefore(maxDateObj, day)) isDisabled = true;

              return (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  onClick={() => !isDisabled && handleDateClick(day)}
                  className={`
                    flex items-center justify-center h-8 rounded-lg text-sm transition-all
                    ${isDisabled ? "text-gray-300 cursor-not-allowed" : "cursor-pointer"}
                    ${!isCurrentMonth ? "text-gray-400" : "font-medium"}
                    ${isSelected 
                      ? "bg-gradient-to-br from-cyan-400 to-teal-500 text-white shadow-md shadow-cyan-200/50 font-bold" 
                      : !isDisabled && "hover:bg-cyan-50 text-cyan-800 hover:text-cyan-900"}
                    ${isTodayDate && !isSelected ? "ring-2 ring-cyan-200 ring-inset" : ""}
                  `}
                >
                  {format(day, dateFormat)}
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-cyan-50 flex justify-between items-center text-xs">
            <button 
              onClick={() => handleDateClick(new Date())}
              className="text-cyan-600 hover:text-teal-600 font-bold px-2 py-1 rounded hover:bg-cyan-50 transition-colors"
            >
              Today
            </button>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 font-medium px-2 py-1 rounded hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
