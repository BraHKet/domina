import React from 'react';
import type { PropertyCategory } from '../types/property';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: PropertyCategory | 'all';
  onCategoryChange: (cat: PropertyCategory | 'all') => void;
  totalCount: number;
  filteredCount: number;
}

const FILTERS: { value: PropertyCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Tutti' },
  { value: 'negozi', label: 'Negozi e locali' },
  { value: 'capannoni', label: 'Capannoni' },
  { value: 'altri', label: 'Altri' },
];

export const FilterBar: React.FC<FilterBarProps> = ({
  selectedCategory,
  onCategoryChange,
  filteredCount,
}) => (
  <div className="flex flex-1 min-w-0 items-center gap-3">
    <div className="flex min-w-0 items-center gap-1 overflow-x-auto no-scrollbar" role="group" aria-label="Tipologia di immobile">
      {FILTERS.map((filter) => (
        <button
          key={filter.value}
          type="button"
          aria-pressed={selectedCategory === filter.value}
          onClick={() => onCategoryChange(filter.value)}
          className={`flex-none px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            selectedCategory === filter.value
              ? 'bg-white text-slate-900'
              : 'text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
    <span className="hidden md:inline flex-none text-xs text-slate-400">
      {filteredCount} {filteredCount === 1 ? 'immobile' : 'immobili'}
    </span>
  </div>
);
