import type { Property, UrbanLotData } from '../types/property.ts';

/** Dati del lotto dell'immobile, con fallback sui campi base se urbanLotData non è popolato. */
export function getLotData(property: Property): UrbanLotData {
  if (property.urbanLotData) {
    return property.urbanLotData;
  }
  return {
    zona: 'C1',
    comune: property.city || 'Padova',
    perc_in_zona: 100,
    st: property.lotAreaSqm || null,
    slp: property.coveredAreaSqm ? Math.round(property.coveredAreaSqm * 0.9) : null,
    cop: property.coveredAreaSqm || null,
    sco:
      property.lotAreaSqm && property.coveredAreaSqm
        ? Math.max(0, property.lotAreaSqm - property.coveredAreaSqm)
        : null,
    vol: property.coveredAreaSqm ? property.coveredAreaSqm * 3 : null,
  };
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return Math.round(value).toLocaleString('it-IT');
}
