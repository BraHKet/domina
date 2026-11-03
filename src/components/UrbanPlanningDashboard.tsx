import React, { useState, useMemo } from 'react';
import type { Property, UrbanLotData } from '../types/property.ts';
import {
  calculateUrbanParameters,
  type DestinazioneUso,
  type ModalitaIntervento,
  type PremialitaSelections,
} from '../utils/urbanCalculationEngine.ts';
import {
  Building2,
  TreePine,
  Car,
  ShieldCheck,
  AlertTriangle,
  Info,
  Maximize,
  ArrowLeft,
  Sparkles,
  Layers,
  Ruler,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface UrbanPlanningDashboardProps {
  property: Property;
  onBack?: () => void;
  onRequestDossier?: (property: Property) => void;
  isEmbedded?: boolean;
}

export const UrbanPlanningDashboard: React.FC<UrbanPlanningDashboardProps> = ({
  property,
  onBack,
  onRequestDossier,
  isEmbedded = false,
}) => {
  // 1. Estrazione dati lotto dal modello immobile con fallback sicuri
  const lotData: UrbanLotData = useMemo(() => {
    if (property.urbanLotData) {
      return property.urbanLotData;
    }
    // Fallback con i campi base dell'immobile se urbanLotData non è ancora popolato
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
  }, [property]);

  // 2. Stati interattivi della simulazione (scelti dall'utente, NON salvati nel lotto)
  const [destinazione, setDestinazione] = useState<DestinazioneUso>('residenziale');
  const [modalita, setModalita] = useState<ModalitaIntervento>('demolizione');
  const [sv, setSv] = useState<number | ''>(destinazione === 'commerciale' ? 800 : '');
  const [h, setH] = useState<number | ''>(12);
  const [covScelta, setCovScelta] = useState<number | ''>('');
  const [tv, setTv] = useState<number | ''>('');

  const [premialita, setPremialita] = useState<PremialitaSelections>({
    recredOrErs: false,
    concorsoArchitettura: false,
    camEdilizia: false,
    lr14_2019: false,
  });

  // 3. Esecuzione del motore di calcolo puro (ricalcolo continuo, mai salvato su DB)
  const calculationResult = useMemo(() => {
    return calculateUrbanParameters(lotData, {
      destinazione,
      modalita,
      sv: sv === '' ? null : Number(sv),
      h: h === '' ? null : Number(h),
      covScelta: covScelta === '' ? null : Number(covScelta),
      tv: tv === '' ? null : Number(tv),
      premialita,
    });
  }, [lotData, destinazione, modalita, sv, h, covScelta, tv, premialita]);

  const isCommerciale = destinazione === 'commerciale';
  const st = lotData.st || 0;
  const concorsoAbilitato = st >= 5000;

  // Toggle premialità
  const handleTogglePremialita = (key: keyof PremialitaSelections) => {
    setPremialita((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const renderContent = () => (
    <div className={isEmbedded ? 'space-y-4 text-xs pt-1' : 'flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 text-xs'}>
      {/* Titolo e Intestazione Sezione */}
      <div className={`flex items-center justify-between ${isEmbedded ? 'border-t border-gray-200 pt-3' : 'border-b border-gray-100 pb-2'}`}>
        <div className="flex items-center space-x-1.5 text-[#0d6e5a] font-bold text-xs uppercase tracking-wider">
          <Building2 className="w-4 h-4" />
          <span>Analisi Urbanistica</span>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0d6e5a]/10 text-[#0d6e5a] border border-[#0d6e5a]/20">
          Zona {lotData.zona || 'C1'} - {lotData.comune || 'Padova'}
        </span>
      </div>

      {/* BOX STATO DI FATTO INSERITO DALL'ADMIN */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/90 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Dati di Fatto del Lotto</span>
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              % in zona: {lotData.perc_in_zona ?? 100}%
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="bg-white p-2 rounded-lg border border-slate-200/60 shadow-2xs">
              <span className="block text-[10px] text-gray-400 font-medium">St (Territoriale)</span>
              <span className="text-xs font-bold text-gray-900">
                {lotData.st ? `${lotData.st.toLocaleString('it-IT')} m²` : 'Non inserito'}
              </span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200/60 shadow-2xs">
              <span className="block text-[10px] text-gray-400 font-medium">SLP Esistente</span>
              <span className="text-xs font-bold text-gray-900">
                {lotData.slp !== null && lotData.slp !== undefined ? `${lotData.slp.toLocaleString('it-IT')} m²` : 'Non inserito'}
              </span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200/60 shadow-2xs">
              <span className="block text-[10px] text-gray-400 font-medium">Coperto (Cop)</span>
              <span className="text-xs font-bold text-gray-900">
                {lotData.cop !== null && lotData.cop !== undefined ? `${lotData.cop.toLocaleString('it-IT')} m²` : 'Non inserito'}
              </span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200/60 shadow-2xs">
              <span className="block text-[10px] text-gray-400 font-medium">Scoperto (Sco)</span>
              <span className="text-xs font-bold text-gray-900">
                {lotData.sco !== null && lotData.sco !== undefined ? `${lotData.sco.toLocaleString('it-IT')} m²` : 'Non inserito'}
              </span>
            </div>
          </div>
        </div>

        {/* FILTRI INTERATTIVI UTENTE */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs space-y-4">
          <div className="text-xs font-bold text-gray-900 flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#0d6e5a]" />
              <span>Parametri di Simulazione di Progetto</span>
            </span>
            <span className="text-[10px] font-normal text-gray-500">Non modificano il lotto</span>
          </div>

          {/* Modalità Intervento: Demolizione vs Mantenimento */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Modalità di Intervento
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModalita('demolizione')}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                  modalita === 'demolizione'
                    ? 'bg-[#0d6e5a] text-white border-[#0d6e5a] shadow-xs'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                Demolizione e Ricostruzione
              </button>
              <button
                type="button"
                onClick={() => setModalita('mantenimento')}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                  modalita === 'mantenimento'
                    ? 'bg-[#0d6e5a] text-white border-[#0d6e5a] shadow-xs'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                Mantenimento Esistente
              </button>
            </div>
          </div>

          {/* Destinazione d'Uso */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                Destinazione d'Uso
              </label>
              {/* Badge Ammissibilità */}
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center space-x-1 ${
                  calculationResult.ammissibilita.verdettoTestuale.includes('vietato')
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : calculationResult.ammissibilita.verdettoTestuale.includes('consentito')
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-sky-100 text-sky-800 border border-sky-200'
                }`}
              >
                {calculationResult.ammissibilita.verdettoTestuale.includes('vietato') ? (
                  <XCircle className="w-3 h-3 text-rose-600" />
                ) : (
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                )}
                <span>{calculationResult.ammissibilita.verdettoTestuale}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['residenziale', 'Residenziale'],
                  ['commerciale', 'Commerciale'],
                  ['direzionale', 'Direzionale'],
                  ['turistico_ricettiva', 'Turistico-ricettiva'],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setDestinazione(val)}
                  className={`py-1.5 px-2.5 rounded-lg text-xs font-medium border text-left flex items-center justify-between transition-colors ${
                    destinazione === val
                      ? 'border-[#0d6e5a] bg-[#0d6e5a]/10 text-[#0d6e5a] font-bold'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>{label}</span>
                  {destinazione === val && <span className="w-1.5 h-1.5 rounded-full bg-[#0d6e5a]" />}
                </button>
              ))}
            </div>

            {/* Se Commerciale: Input Sv (Superficie di Vendita) */}
            {isCommerciale && (
              <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-amber-900">
                    Sv - Superficie di Vendita (mq) *
                  </label>
                  <span className="text-[10px] text-amber-700 font-medium">
                    EV ≤ 250 | MSV ≤ 1.500 | GSV ≥ 2.500
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={sv}
                  onChange={(e) => setSv(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="es. 800"
                  className="w-full px-3 py-1.5 rounded-md border border-amber-300 bg-white text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#0d6e5a]"
                />
              </div>
            )}
          </div>

          {/* Parametri di Progetto: H, CovScelta, TV (visibili in demolizione) */}
          {modalita === 'demolizione' && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Altezza H */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-gray-700 uppercase">
                      H Progetto (m)
                    </label>
                    <span className="text-[9px] text-gray-400">Max 15 m</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={h}
                    onChange={(e) => setH(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="es. 12"
                    className={`w-full px-2.5 py-1.5 rounded-md border text-xs font-semibold ${
                      calculationResult.demolizione?.distanze.hViolated
                        ? 'border-rose-400 bg-rose-50 text-rose-900'
                        : 'border-gray-300 bg-white text-gray-900 focus:border-[#0d6e5a]'
                    }`}
                  />
                </div>

                {/* Coperto Scelto (opzionale) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-gray-700 uppercase">
                      Cov Scelta (mq)
                    </label>
                    <span className="text-[9px] text-gray-400">Opzionale</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={covScelta}
                    onChange={(e) =>
                      setCovScelta(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder={`Max ${
                      calculationResult.demolizione?.covMax
                        ? Math.round(calculationResult.demolizione.covMax)
                        : ''
                    }`}
                    className="w-full px-2.5 py-1.5 rounded-md border border-gray-300 bg-white text-xs font-semibold text-gray-900 focus:border-[#0d6e5a]"
                  />
                </div>

                {/* Tetto Verde TV (opzionale) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-gray-700 uppercase">
                      Tetto Verde TV (mq)
                    </label>
                    <span className="text-[9px] text-emerald-600 font-semibold">1 mq = 2 mq</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={tv}
                    onChange={(e) => setTv(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="es. 50"
                    className="w-full px-2.5 py-1.5 rounded-md border border-gray-300 bg-white text-xs font-semibold text-gray-900 focus:border-[#0d6e5a]"
                  />
                </div>
              </div>

              {calculationResult.demolizione?.distanze.hViolated && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-md text-[11px] text-rose-800 flex items-center space-x-1.5 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                  <span>Attenzione: Altezza {h} m supera il limite massimo di 15,0 m per la zona C1!</span>
                </div>
              )}

              {/* Selettore Premialità Edilizie */}
              <div className="pt-2">
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Premialità Edilizie Selezionabili
                </label>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => handleTogglePremialita('recredOrErs')}
                    className={`w-full p-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                      premialita.recredOrErs
                        ? 'border-[#0d6e5a] bg-emerald-50/70 text-gray-900 font-semibold'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-[11px]">Crediti edilizi (RECRED) o ERS (+30%)</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        premialita.recredOrErs
                          ? 'bg-[#0d6e5a] text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      +30%
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={!concorsoAbilitato}
                    onClick={() => handleTogglePremialita('concorsoArchitettura')}
                    className={`w-full p-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                      !concorsoAbilitato
                        ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-200'
                        : premialita.concorsoArchitettura
                        ? 'border-[#0d6e5a] bg-emerald-50/70 text-gray-900 font-semibold'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <span className="text-[11px] block">Concorso di architettura (+5%)</span>
                      {!concorsoAbilitato && (
                        <span className="text-[9px] text-gray-400 font-normal">
                          Applicabile solo se St ≥ 5.000 mq
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        premialita.concorsoArchitettura
                          ? 'bg-[#0d6e5a] text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      +5%
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTogglePremialita('camEdilizia')}
                    className={`w-full p-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                      premialita.camEdilizia
                        ? 'border-[#0d6e5a] bg-emerald-50/70 text-gray-900 font-semibold'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-[11px]">CAM Edilizia (+10%)</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        premialita.camEdilizia
                          ? 'bg-[#0d6e5a] text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      +10%
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTogglePremialita('lr14_2019')}
                    className={`w-full p-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                      premialita.lr14_2019
                        ? 'border-sky-500 bg-sky-50 text-gray-900 font-semibold'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-[11px]">Intervento L.R. 14/2019 (Veneto 2050)</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        premialita.lr14_2019
                          ? 'bg-sky-600 text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      Info
                    </span>
                  </button>
                </div>

                {/* Riepilogo Premialità */}
                <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-gray-700 px-1">
                  <span>Incremento premialità applicato:</span>
                  <span className="text-[#0d6e5a] font-bold">
                    +{calculationResult.demolizione?.pctPremialita ?? 0}% (moltiplicatore k ={' '}
                    {calculationResult.demolizione?.k ?? 1})
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* GESTIONE STATI SPECIALI / AVVISI DI DATI MANCANTI O SOGLIE */}
        {calculationResult.status === 'unsupported_zone' && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-2.5 text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-xs">Zona non supportata</span>
              <p className="text-[11px] text-amber-800 mt-0.5">
                I calcoli automatici sono attualmente attivi esclusivamente per i lotti in{' '}
                <strong>Zona C1 del Comune di Padova</strong>.
              </p>
            </div>
          </div>
        )}

        {calculationResult.status === 'multi_zone_manual_check' && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-2.5 text-amber-900">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-xs">Lotto in più zone: verifica manuale</span>
              <p className="text-[11px] text-amber-800 mt-0.5">
                La percentuale del lotto ricadente in Zona C1 ({lotData.perc_in_zona}%) è inferiore alla soglia minima (95%). È richiesta una perizia o verifica tecnica manuale prima di emettere un verdetto.
              </p>
            </div>
          </div>
        )}

        {calculationResult.status === 'missing_data' && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2.5 text-rose-900">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-xs">Dati obbligatori mancanti per il calcolo</span>
              <p className="text-[11px] text-rose-800 mt-0.5">{calculationResult.message}</p>
            </div>
          </div>
        )}

        {/* RISULTATI DEL CALCOLO: MANTENIMENTO */}
        {calculationResult.status === 'valid' && modalita === 'mantenimento' && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center space-x-2 text-emerald-800 font-bold border-b border-gray-150 pb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Risultati Intervento: Mantenimento Esistente</span>
            </div>

            <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-[11px] text-emerald-900 font-semibold">
              Strumento attuativo: {calculationResult.mantenimento?.procedura}
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              {calculationResult.mantenimento?.nota}
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-gray-500 font-medium block">Coperto di fatto</span>
                <span className="font-bold text-gray-900">
                  {calculationResult.mantenimento?.cop.toLocaleString('it-IT')} m²
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-gray-500 font-medium block">Scoperto di fatto</span>
                <span className="font-bold text-gray-900">
                  {calculationResult.mantenimento?.sco.toLocaleString('it-IT')} m²
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-gray-500 font-medium block">SLP di fatto</span>
                <span className="font-bold text-gray-900">
                  {calculationResult.mantenimento?.slp !== null
                    ? `${calculationResult.mantenimento?.slp?.toLocaleString('it-IT')} m²`
                    : 'Non inserita'}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-gray-500 font-medium block">Volume di fatto</span>
                <span className="font-bold text-gray-900">
                  {calculationResult.mantenimento?.vol !== null
                    ? `${calculationResult.mantenimento?.vol?.toLocaleString('it-IT')} mc`
                    : 'Non inserito'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* RISULTATI DEL CALCOLO: DEMOLIZIONE E RICOSTRUZIONE */}
        {calculationResult.status === 'valid' && modalita === 'demolizione' && (
          <div className="space-y-4">
            {/* Box Capacità Edificatoria & Strumento */}
            <div className="bg-gradient-to-br from-[#0d6e5a]/10 via-white to-emerald-50/40 rounded-xl border border-[#0d6e5a]/25 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#0d6e5a]/15 pb-2">
                <div className="flex items-center space-x-1.5">
                  <Maximize className="w-4 h-4 text-[#0d6e5a]" />
                  <span className="font-bold text-xs text-gray-900">Capacità Edificatoria Massima</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0d6e5a] text-white">
                  {calculationResult.demolizione?.procedura}
                </span>
              </div>

              {!isCommerciale ? (
                /* Non commerciale: Volume finale */
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[10px] text-gray-500 font-medium block">
                      Volume Finale Concesso
                    </span>
                    <span className="text-xl font-extrabold text-[#0d6e5a]">
                      {calculationResult.demolizione?.volFinale
                        ? `${Math.round(calculationResult.demolizione.volFinale).toLocaleString(
                            'it-IT'
                          )} mc`
                        : '-'}
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      VolBase: {Math.round(calculationResult.demolizione?.volBase || 0).toLocaleString('it-IT')} mc × {calculationResult.demolizione?.k}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 font-medium block">
                      SLP di riferimento
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {lotData.slp ? `${lotData.slp.toLocaleString('it-IT')} m²` : '-'}
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      It min (0,5): {Math.round((lotData.st || 0) * 0.5).toLocaleString('it-IT')} mc
                    </span>
                  </div>
                </div>
              ) : (
                /* Commerciale: SLP di progetto */
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[10px] text-gray-500 font-medium block">
                      SLP di Progetto Concessa
                    </span>
                    <span className="text-xl font-extrabold text-[#0d6e5a]">
                      {calculationResult.demolizione?.slpProgetto
                        ? `${(calculationResult.demolizione.slpProgetto).toLocaleString('it-IT', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} m²`
                        : '-'}
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      (nessun limite di volume)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 font-medium block">
                      SLP Minima Garantita
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {calculationResult.demolizione?.slpMin
                        ? `${(calculationResult.demolizione.slpMin).toLocaleString('it-IT', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} m²`
                        : '-'}
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      k premialità: {calculationResult.demolizione?.k}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* TABELLA METRICHE URBANISTICHE */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs space-y-3">
              <span className="text-xs font-bold text-gray-900 flex items-center space-x-1.5 border-b border-gray-100 pb-2">
                <Ruler className="w-3.5 h-3.5 text-gray-600" />
                <span>Bilancio Superfici & Dotazioni Edilizie</span>
              </span>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Superficie Fondiaria */}
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-gray-500 block">Sf (Fondiaria - 70% St)</span>
                  <span className="font-bold text-gray-900">
                    {Math.round(calculationResult.demolizione?.sf || 0).toLocaleString('it-IT')} m²
                  </span>
                </div>

                {/* Cessione */}
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-gray-500 block">Cessione (30% St)</span>
                  <span className="font-bold text-gray-900">
                    {Math.round(calculationResult.demolizione?.cessione || 0).toLocaleString('it-IT')} m²
                  </span>
                </div>

                {/* Coperto Massimo e Simulato */}
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-gray-500 block">Coperto Max (CovMax 40%)</span>
                  <span className="font-bold text-gray-900">
                    {Math.round(calculationResult.demolizione?.covMax || 0).toLocaleString('it-IT')} m²
                  </span>
                  <span className="text-[9px] text-[#0d6e5a] block font-semibold">
                    Simulato effettivo: {Math.round(calculationResult.demolizione?.covEff || 0).toLocaleString('it-IT')} m²
                  </span>
                </div>

                {/* Permeabile Minimo e Terra */}
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-gray-500 block">Permeabile Min (30% Sf)</span>
                  <span className="font-bold text-gray-900">
                    {Math.round(calculationResult.demolizione?.permMin || 0).toLocaleString('it-IT')} m²
                  </span>
                  <span className="text-[9px] text-emerald-700 block font-semibold">
                    A terra: {Math.round(calculationResult.demolizione?.permTerra || 0).toLocaleString('it-IT')} m²
                    {(calculationResult.demolizione?.tv || 0) > 0 && ` (TV: ${calculationResult.demolizione?.tv} m²)`}
                  </span>
                </div>

                {/* Parcheggi */}
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center space-x-2">
                  <Car className="w-4 h-4 text-sky-600 flex-shrink-0" />
                  <div>
                    <span className="text-[10px] text-gray-500 block">Parcheggi / Piazzali</span>
                    <span className="font-bold text-gray-900">
                      {Math.round(calculationResult.demolizione?.parcheggi || 0).toLocaleString('it-IT')} m²
                    </span>
                  </div>
                </div>

                {/* Alberi */}
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center space-x-2">
                  <TreePine className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div>
                    <span className="text-[10px] text-gray-500 block">Dotazione Alberi</span>
                    <span className="font-bold text-gray-900">
                      {calculationResult.demolizione?.alberi} alberature
                    </span>
                    <span className="text-[9px] text-gray-400 block">1 ogni 70 m² scoperti</span>
                  </div>
                </div>
              </div>

              {/* Distanze di Legge */}
              <div className="pt-2 border-t border-gray-150">
                <span className="text-[11px] font-bold text-gray-700 block mb-1">
                  Distanze Minime di Rispetto
                </span>
                <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div className="bg-gray-50 p-1.5 rounded border border-gray-200">
                    <span className="text-gray-400 block">Confini (Dc)</span>
                    <span className="font-bold text-gray-800">
                      {calculationResult.demolizione?.distanze.dc !== null
                        ? `≥ ${calculationResult.demolizione?.distanze.dc} m`
                        : '≥ 5 m'}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-1.5 rounded border border-gray-200">
                    <span className="text-gray-400 block">Fabbricati (Df)</span>
                    <span className="font-bold text-gray-800">≥ 10 m</span>
                  </div>
                  <div className="bg-gray-50 p-1.5 rounded border border-gray-200">
                    <span className="text-gray-400 block">Strade (Ds)</span>
                    <span className="font-bold text-gray-800">≥ 5 m</span>
                  </div>
                </div>
              </div>

              {/* Nota Cessione specifica del Piano degli Interventi */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[10px] text-gray-500 italic">
                <strong>Nota cessione:</strong> {calculationResult.demolizione?.notaCessione}
              </div>
            </div>

            {/* SIMULAZIONE GRAFICA SCHEMATICA E PROPORZIONALE */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-xs font-bold text-gray-900 flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#0d6e5a]" />
                  <span>Ripartizione Schematica del Lotto (Quadrato = St)</span>
                </span>
                <span className="text-[10px] font-medium text-gray-400">
                  St = {Math.round(st).toLocaleString('it-IT')} m²
                </span>
              </div>

              {/* Visualizzatore Grafico Proporzionale SVG */}
              {(() => {
                const d = calculationResult.demolizione!;
                const totalSt = Math.max(d.st, 1);
                const pctCessione = Math.min(100, Math.max(0, (d.cessione / totalSt) * 100));
                const pctCov = Math.min(100, Math.max(0, (d.covEff / totalSt) * 100));
                const pctPerm = Math.min(100, Math.max(0, (d.permTerra / totalSt) * 100));
                const pctPark = Math.min(100, Math.max(0, (d.parcheggi / totalSt) * 100));

                return (
                  <div className="space-y-3">
                    {/* Rappresentazione Schematica Quadrata Proporzionale */}
                    <div className="w-full aspect-square max-w-[280px] mx-auto rounded-xl border-2 border-gray-800 bg-slate-50 p-1.5 flex flex-col shadow-inner overflow-hidden">
                      {/* Blocco 1: Cessione (30% St in alto) */}
                      <div
                        style={{ height: `${pctCessione}%` }}
                        className="w-full bg-amber-500/80 border border-amber-600 rounded-md flex items-center justify-center text-white text-[10px] font-bold transition-all duration-300 relative group"
                        title={`Cessione a standard: ${Math.round(d.cessione)} m² (${pctCessione.toFixed(1)}%)`}
                      >
                        <span className="truncate px-1">
                          Cessione ({Math.round(d.cessione)} m² • {pctCessione.toFixed(0)}%)
                        </span>
                      </div>

                      {/* Blocco Inferiore (70% St = Sf) suddiviso orizzontalmente/verticalmente */}
                      <div
                        style={{ height: `${100 - pctCessione}%` }}
                        className="w-full pt-1.5 grid grid-cols-2 gap-1.5 flex-1"
                      >
                        {/* Colonna Sinistra: Coperto Effettivo */}
                        <div className="flex flex-col h-full">
                          <div
                            style={{
                              height: `${Math.min(100, Math.max(20, (pctCov / (100 - pctCessione)) * 100))}%`,
                            }}
                            className="w-full bg-slate-800 border border-slate-900 rounded-md flex flex-col items-center justify-center text-white text-[10px] font-bold p-1 transition-all duration-300"
                            title={`Coperto effettivo: ${Math.round(d.covEff)} m²`}
                          >
                            <StoreIcon className="w-3 h-3 text-amber-400 mb-0.5" />
                            <span className="text-[9px] truncate">Coperto</span>
                            <span className="text-[8px] font-normal text-slate-300">
                              {Math.round(d.covEff)} m²
                            </span>
                          </div>
                        </div>

                        {/* Colonna Destra: Permeabile a Terra + Parcheggi */}
                        <div className="flex flex-col h-full gap-1">
                          {/* Permeabile a terra */}
                          <div
                            style={{
                              height: `${Math.min(100, Math.max(25, (pctPerm / (100 - pctCessione)) * 100))}%`,
                            }}
                            className="w-full bg-emerald-600 border border-emerald-700 rounded-md flex flex-col items-center justify-center text-white text-[10px] font-bold p-1 transition-all duration-300"
                            title={`Permeabile a terra: ${Math.round(d.permTerra)} m²`}
                          >
                            <TreePine className="w-3 h-3 text-emerald-200 mb-0.5" />
                            <span className="text-[9px] truncate">Verde terra</span>
                            <span className="text-[8px] font-normal text-emerald-100">
                              {Math.round(d.permTerra)} m²
                            </span>
                          </div>

                          {/* Parcheggi e Piazzali */}
                          <div className="w-full flex-1 bg-sky-600 border border-sky-700 rounded-md flex flex-col items-center justify-center text-white text-[10px] font-bold p-1 transition-all duration-300">
                            <Car className="w-3 h-3 text-sky-200 mb-0.5" />
                            <span className="text-[9px] truncate">Parcheggi</span>
                            <span className="text-[8px] font-normal text-sky-100">
                              {Math.round(d.parcheggi)} m²
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Legenda Colori Proporzionale */}
                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                      <div className="flex items-center space-x-1.5 text-gray-700">
                        <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 flex-shrink-0" />
                        <span>Cessione: {pctCessione.toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-gray-700">
                        <span className="w-2.5 h-2.5 rounded-xs bg-slate-800 flex-shrink-0" />
                        <span>Coperto: {pctCov.toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-gray-700">
                        <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 flex-shrink-0" />
                        <span>Verde terra: {pctPerm.toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-gray-700">
                        <span className="w-2.5 h-2.5 rounded-xs bg-sky-600 flex-shrink-0" />
                        <span>Parcheggi: {pctPark.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* AVVISO DI LEGGE OBBLIGATORIO BEN VISIBILE */}
        <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl flex items-start space-x-2 text-slate-700">
          <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] font-medium leading-relaxed italic">
            "{calculationResult.disclaimer}"
          </p>
        </div>
    </div>
  );

  if (isEmbedded) {
    return renderContent();
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white text-gray-800 overflow-hidden">
      {/* Top Header con pulsante Indietro */}
      <div className="flex-none px-4 py-3 border-b border-gray-150 flex items-center justify-between bg-slate-50/90 backdrop-blur-xs">
        <button
          onClick={onBack}
          className="flex items-center space-x-1.5 text-xs font-bold text-gray-700 hover:text-[#0d6e5a] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Torna alla scheda</span>
        </button>

        <div className="flex items-center space-x-1.5">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0d6e5a]/10 text-[#0d6e5a] border border-[#0d6e5a]/20">
            Zona {lotData.zona || 'C1'} - {lotData.comune || 'Padova'}
          </span>
        </div>
      </div>

      {renderContent()}

      {/* Footer Azione */}
      <div className="p-4 bg-white border-t border-gray-150 flex-none flex items-center justify-between">
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
          >
            Chiudi analisi
          </button>
        )}

        {onRequestDossier && (
          <button
            onClick={() => onRequestDossier(property)}
            className="px-4 py-2 rounded-xl bg-[#0d6e5a] hover:bg-[#095747] text-white font-bold text-xs shadow-xs transition-all flex items-center space-x-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Richiedi Perizia Completa</span>
          </button>
        )}
      </div>
    </div>
  );
};

function StoreIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
      <path d="M2 7h20" />
      <path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7" />
    </svg>
  );
}

