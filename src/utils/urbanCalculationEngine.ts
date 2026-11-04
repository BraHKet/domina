import type { UrbanLotData } from '../types/property.ts';
import {
  getUrbanZoningConfig,
  type UrbanZoningConfig,
} from '../config/urbanZoningConfig.ts';

export type DestinazioneUso =
  | 'residenziale'
  | 'commerciale'
  | 'direzionale'
  | 'turistico_ricettiva';

export type ModalitaIntervento = 'demolizione' | 'mantenimento';

export interface PremialitaSelections {
  recredOrErs?: boolean; // +30%
  concorsoArchitettura?: boolean; // +5% (solo se St >= 5.000)
  camEdilizia?: boolean; // +10%
  lr14_2019?: boolean; // Selezione separata senza percentuale
}

export interface UserUrbanSimulationInput {
  destinazione: DestinazioneUso;
  modalita: ModalitaIntervento;
  sv?: number | null; // Superficie di vendita per commerciale (mq)
  h?: number | null; // Altezza edificio di progetto (m)
  premialita?: PremialitaSelections;
  covScelta?: number | null; // Superficie coperta scelta dall'utente (mq, opzionale)
  tv?: number | null; // Tetto verde (mq, opzionale)
}

export type CommercialVerdict =
  | 'EV consentito'
  | 'MSV consentito'
  | 'MSV oltre 1.500 vietato'
  | 'GSV vietato'
  | 'dato mancante';

export interface DistanzeResult {
  dc: number | null; // Confini: max(5, H/2)
  df: number; // Tra fabbricati: 10 m
  ds: number; // Strade: 5 m
  hViolated: boolean; // true se H > 15.0 m
  hMax: number;
}

export interface MantenimentoResult {
  procedura: string; // "IED"
  cop: number;
  sco: number;
  vol: number | null;
  slp: number | null;
  nota: string;
}

export interface DemolizioneResult {
  procedura: string; // "PCC oppure IED con atto d'obbligo" | "PUA obbligatorio"
  pctPremialita: number; // Somma %
  pctConcorsoApplicato: boolean; // se il 5% è stato applicato o escluso per St < 5000
  k: number; // 1 + Pct/100
  lr14Applicata: boolean;

  // Capacità edificatoria
  isCommerciale: boolean;
  volSLP?: number;
  volIt?: number;
  volBase?: number;
  volFinale?: number; // Volume finale per non commerciali (mc)
  slpMin?: number;
  slpBase?: number;
  slpProgetto?: number; // SLP finale: max(SLP esistente, SLP da indice) * k (mq)

  // Superfici
  st: number;
  sf: number; // St * 0.70
  cessione: number; // St * 0.30
  notaCessione: string;
  covMax: number; // Sf * 0.40
  permMin: number; // Sf * 0.30
  covSceltaApplicata: number; // min(CovScelta, CovMax) oppure CovMax
  tv: number; // min(TV, Cov)
  permTerra: number; // max(0, PermMin - TV * 2)
  libero: number; // Sf - PermTerra
  covEff: number; // max(0, min(Cov, Libero))
  parcheggi: number; // max(0, Sf - PermTerra - CovEff)
  alberi: number; // Math.ceil((Sf - CovEff) / 70)

  // Distanze
  distanze: DistanzeResult;
}

export interface UrbanCalculationOutput {
  status: 'valid' | 'missing_data' | 'unsupported_zone' | 'multi_zone_manual_check';
  message?: string;
  missingFields: string[];
  zonaConfig?: UrbanZoningConfig | null;

  // Verdetto ammissibilità destinazione
  ammissibilita: {
    destinazione: DestinazioneUso;
    destinazioneLabel: string;
    verdettoTestuale: string;
    isCommerciale: boolean;
    commercialVerdict?: CommercialVerdict;
  };

  // Risultati specifici per modalità
  modalita: ModalitaIntervento;
  mantenimento?: MantenimentoResult;
  demolizione?: DemolizioneResult;

  // Disclaimer obbligatorio
  disclaimer: string;
}

/**
 * Valida un numero: deve essere non nullo, non NaN e >= 0
 */
function isValidPositiveNumber(val: unknown): val is number {
  return typeof val === 'number' && !isNaN(val) && isFinite(val) && val >= 0;
}

/**
 * Motore di calcolo puro per l'analisi urbanistica (Zona C1 Padova)
 */
