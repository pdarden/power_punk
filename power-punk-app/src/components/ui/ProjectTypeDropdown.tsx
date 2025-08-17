'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { ProjectType } from '@/types';
import ProjectTypeIcon, { getProjectTypeLabel, getProjectTypeColor } from './ProjectTypeIcon';

interface ProjectTypeDropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  includeAllOption?: boolean;
}

const PROJECT_TYPES: ProjectType[] = [
  'solar_microgrid',
  'batteries',
  'community_park',
  'hvac_system',
  'tree_planting',
  'electrification',
  'bitcoin_mining',
  'gpu_infrastructure',
];

export default function ProjectTypeDropdown({ 
  value, 
  onChange, 
  placeholder = "All Project Types",
  includeAllOption = true 
}: ProjectTypeDropdownProps) {
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
    return getProjectTypeLabel(value as ProjectType);
  };

  const getDisplayIcon = () => {
    if (!value || value === '') return null;
    return (
      <ProjectTypeIcon 
        type={value as ProjectType} 
        className={`w-4 h-4 mr-2 ${getProjectTypeColor(value as ProjectType)}`} 
      />
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left border border-gray-300 rounded-lg bg-white text-gray-900 hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center">
          {getDisplayIcon()}
          <span className="text-sm">{getDisplayValue()}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {includeAllOption && (
            <button
              type="button"
              onClick={() => handleSelect('')}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm flex items-center transition-colors"
            >
              <span className="text-gray-700">{placeholder}</span>
            </button>
          )}
          
          {PROJECT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleSelect(type)}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm flex items-center transition-colors"
            >
              <ProjectTypeIcon 
                type={type} 
                className={`w-4 h-4 mr-2 ${getProjectTypeColor(type)}`} 
              />
              <span className="text-gray-900">{getProjectTypeLabel(type)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}