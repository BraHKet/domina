/**
 * CONFIGURAZIONE NORMATIVA URBANISTICA PER ZONA
 * Chiave: comune + zona (es. "padova_c1").
 * Tutti i parametri normativi sono definiti esclusivamente in questo file.
 * Nessun valore normativo è hardcoded nel motore di calcolo o nella UI.
 */

export interface CommercialZoningLimits {
  evMaxSv: number; // 250 mq
  msvMinSvExclusive: number; // 250 mq
  msvMaxSvInclusive: number; // 1500 mq
  gsvMinSvInclusive: number; // 2500 mq
}

export interface PremialitaConfig {
  recredOrErsPct: number; // 30%
  concorsoArchitetturaPct: number; // 5%
  concorsoMinSt: number; // 5000 mq
  camEdiliziaPct: number; // 10%
  lr14_2019Allowed: boolean; // selezione separata senza percentuale
}

export interface UrbanZoningConfig {
  comune: string;
  zona: string;
  titoloZona: string;
  sogliaMinPercInZona: number; // 95%
  moltiplicatoreVolume: number; // 3.0 m
  indiceTerritorialeMinIt: number; // 0.5 mc/mq
  sogliaPuaSt: number; // 5000 mq
  altezzaMassima: number; // 15.0 m
  icMassimoPercSf: number; // 0.40 (40% di Sf)
  ipfMinimoPercSf: number; // 0.30 (30% di Sf)
  cessionePercSt: number; // 0.30 (30% di St)
  equivalenzaTettoVerdeRapporto: number; // 2 (1 mq TV = 2 mq permeabili a terra)
  mqPerAlbero: number; // 70 mq per albero
  distanze: {
    confiniMin: number; // 5 m
    confiniRapportoH: number; // 0.5 (H/2)
    traFabbricati: number; // 10 m
    strade: number; // 5 m
  };
  commerciale: CommercialZoningLimits;
  premialita: PremialitaConfig;
  notaCessione: string;
  proceduraSottoSoglia: string;
  proceduraSopraSoglia: string;
  disclaimer: string;
}

export const URBAN_ZONING_REGISTRY: Record<string, UrbanZoningConfig> = {
  'padova_c1': {
    comune: 'Padova',
    zona: 'C1',
    titoloZona: 'Zona C1 - Piano degli Interventi (Comune di Padova)',
    sogliaMinPercInZona: 95, // default 95%
    moltiplicatoreVolume: 3.0,
    indiceTerritorialeMinIt: 0.5,
    sogliaPuaSt: 5000,
    altezzaMassima: 15.0,
    icMassimoPercSf: 0.40,
    ipfMinimoPercSf: 0.30,
    cessionePercSt: 0.30,
    equivalenzaTettoVerdeRapporto: 2.0, // 1 mq TV = 2 mq permeabili a terra
    mqPerAlbero: 70,
    distanze: {
      confiniMin: 5.0,
      confiniRapportoH: 0.5,
      traFabbricati: 10.0,
      strade: 5.0,
    },
    commerciale: {
      evMaxSv: 250,
      msvMinSvExclusive: 250,
      msvMaxSvInclusive: 1500,
      gsvMinSvInclusive: 2500,
    },
    premialita: {
      recredOrErsPct: 30,
      concorsoArchitetturaPct: 5,
      concorsoMinSt: 5000,
      camEdiliziaPct: 10,
      lr14_2019Allowed: true,
    },
    notaCessione: 'Negli interventi con PCC/PUA. Possibile monetizzazione o mantenimento a verde privato inedificabile, secondo le condizioni previste.',
    proceduraSottoSoglia: 'PCC oppure IED con atto d\'obbligo',
    proceduraSopraSoglia: 'PUA obbligatorio',
    disclaimer: 'simulazione preliminare, non sostituisce la verifica del tecnico e degli strumenti urbanistici vigenti',
  },
};

/**
 * Normalizza la chiave di ricerca per comune e zona
 */
export function getZoningKey(comune?: string | null, zona?: string | null): string {
  const c = (comune || 'padova').trim().toLowerCase();
  const z = (zona || '').trim().toLowerCase();
  return `${c}_${z}`;
}

/**
 * Recupera la configurazione normativa associata a comune e zona
 */
export function getUrbanZoningConfig(comune?: string | null, zona?: string | null): UrbanZoningConfig | null {
  const key = getZoningKey(comune, zona);
  return URBAN_ZONING_REGISTRY[key] || null;
}

