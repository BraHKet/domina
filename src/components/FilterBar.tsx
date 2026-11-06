import React from 'react';
import { Search } from 'lucide-react';
import type { PropertyCategory } from '../types/property';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: PropertyCategory | 'all';
  onCategoryChange: (cat: PropertyCategory | 'all') => void;
  totalCount: number;
  filteredCount: number;
  onOpenSearch: () => void;
  searchActive: boolean;
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
  onOpenSearch,
  searchActive,
}) => (
  <div className="flex flex-1 min-w-0 items-center gap-3">
    <button
      type="button"
      onClick={onOpenSearch}
      aria-label="Cerca per coperto e parcheggi"
      title="Cerca per coperto e parcheggi"
      className={`flex-none inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
        searchActive ? 'bg-teal-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
      }`}
    >
      <Search className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Cerca</span>
    </button>
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
