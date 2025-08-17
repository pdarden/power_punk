'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownOption {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  includeAllOption?: boolean;
}

export default function CustomDropdown({ 
  value, 
  onChange, 
  options,
  placeholder = "Select option",
  includeAllOption = true 
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
  };

  const getDisplayValue = () => {
    if (!value) return placeholder;
    if (value === '') return placeholder;
    const option = options.find(opt => opt.value === value);
    return option?.label || placeholder;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left border border-gray-300 rounded-lg bg-white text-gray-900 hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors flex items-center justify-between"
      >
        <span className="text-sm">{getDisplayValue()}</span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {includeAllOption && (
            <button
              type="button"
              onClick={() => handleSelect('')}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm transition-colors"
            >
              <span className="text-gray-700">{placeholder}</span>
            </button>
          )}
          
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm transition-colors"
            >
              <span className="text-gray-900">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}