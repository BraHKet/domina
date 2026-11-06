import type { Property } from '../types/property';
import {
  calculateUrbanParameters,
  type DemolizioneResult,
  type DestinazioneUso,
} from './urbanCalculationEngine';
import { getLotData } from './urbanLot';

/** Cosa vuole costruire il costruttore: un campo vuoto non pone limiti. */
export interface SearchCriteria {
  coperto: number | null; // superficie coperta da costruire (m²)
  parcheggi: number | null; // parcheggi da ricavare (m²)
  destinazione: DestinazioneUso;
}

/** Le scelte della simulazione con cui l'immobile soddisfa la ricerca. */
export interface MatchScenario {
  covScelta: number | null;
  tv: number;
  coperto: number;
  parcheggi: number;
}

export const EMPTY_CRITERIA: SearchCriteria = {
  coperto: null,
  parcheggi: null,
  destinazione: 'commerciale',
};

// Il commerciale chiede la superficie di vendita: stesso valore iniziale della scheda.
// Non cambia coperto e parcheggi, gli unici valori confrontati qui.
const COMMERCIAL_DEFAULT_SV = 800;
// Tolleranza sugli arrotondamenti dei calcoli
const TOLERANCE_SQM = 0.5;

function simulate(
  property: Property,
  destinazione: DestinazioneUso,
  covScelta: number | null,
  tv: number
): DemolizioneResult | undefined {
  // Demolizione e ricostruzione, senza premialità: i valori finali delle NTO
  const result = calculateUrbanParameters(getLotData(property), {
    destinazione,
    modalita: 'demolizione',
    sv: COMMERCIAL_DEFAULT_SV,
    covScelta,
    tv,
  });
  return result.status === 'valid' ? result.demolizione : undefined;
}

/**
 * Cerca la simulazione che dà più coperto e più parcheggi, usando solo il motore di calcolo:
 * - il coperto non può superare il coperto massimo;
 * - per i parcheggi si copre a verde tutto il tetto, che vale doppio come verde e libera spazio a terra;
 * - se il coperto non è indicato, si usa quello che lascia più parcheggi.
 * Restituisce null se l'immobile non può soddisfare la ricerca.
 */
export function findScenario(property: Property, criteria: SearchCriteria): MatchScenario | null {
  const base = simulate(property, criteria.destinazione, null, 0);
  if (!base) return null;

  if (!criteria.coperto && !criteria.parcheggi) {
    return { covScelta: null, tv: 0, coperto: base.covEff, parcheggi: base.parcheggi };
  }
  if (criteria.coperto && base.covMax + TOLERANCE_SQM < criteria.coperto) return null;

  // Con il tetto tutto verde i parcheggi calano all'aumentare del coperto oltre metà del verde
  // minimo, e crescono sotto: il massimo è lì, ma mai oltre il coperto massimo.
  const cov = criteria.coperto ?? Math.floor(Math.min(base.covMax, base.permMin / 2));
  const tv = criteria.parcheggi ? cov : 0;
  const d = simulate(property, criteria.destinazione, cov, tv);
  if (!d) return null;

  if (criteria.coperto && d.covEff + TOLERANCE_SQM < criteria.coperto) return null;
  if (criteria.parcheggi && d.parcheggi + TOLERANCE_SQM < criteria.parcheggi) return null;
  return { covScelta: d.covSceltaApplicata, tv: d.tv, coperto: d.covEff, parcheggi: d.parcheggi };
}

export function matchesCriteria(property: Property, criteria: SearchCriteria): boolean {
  return findScenario(property, criteria) !== null;
}
