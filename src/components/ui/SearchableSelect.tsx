import React, { useState, useRef, useEffect } from 'react';

export interface SearchableSelectOption {
  value: string | number;
  label: string;
  subLabel?: string;
  icon?: React.ReactNode;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  className = "",
  icon,
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

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

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase()) ||
    (opt.subLabel && opt.subLabel.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button - Changed to div with role=button to avoid nesting issues */}
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
        <div className="flex items-center gap-2 overflow-hidden">
          {icon && <span className="text-cyan-500 shrink-0">{icon}</span>}
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          
          <span className={`block truncate ${!selectedOption ? "text-cyan-800/60 font-medium" : "text-cyan-900 font-semibold"}`}>
             {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        
        <svg 
          className={`w-5 h-5 text-cyan-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} 
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-[100] w-full mt-2 bg-white rounded-xl shadow-xl shadow-cyan-900/10 border border-cyan-100 animate-scale-in origin-top overflow-hidden">
          
          {/* Search Input */}
          <div className="p-3 border-b border-cyan-50 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
            <div className="relative">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full pl-9 pr-3 py-2 bg-cyan-50/50 border border-cyan-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300 text-cyan-900 placeholder:text-cyan-400"
                autoFocus
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto p-2 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-sm text-cyan-600/60 text-center">No results found</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearch(""); 
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors mb-0.5
                      ${isSelected ? "bg-cyan-50 text-cyan-900" : "hover:bg-cyan-50/50 text-cyan-800"}
                    `}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      {opt.icon && <span className="shrink-0 text-xl">{opt.icon}</span>}
                      <div className="truncate">
                        <div className={`text-sm ${isSelected ? "font-bold text-cyan-900" : "font-medium"}`}>
                          {opt.label}
                        </div>
                        {opt.subLabel && (
                          <div className={`text-[11px] mt-0.5 truncate ${isSelected ? "text-cyan-600" : "text-cyan-500/80"}`}>
                            {opt.subLabel}
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <svg className="w-4 h-4 text-cyan-500 shrink-0 ml-2 animate-scale-in" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
