import React, { useEffect, useId, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Property } from '../types/property';
import type { DestinazioneUso } from '../utils/urbanCalculationEngine';
import { matchesCriteria, type SearchCriteria } from '../utils/searchCriteria';

const DESTINAZIONI: { value: DestinazioneUso; label: string }[] = [
  { value: 'commerciale', label: 'Commerciale' },
  { value: 'residenziale', label: 'Residenziale' },
  { value: 'direzionale', label: 'Direzionale' },
  { value: 'turistico_ricettiva', label: 'Turistico' },
];

interface SearchLandingProps {
  properties: Property[];
  initialCriteria: SearchCriteria;
  onSubmit: (criteria: SearchCriteria) => void;
  onSkip: () => void;
  onClose: () => void;
}

/** Ricerca a tutto schermo: il costruttore dice cosa vuole costruire e vede quanti immobili vanno bene. */
export const SearchLanding: React.FC<SearchLandingProps> = ({ properties, initialCriteria, onSubmit, onSkip, onClose }) => {
  const [criteria, setCriteria] = useState<SearchCriteria>(initialCriteria);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const matches = useMemo(
    () => properties.filter((property) => matchesCriteria(property, criteria)).length,
    [properties, criteria]
  );

  const setNumber = (key: 'coperto' | 'parcheggi') => (value: string) =>
    setCriteria((prev) => ({ ...prev, [key]: value === '' ? null : Math.max(0, Number(value)) }));

  return (
    <div className="domina-search-landing" role="dialog" aria-modal="true" aria-labelledby="domina-search-title">
      <button
        type="button"
        onClick={onClose}
        aria-label="Chiudi la ricerca"
        className="absolute top-4 right-4 p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10"
      >
        <X className="w-5 h-5" />
      </button>
      <form
        className="domina-search-card"
        onSubmit={(e) => {
          e.preventDefault();
          if (matches > 0) onSubmit(criteria);
        }}
      >
        <h1 id="domina-search-title" className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Trova i tuoi capannoni da riqualificare
        </h1>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <NumberField label="Superficie coperta" hint="da costruire" value={criteria.coperto} onChange={setNumber('coperto')} />
          <NumberField label="Parcheggi" hint="da ricavare" value={criteria.parcheggi} onChange={setNumber('parcheggi')} />
        </div>

        <fieldset className="mt-5">
          <legend className="domina-search-label">Destinazione</legend>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DESTINAZIONI.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={criteria.destinazione === option.value}
                onClick={() => setCriteria((prev) => ({ ...prev, destinazione: option.value }))}
                className="domina-search-chip"
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <button type="submit" disabled={matches === 0} className="domina-search-submit">
          <Search className="w-4 h-4" />
          {matches === 0
            ? 'Nessun immobile adatto: allarga la ricerca'
            : `Mostra ${matches} ${matches === 1 ? 'immobile' : 'immobili'} sulla mappa`}
        </button>
        <button type="button" onClick={onSkip} className="mt-3 w-full text-xs font-semibold text-slate-400 hover:text-white">
          Vedi tutti gli immobili
        </button>
      </form>
    </div>
  );
};

const NumberField: React.FC<{
  label: string;
  hint: string;
  value: number | null;
  onChange: (value: string) => void;
}> = ({ label, hint, value, onChange }) => {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="domina-search-label">
        {label} <span className="font-normal text-slate-500">{hint}</span>
      </label>
      <div className="domina-search-input">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min="0"
          step="50"
          placeholder="—"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
        <span>m²</span>
      </div>
    </div>
  );
};
