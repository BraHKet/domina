import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Store, Warehouse, LayoutGrid, X } from 'lucide-react';
import type { PropertyCategory } from '../types/property';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: PropertyCategory | 'all';
  onCategoryChange: (cat: PropertyCategory | 'all') => void;
  totalCount: number;
  filteredCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  totalCount,
  filteredCount,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDropdownLabel = () => {
    switch (selectedCategory) {
      case 'negozi':
        return 'Negozi e locali';
      case 'capannoni':
        return 'Capannoni';
      case 'altri':
        return 'Altri immobili';
      default:
        return 'Tutte le tipologie';
    }
  };

  return (
    <div className="z-20 flex-none bg-white border-b border-gray-200 px-3 sm:px-6 py-2 sm:py-2.5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 sm:gap-2.5 lg:gap-4">
        {/* Left Side: Search + Dropdown + Quick Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-1 lg:max-w-4xl">
          {/* Row 1 on mobile: Search + Dropdown */}
          <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">


            {/* Tipologie Dropdown */}
            <div className="relative flex-shrink-0" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center space-x-1.5 sm:space-x-2 transition-colors ${selectedCategory !== 'all' ? 'border-[#0d6e5a] text-[#0d6e5a] font-medium' : 'text-gray-700'
                  }`}
              >
                <span className="truncate max-w-[110px] sm:max-w-none">{getDropdownLabel()}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-50 text-xs">
                  <button
                    onClick={() => {
                      onCategoryChange('all');
                      setDropdownOpen(false);
                    }}
                    className={`w-full px-3.5 py-2 text-left hover:bg-gray-50 flex items-center justify-between ${selectedCategory === 'all' ? 'text-[#0d6e5a] font-semibold bg-emerald-50/50' : 'text-gray-700'
                      }`}
                  >
                    <span>Tutte le tipologie</span>
                    <span className="text-[11px] text-gray-400">({totalCount})</span>
                  </button>
                  <button
                    onClick={() => {
                      onCategoryChange('negozi');
                      setDropdownOpen(false);
                    }}
                    className={`w-full px-3.5 py-2 text-left hover:bg-gray-50 flex items-center justify-between ${selectedCategory === 'negozi' ? 'text-[#0d6e5a] font-semibold bg-emerald-50/50' : 'text-gray-700'
                      }`}
                  >
                    <span>Negozi e locali</span>
                  </button>
                  <button
                    onClick={() => {
                      onCategoryChange('capannoni');
                      setDropdownOpen(false);
                    }}
                    className={`w-full px-3.5 py-2 text-left hover:bg-gray-50 flex items-center justify-between ${selectedCategory === 'capannoni' ? 'text-[#0d6e5a] font-semibold bg-emerald-50/50' : 'text-gray-700'
                      }`}
                  >
                    <span>Capannoni</span>
                  </button>
                  <button
                    onClick={() => {
                      onCategoryChange('altri');
                      setDropdownOpen(false);
                    }}
                    className={`w-full px-3.5 py-2 text-left hover:bg-gray-50 flex items-center justify-between ${selectedCategory === 'altri' ? 'text-[#0d6e5a] font-semibold bg-emerald-50/50' : 'text-gray-700'
                      }`}
                  >
                    <span>Altri immobili</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile-only compact counter */}
            <span className="sm:hidden text-[11px] text-gray-500 font-semibold px-2 py-1 rounded bg-gray-100 flex-shrink-0">
              {filteredCount}/{totalCount}
            </span>
          </div>

          {/* Row 2 on mobile: Quick Pills (scrollable horizontally without wrapping) */}
          <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-0.5 flex-nowrap sm:flex-wrap lg:flex-nowrap">
            {/* Quick Pill: Negozi e locali */}
            <button
              onClick={() => onCategoryChange(selectedCategory === 'negozi' ? 'all' : 'negozi')}
              className={`px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs rounded-lg border flex items-center space-x-1.5 transition-all flex-shrink-0 ${selectedCategory === 'negozi'
                  ? 'bg-[#0d6e5a]/10 border-[#0d6e5a] text-[#0d6e5a] font-medium'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
            >
              <Store className="w-3.5 h-3.5 text-gray-500" />
              <span>Negozi e locali</span>
            </button>

            {/* Quick Pill: Capannoni */}
            <button
              onClick={() => onCategoryChange(selectedCategory === 'capannoni' ? 'all' : 'capannoni')}
              className={`px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs rounded-lg border flex items-center space-x-1.5 transition-all flex-shrink-0 ${selectedCategory === 'capannoni'
                  ? 'bg-[#0d6e5a]/10 border-[#0d6e5a] text-[#0d6e5a] font-medium'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
            >
              <Warehouse className="w-3.5 h-3.5 text-gray-500" />
              <span>Capannoni</span>
            </button>

            {/* Quick Pill: Altri immobili */}
            <button
              onClick={() => onCategoryChange(selectedCategory === 'altri' ? 'all' : 'altri')}
              className={`px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs rounded-lg border flex items-center space-x-1.5 transition-all flex-shrink-0 ${selectedCategory === 'altri'
                  ? 'bg-[#0d6e5a]/10 border-[#0d6e5a] text-[#0d6e5a] font-medium'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-gray-500" />
              <span>Altri immobili</span>
            </button>
          </div>
        </div>

        {/* Right Side: Immobili Trovati Count (Desktop / Tablet) */}
        <div className="hidden sm:flex items-center space-x-2 text-xs text-gray-500 font-normal flex-shrink-0 self-end lg:self-auto">
          <span>{filteredCount} immobili trovati</span>
          <span className="text-gray-300">|</span>
          <span>
            Totale: <strong className="text-gray-800 font-semibold">{totalCount}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
