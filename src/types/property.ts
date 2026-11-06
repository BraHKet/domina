export type PropertyCategory = 'negozi' | 'capannoni' | 'altri';
export type ActivityStatus = 'dismesso' | 'attivo';

export interface BusinessHealthData {
  revenueTrend: { year: string; revenue: number; margin: number }[];
  activityDescription: string;
}

export interface TargetProposal {
  targetCategory: string;
  brands: string[];
  matchScore: number;
  reason: string;
  estimatedReturn: string;
}

export type ValueSourceType = 'misurato' | 'stimato' | 'da documento';

export interface FieldReliability {
  source?: ValueSourceType;
  reliability?: 'bassa' | 'media' | 'alta';
  note?: string;
}

export interface UrbanLotData {
  zona: string; // es. "C1"
  comune?: string; // es. "Padova"
  perc_in_zona?: number | null; // percentuale 0-100 (es. 100)
  st?: number | null; // Superficie territoriale (mq)
  slp?: number | null; // SLP esistente (mq)
  cop?: number | null; // Superficie coperta esistente (mq)
  sco?: number | null; // Superficie scoperta esistente (mq)
  vol?: number | null; // Volume esistente (mc), opzionale
  fonti_affidabilita?: {
    st?: FieldReliability;
    slp?: FieldReliability;
    cop?: FieldReliability;
    sco?: FieldReliability;
    vol?: FieldReliability;
  };
}

export type LatLngPoint = [number, number]; // [lat, lng]
// Primo anello: contorno esterno. Gli altri: eventuali buchi interni.
export type GeoPolygon = LatLngPoint[][];

export interface CadastralParcel {
  id: string; // es. "G224_002500.327"
  comune: string; // codice catastale del comune, es. "G224" (Padova)
  foglio: string;
  particella: string;
  polygons: GeoPolygon[];
}

export interface LotBoundary {
  parcels: CadastralParcel[];
  outline: GeoPolygon[]; // particelle unite, senza linee interne
  areaSqm: number; // superficie del disegno catastale, non sostituisce la St
  source: string;
  updatedAt: string;
}

export interface Property {
  id: string;
  name: string;
  code: string;
  address: string;
  district: string;
  city: string;
  coordinates: [number, number]; // [lat, lng]
  category: PropertyCategory;
  categoryLabel: string;
  status: string; // "Dismesso" | "Attivo"
  activityStatus: ActivityStatus; // "dismesso" | "attivo"
  isVisibleToUser: boolean; // ADMIN controls visibility
  condition?: string;
  statusBadgeColor?: 'amber' | 'emerald' | 'rose' | 'blue';
  
  // Metriche dimensionali
  coveredAreaSqm: number | null; // mq coperti
  lotAreaSqm: number | null; // mq totali / lotto
  externalAreaSqm?: number | null;
  clearHeightMeters?: number | null;
  
  // Descrizioni e contesto
  image: string;
  description: string;
  context?: string;
  opportunityNotes: string;
  surroundingContext: string;
  accessibilityNotes: string;

  // Dati Salute Attività (per immobili "attivo")
  businessHealth?: BusinessHealthData;

  // Dati "Dimmi a chi proporla"
  targetProposals?: TargetProposal[];

  // Dati Proprietario
  ownerNotes?: string;

  // Analisi Urbanistica dimostrativa
  urbanPlanning: {
    patClassification: string;
    piZoning: string;
    allowedUses: string[];
    verifiedStatus: 'Verifica preliminare effettuata' | 'Dato da verificare in sede tecnica';
    heritageConstraints: string;
    bufferZones: string;
    environmentalNotes: string;
    criticalIssues: string[];
    strengths: string[];
    sources: string;
    elaborationDate: string;
  };

  // Dati Urbanistici Reali del Lotto (Piano degli Interventi)
  urbanLotData?: UrbanLotData;

  // Confini del lotto dalle particelle catastali (scelti in Admin)
  lotBoundary?: LotBoundary;

  // Dossier PDF
  pdfPath: string;
  pdfFileName: string;
  pdfSize: string;
  isDemonstrative: boolean;
}

export type ClickSource =
  | 'analisi_urbanistica'
  | 'dimmi_a_chi_proporla'
  | 'trova_proprietario'
  | 'cluster_riservato';

export interface ClickEvent {
  id: string;
  source: ClickSource;
  sourceLabel: string;
  propertyName?: string;
  propertyAddress?: string;
  timestamp: string;
  userCity?: string;
  device?: string;
  referrer?: string;
  timeOnSite?: string;
}

export interface ClickStats {
  totalClicks: number;
  bySource: Record<ClickSource, number>;
}

export interface LeadSubmission {
  id: string;
  email: string;
  timestamp: string;
  source: ClickSource | string;
  sourceLabel?: string;
  propertyName?: string;
  hiddenCount?: number;
  city: string;
  userCity?: string;
  device?: string;
  referrer?: string;
  timeOnSite?: string;
}