export function calculateUrbanParameters(
  lotData: UrbanLotData | null | undefined,
  userInput: UserUrbanSimulationInput,
  overrideConfig?: UrbanZoningConfig | null
): UrbanCalculationOutput {
  const disclaimer =
    'simulazione preliminare, non sostituisce la verifica del tecnico e degli strumenti urbanistici vigenti';

  const destinazioneLabels: Record<DestinazioneUso, string> = {
    residenziale: 'Residenziale',
    commerciale: 'Commerciale',
    direzionale: 'Direzionale',
    turistico_ricettiva: 'Turistico-ricettiva',
  };

  const isCommerciale = userInput.destinazione === 'commerciale';

  // 1. Controllo presenza dati del lotto e configurazione di zona
  const zonaInput = lotData?.zona?.trim();
  const comuneInput = lotData?.comune || 'Padova';
  const config = overrideConfig || getUrbanZoningConfig(comuneInput, zonaInput);

  // Default ammissibilità
  const buildAmmissibilita = (commercialVerdict?: CommercialVerdict) => {
    let verdetto = 'selezionabile';
    if (isCommerciale) {
      verdetto = commercialVerdict || 'dato mancante';
    }
    return {
      destinazione: userInput.destinazione,
      destinazioneLabel: destinazioneLabels[userInput.destinazione],
      verdettoTestuale: verdetto,
      isCommerciale,
      commercialVerdict,
    };
  };

  if (!config) {
    return {
      status: 'unsupported_zone',
      message: 'zona non supportata',
      missingFields: [],
      zonaConfig: null,
      ammissibilita: buildAmmissibilita(),
      modalita: userInput.modalita,
      disclaimer,
    };
  }

  // 2. Controllo percentuale lotto nella zona (default soglia 95%)
  const percInZona =
    lotData?.perc_in_zona !== undefined && lotData?.perc_in_zona !== null
      ? Number(lotData.perc_in_zona)
      : 100;

  if (isNaN(percInZona) || percInZona < config.sogliaMinPercInZona) {
    return {
      status: 'multi_zone_manual_check',
      message: 'lotto in più zone: verifica manuale',
      missingFields: [],
      zonaConfig: config,
      ammissibilita: {
        destinazione: userInput.destinazione,
        destinazioneLabel: destinazioneLabels[userInput.destinazione],
        verdettoTestuale: 'lotto in più zone: verifica manuale',
        isCommerciale,
      },
      modalita: userInput.modalita,
      disclaimer,
    };
  }

  // 3. Valutazione ammissibilità commerciale se richiesta
  let commercialVerdict: CommercialVerdict | undefined = undefined;
  if (isCommerciale) {
    const sv = userInput.sv;
    if (!isValidPositiveNumber(sv)) {
      commercialVerdict = 'dato mancante';
    } else if (sv <= config.commerciale.evMaxSv) {
      commercialVerdict = 'EV consentito';
    } else if (
      sv > config.commerciale.msvMinSvExclusive &&
      sv <= config.commerciale.msvMaxSvInclusive
    ) {
      commercialVerdict = 'MSV consentito';
    } else if (
      sv > config.commerciale.msvMaxSvInclusive &&
      sv < config.commerciale.gsvMinSvInclusive
    ) {
      commercialVerdict = 'MSV oltre 1.500 vietato';
    } else if (sv >= config.commerciale.gsvMinSvInclusive) {
      commercialVerdict = 'GSV vietato';
    }
  }

  const ammissibilita = buildAmmissibilita(commercialVerdict);

  // 4. Verifica campi obbligatori per modalità
  const missingFields: string[] = [];

  if (userInput.modalita === 'demolizione') {
    if (!isValidPositiveNumber(lotData?.st)) missingFields.push('St (superficie territoriale)');
    if (!isValidPositiveNumber(lotData?.slp)) missingFields.push('SLP (SLP esistente)');
  } else {
    // Mantenimento
    if (!isValidPositiveNumber(lotData?.cop)) missingFields.push('Cop (superficie coperta esistente)');
    if (!isValidPositiveNumber(lotData?.sco)) missingFields.push('Sco (superficie scoperta esistente)');
  }

  if (isCommerciale && commercialVerdict === 'dato mancante') {
    missingFields.push('Sv (superficie di vendita)');
  }

  if (missingFields.length > 0) {
    return {
      status: 'missing_data',
      message: `Campi obbligatori mancanti: ${missingFields.join(', ')}`,
      missingFields,
      zonaConfig: config,
      ammissibilita,
      modalita: userInput.modalita,
      disclaimer,
    };
  }

  // ---------------- MODALITÀ MANTENIMENTO ----------------
  if (userInput.modalita === 'mantenimento') {
    const cop = Number(lotData!.cop);
    const sco = Number(lotData!.sco);
    const vol = isValidPositiveNumber(lotData?.vol) ? Number(lotData!.vol) : null;
    const slp = isValidPositiveNumber(lotData?.slp) ? Number(lotData!.slp) : null;

    return {
      status: 'valid',
      missingFields: [],
      zonaConfig: config,
      ammissibilita,
      modalita: 'mantenimento',
      mantenimento: {
        procedura: 'Intervento tramite IED',
        cop,
        sco,
        vol,
        slp,
        nota: 'Volume, SLP, H, IC e Ipf restano allo stato di fatto. Nessun altro calcolo.',
      },
      disclaimer,
    };
  }

  // ---------------- MODALITÀ DEMOLIZIONE E RICOSTRUZIONE ----------------
  const st = Number(lotData!.st);
  const slp = Number(lotData!.slp);

  // Calcolo Premialità
  let pct = 0;
  let concorsoApplicato = false;

  if (userInput.premialita?.recredOrErs) {
    pct += config.premialita.recredOrErsPct; // +30%
  }

  // Concorso di architettura (+5%): conta solo se St >= 5.000 mq
  if (userInput.premialita?.concorsoArchitettura) {
    if (st >= config.premialita.concorsoMinSt) {
      pct += config.premialita.concorsoArchitetturaPct; // +5%
      concorsoApplicato = true;
    }
  }

  if (userInput.premialita?.camEdilizia) {
    pct += config.premialita.camEdiliziaPct; // +10%
  }

  const k = 1 + pct / 100;
  const lr14Applicata = !!userInput.premialita?.lr14_2019;

  // Procedura attuativa
  const procedura =
    st < config.sogliaPuaSt ? config.proceduraSottoSoglia : config.proceduraSopraSoglia;

  // Capacità edificatoria
  let volSLP: number | undefined;
  let volIt: number | undefined;
  let volBase: number | undefined;
  let volFinale: number | undefined;
  let slpMin: number | undefined;
  let slpBase: number | undefined;
  let slpProgetto: number | undefined;

  // SLP di progetto per tutte le destinazioni: massimo tra SLP esistente e SLP da indice
  slpMin = (st * config.indiceTerritorialeMinIt) / config.moltiplicatoreVolume; // St * 0.5 / 3.0
  slpBase = Math.max(slp, slpMin);
  slpProgetto = slpBase * k;

  if (!isCommerciale) {
    // Non commerciale: anche il volume (il commerciale non ha limite di volume)
    volSLP = slp * config.moltiplicatoreVolume; // SLP * 3.0
    volIt = st * config.indiceTerritorialeMinIt; // St * 0.5
    volBase = Math.max(volSLP, volIt);
    volFinale = volBase * k;
  }

  // Superfici
  const sf = st * (1 - config.cessionePercSt); // Sf = St * (1 - 0.30) = St * 0.70
  const cessione = st * config.cessionePercSt; // St * 0.30

  const covMax = sf * config.icMassimoPercSf; // Sf * 0.40
  const permMin = sf * config.ipfMinimoPercSf; // Sf * 0.30

  // Cov = min(CovScelta, CovMax), oppure CovMax se CovScelta è vuoto
  const covScelta =
    isValidPositiveNumber(userInput.covScelta) && userInput.covScelta > 0
      ? userInput.covScelta
      : undefined;
  const cov = covScelta !== undefined ? Math.min(covScelta, covMax) : covMax;

  // TV = min(TV, Cov)
  const rawTV = isValidPositiveNumber(userInput.tv) ? userInput.tv : 0;
  const tv = Math.min(rawTV, cov);

  // PermTerra = max(0, PermMin - TV * 2)
  const permTerra = Math.max(0, permMin - tv * config.equivalenzaTettoVerdeRapporto);

  // Libero = Sf - PermTerra
  const libero = sf - permTerra;

  // CovEff = max(0, min(Cov, Libero))
  const covEff = Math.max(0, Math.min(cov, libero));

  // Parcheggi = max(0, Sf - PermTerra - CovEff)
  const parcheggi = Math.max(0, sf - permTerra - covEff);

  // Alberi = arrotonda per eccesso((Sf - CovEff) / 70), mai sotto zero
  const alberi = Math.max(0, Math.ceil((sf - covEff) / config.mqPerAlbero));

  // Distanze e verifica Altezza H
  const hInput = isValidPositiveNumber(userInput.h) ? userInput.h : null;
  const hViolated = hInput !== null && hInput > config.altezzaMassima;
  const dc =
    hInput !== null
      ? Math.max(config.distanze.confiniMin, hInput * config.distanze.confiniRapportoH)
      : null;

  const distanze: DistanzeResult = {
    dc,
    df: config.distanze.traFabbricati,
    ds: config.distanze.strade,
    hViolated,
    hMax: config.altezzaMassima,
  };

  return {
    status: 'valid',
    missingFields: [],
    zonaConfig: config,
    ammissibilita,
    modalita: 'demolizione',
    demolizione: {
      procedura,
      pctPremialita: pct,
      pctConcorsoApplicato: concorsoApplicato,
      k,
      lr14Applicata,
      isCommerciale,
      volSLP,
      volIt,
      volBase,
      volFinale,
      slpMin,
      slpBase,
      slpProgetto,
      st,
      sf,
      cessione,
      notaCessione: config.notaCessione,
      covMax,
      permMin,
      covSceltaApplicata: cov,
      tv,
      permTerra,
      libero,
      covEff,
      parcheggi,
      alberi,
      distanze,
    },
    disclaimer,
  };
}
