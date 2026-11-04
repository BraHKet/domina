import React, { useEffect, useId, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FileCheck2,
  HelpCircle,
  Info,
  MapPin,
  UserCheck,
} from 'lucide-react';
import type { Property } from '../types/property.ts';
import {
  calculateUrbanParameters,
  type DestinazioneUso,
  type ModalitaIntervento,
  type PremialitaSelections,
  type UrbanCalculationOutput,
} from '../utils/urbanCalculationEngine.ts';
import { formatNumber, getLotData } from '../utils/urbanLot.ts';
import { DemolitionPlan, ExistingPlan } from './LotPlan.tsx';

type ActionType = 'analisi' | 'target' | 'proprietario';

interface PropertyFocusViewProps {
  property: Property;
  isAdmin: boolean;
  onBack: () => void;
  onRequestAction: (actionType: ActionType, property: Property) => void;
  onEditProperty: (property: Property) => void;
  onToggleVisibility: (property: Property) => void;
}

const NARROW_QUERY = '(max-width: 1199px)';
const DEFAULT_HEIGHT = 12;
const DEFAULT_SV = 800;
const MAX_SLIDER_HEIGHT = 20;
const MAX_SLIDER_SV = 3000;

const DESTINAZIONI: { value: DestinazioneUso; label: string }[] = [
  { value: 'residenziale', label: 'Residenziale' },
  { value: 'commerciale', label: 'Commerciale' },
  { value: 'direzionale', label: 'Direzionale' },
  { value: 'turistico_ricettiva', label: 'Turistico-ricettiva' },
];

function useIsNarrow(): boolean {
  const [isNarrow, setIsNarrow] = useState(() => window.matchMedia(NARROW_QUERY).matches);
  useEffect(() => {
    const query = window.matchMedia(NARROW_QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return isNarrow;
}

const percent = (fraction: number) => `${Math.round(fraction * 100)}%`;

export const PropertyFocusView: React.FC<PropertyFocusViewProps> = ({
  property,
  isAdmin,
  onBack,
  onRequestAction,
  onEditProperty,
  onToggleVisibility,
}) => {
  const isNarrow = useIsNarrow();
  const [leftOpen, setLeftOpen] = useState(!isNarrow);
  const [rightOpen, setRightOpen] = useState(!isNarrow);

  // Su schermi stretti le due schede non ci stanno affiancate: se ne apre una alla volta
  const [layoutWasNarrow, setLayoutWasNarrow] = useState(isNarrow);
  if (layoutWasNarrow !== isNarrow) {
    setLayoutWasNarrow(isNarrow);
    setLeftOpen(!isNarrow);
    setRightOpen(!isNarrow);
  }

  const toggleLeft = () => {
    setLeftOpen((open) => !open);
    if (isNarrow) setRightOpen(false);
  };
  const toggleRight = () => {
    setRightOpen((open) => !open);
    if (isNarrow) setLeftOpen(false);
  };

  // Parametri della simulazione: scelti dall'utente, mai salvati sul lotto
  const lotData = useMemo(() => getLotData(property), [property]);
  const [destinazione, setDestinazione] = useState<DestinazioneUso>('residenziale');
  const [modalita, setModalita] = useState<ModalitaIntervento>('demolizione');
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [covScelta, setCovScelta] = useState<number | null>(null);
  const [tv, setTv] = useState(0);
  const [sv, setSv] = useState(DEFAULT_SV);
  const [premialita, setPremialita] = useState<PremialitaSelections>({});

  const result = useMemo(
    () =>
      calculateUrbanParameters(lotData, {
        destinazione,
        modalita,
        sv,
        h: height,
        covScelta,
        tv,
        premialita,
      }),
    [lotData, destinazione, modalita, sv, height, covScelta, tv, premialita]
  );

  const demolizione = result.status === 'valid' ? result.demolizione : undefined;
  const mantenimento = result.status === 'valid' ? result.mantenimento : undefined;
  const config = result.zonaConfig;
  const isCommerciale = destinazione === 'commerciale';
  const isAttivo = property.activityStatus === 'attivo' || property.status === 'Attivo';

  const concorsoAbilitato = !!config && (lotData.st ?? 0) >= config.premialita.concorsoMinSt;
  const bonusOptions = config
    ? [
        { key: 'recredOrErs' as const, label: 'Crediti edilizi o ERS', badge: `+${config.premialita.recredOrErsPct}%`, enabled: true },
        {
          key: 'concorsoArchitettura' as const,
          label: 'Concorso di architettura',
          badge: `+${config.premialita.concorsoArchitetturaPct}%`,
          enabled: concorsoAbilitato,
          hint: concorsoAbilitato ? undefined : `Solo da ${formatNumber(config.premialita.concorsoMinSt)} m²`,
        },
        { key: 'camEdilizia' as const, label: 'CAM Edilizia', badge: `+${config.premialita.camEdiliziaPct}%`, enabled: true },
        { key: 'lr14_2019' as const, label: 'L.R. 14/2019 (Veneto 2050)', badge: 'Info', enabled: true },
      ]
    : [];

  return (
    <>
      <div className="domina-focus-actions">
        <button type="button" onClick={onBack} className="domina-floating-button" aria-label="Torna alla vista precedente">
          <ArrowLeft className="w-4 h-4" />
          <span>Indietro</span>
        </button>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${property.coordinates[0]},${property.coordinates[1]}`}
          target="_blank"
          rel="noopener noreferrer"
          className="domina-floating-button"
          aria-label="Apri in Google Maps, in una nuova scheda"
        >
          <span>Google Maps</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* SCHEDA SINISTRA: immagine, pianta del lotto e variabili */}
      <aside className="domina-panel domina-panel-left" data-open={leftOpen} aria-label="Simulazione del lotto">
        <div className="domina-panel-card" inert={!leftOpen}>
          <div className="relative h-32 flex-none bg-slate-200">
            <img src={property.image} alt={property.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            {isAdmin && (
              <div className="absolute top-14 right-3 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onEditProperty(property)}
                  className="domina-image-button"
                  title="Modifica questo pin"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Modifica</span>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleVisibility(property)}
                  className="domina-image-button"
                  title="Modifica visibilità per l'utente"
                >
                  {property.isVisibleToUser !== false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  <span>{property.isVisibleToUser !== false ? 'Pubblico' : 'Nel pallino'}</span>
                </button>
              </div>
            )}
            <div className="absolute left-3.5 right-3.5 bottom-2.5 text-white">
              <h2 className="text-[15px] font-bold leading-tight truncate">{property.name}</h2>
              <p className="mt-0.5 text-[11px] text-white/85 flex items-center gap-1">
                <MapPin className="w-3 h-3 flex-none" />
                <span className="truncate">{property.address}</span>
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-100" role="group" aria-label="Tipo di intervento">
                {(
                  [
                    ['demolizione', 'Demolisci e ricostruisci'],
                    ['mantenimento', "Mantieni l'esistente"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={modalita === value}
                    onClick={() => setModalita(value)}
                    className={`px-1.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                      modalita === value ? 'bg-white text-[#0d6e5a] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="flex items-center justify-between gap-3 text-xs text-slate-600">
                <span className="font-medium">Destinazione</span>
                <select
                  value={destinazione}
                  onChange={(e) => setDestinazione(e.target.value as DestinazioneUso)}
                  className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0d6e5a]"
                >
                  {DESTINAZIONI.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {(demolizione || mantenimento) && (
              <section className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <h3 className="domina-section-title">{demolizione ? 'Cosa puoi costruire' : 'Cosa c’è oggi'}</h3>
                  {demolizione && (
                    <span className="text-[11px] text-slate-500">Lotto {formatNumber(demolizione.st)} m²</span>
                  )}
                </div>
                {demolizione && <DemolitionPlan result={demolizione} />}
                {mantenimento && <ExistingPlan result={mantenimento} />}
              </section>
            )}

            {(demolizione || isCommerciale) && (
              <section className="space-y-3.5">
                <h3 className="domina-section-title">Regola il progetto</h3>
                {isCommerciale && (
                  <Slider
                    label="Superficie di vendita"
                    value={sv}
                    min={0}
                    max={MAX_SLIDER_SV}
                    step={10}
                    unit="m²"
                    onChange={setSv}
                    hint={result.ammissibilita.verdettoTestuale}
                    danger={result.ammissibilita.verdettoTestuale.includes('vietato')}
                  />
                )}
                {demolizione && (
                  <>
                    <Slider
                      label="Altezza"
                      value={height}
                      min={3}
                      max={MAX_SLIDER_HEIGHT}
                      step={0.5}
                      unit="m"
                      onChange={setHeight}
                      danger={demolizione.distanze.hViolated}
                      hint={
                        demolizione.distanze.hViolated
                          ? `Supera il limite di ${demolizione.distanze.hMax} m`
                          : `Distanza dai confini: almeno ${demolizione.distanze.dc} m`
                      }
                    />
                    <Slider
                      label="Superficie coperta"
                      value={Math.min(covScelta ?? Math.round(demolizione.covMax), Math.round(demolizione.covMax))}
                      min={1}
                      max={Math.max(1, Math.round(demolizione.covMax))}
                      step={1}
                      unit="m²"
                      onChange={(value) =>
                        setCovScelta(value >= Math.round(demolizione.covMax) ? null : value)
                      }
                      hint={`Massimo ${formatNumber(demolizione.covMax)} m²`}
                    />
                    <Slider
                      label="Tetto verde"
                      value={Math.min(tv, Math.round(demolizione.covSceltaApplicata))}
                      min={0}
                      max={Math.max(1, Math.round(demolizione.covSceltaApplicata))}
                      step={1}
                      unit="m²"
                      onChange={setTv}
                      hint={`1 m² vale ${config?.equivalenzaTettoVerdeRapporto ?? ''} m² di verde a terra`}
                    />
                  </>
                )}
              </section>
            )}

            {demolizione && (
              <section className="space-y-1.5">
                <h3 className="domina-section-title">Premialità</h3>
                {bonusOptions.map((option) => (
                  <label
                    key={option.key}
                    className={`flex items-center gap-2.5 py-1 text-xs ${
                      option.enabled ? 'cursor-pointer text-slate-800' : 'text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={option.enabled && !!premialita[option.key]}
                      disabled={!option.enabled}
                      onChange={(e) => setPremialita((prev) => ({ ...prev, [option.key]: e.target.checked }))}
                      className="w-4 h-4 flex-none accent-[#0d6e5a]"
                    />
                    <span className="flex-1 min-w-0">
                      {option.label}
                      {option.hint && <span className="block text-[10px]">{option.hint}</span>}
                    </span>
                    <span className="font-semibold text-[11px] text-slate-500">{option.badge}</span>
                  </label>
                ))}
              </section>
            )}
          </div>
        </div>
        <PanelHandle side="left" open={leftOpen} onClick={toggleLeft} label="scheda del progetto" />
      </aside>

      {/* SCHEDA DESTRA: indici calcolati */}
      <aside className="domina-panel domina-panel-right" data-open={rightOpen} aria-label="Indici calcolati">
        <div className="domina-panel-card" inert={!rightOpen}>
          <ResultsPanel
            property={property}
            result={result}
            isAttivo={isAttivo}
            existing={{ st: lotData.st, slp: lotData.slp, cop: lotData.cop, sco: lotData.sco }}
            zona={lotData.zona || 'C1'}
            percInZona={lotData.perc_in_zona ?? 100}
          />
        </div>
        <PanelHandle side="right" open={rightOpen} onClick={toggleRight} label="scheda degli indici" />
      </aside>

      {/* I TRE BOTTONI, SEMPRE VISIBILI IN BASSO AL CENTRO */}
      <div className="domina-action-bar">
        <button type="button" onClick={() => onRequestAction('analisi', property)} className="domina-action bg-[#0d6e5a] hover:bg-[#095747] text-white">
          <FileCheck2 className="w-3.5 h-3.5 flex-none" />
          <span>Perizia completa</span>
        </button>
        <button type="button" onClick={() => onRequestAction('target', property)} className="domina-action bg-slate-900 hover:bg-black text-white">
          <HelpCircle className="w-3.5 h-3.5 flex-none text-amber-400" />
          <span>A chi proporla?</span>
        </button>
        <button type="button" onClick={() => onRequestAction('proprietario', property)} className="domina-action bg-white hover:bg-slate-100 text-slate-900">
          <UserCheck className="w-3.5 h-3.5 flex-none text-sky-600" />
          <span>Trova il proprietario</span>
        </button>
      </div>
    </>
  );
};

const PanelHandle: React.FC<{ side: 'left' | 'right'; open: boolean; onClick: () => void; label: string }> = ({
  side,
  open,
  onClick,
  label,
}) => {
  const pointsLeft = (side === 'left') === open;
  return (
    <button
      type="button"
      onClick={onClick}
      className="domina-panel-handle"
      aria-expanded={open}
      aria-label={`${open ? 'Nascondi' : 'Mostra'} ${label}`}
      title={`${open ? 'Nascondi' : 'Mostra'} ${label}`}
    >
      {pointsLeft ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
    </button>
  );
};

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
  hint?: string;
  danger?: boolean;
}> = ({ label, value, min, max, step, unit, onChange, hint, danger }) => {
  const id = useId();
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const shown = value.toLocaleString('it-IT');
  return (
    <div className={danger ? 'domina-slider-danger' : undefined}>
      <div className="flex items-baseline justify-between mb-1">
        <label htmlFor={id} className="text-xs font-medium text-slate-700">
          {label}
        </label>
        <output htmlFor={id} className={`text-xs font-bold ${danger ? 'text-rose-700' : 'text-slate-900'}`}>
          {shown} {unit}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={`${shown} ${unit}`}
        className="domina-range"
        style={{ '--fill': `${fill}%` } as React.CSSProperties}
      />
      {hint && <p className={`mt-0.5 text-[11px] ${danger ? 'text-rose-700 font-semibold' : 'text-slate-500'}`}>{hint}</p>}
    </div>
  );
};

const Tile: React.FC<{ label: string; value: string; highlighted?: boolean; note?: string }> = ({ label, value, highlighted, note }) => (
  <div className={`rounded-lg p-2.5 ${highlighted ? 'bg-emerald-50 ring-1 ring-[#0d6e5a]/40' : 'bg-slate-50'}`}>
    <span className="block text-[11px] text-slate-500 leading-tight">{label}</span>
    <span className="block mt-0.5 text-sm font-bold text-slate-900">{value}</span>
    {note && <span className="block text-[10px] font-semibold text-[#0d6e5a]">{note}</span>}
  </div>
);

const ResultsPanel: React.FC<{
  property: Property;
  result: UrbanCalculationOutput;
  isAttivo: boolean;
  existing: { st?: number | null; slp?: number | null; cop?: number | null; sco?: number | null };
  zona: string;
  percInZona: number;
}> = ({ property, result, isAttivo, existing, zona, percInZona }) => {
  const d = result.status === 'valid' ? result.demolizione : undefined;
  const m = result.status === 'valid' ? result.mantenimento : undefined;
  const config = result.zonaConfig;
  const verdict = result.ammissibilita.verdettoTestuale;
  const forbidden = result.ammissibilita.isCommerciale && verdict.includes('vietato');
  const existingSlp = existing.slp ?? 0;
  const usesExistingSlp = !!d && existingSlp >= (d.slpMin ?? 0);

  return (
    <>
      <div className="flex-none px-3.5 pt-3.5 pb-2.5 border-b border-slate-100">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-bold text-slate-900">Cosa puoi fare</h2>
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-semibold text-slate-600">
            Zona {zona}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
          <span>{property.categoryLabel}</span>
          <span aria-hidden="true">·</span>
          <span className={isAttivo ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
            {isAttivo ? 'Attivo' : 'Dismesso'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {result.status !== 'valid' && (
          <div className="p-3 rounded-lg bg-amber-50 text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-none mt-0.5 text-amber-600" />
            <div className="text-xs">
              <p className="font-bold">
                {result.status === 'unsupported_zone' && 'Zona non supportata'}
                {result.status === 'multi_zone_manual_check' && 'Lotto in più zone: verifica manuale'}
                {result.status === 'missing_data' && 'Mancano dei dati'}
              </p>
              <p className="mt-0.5">
                {result.status === 'unsupported_zone' && 'Il calcolo automatico è attivo solo per la Zona C1 di Padova.'}
                {result.status === 'multi_zone_manual_check' &&
                  `Il ${percInZona}% del lotto ricade in zona, sotto la soglia del ${config?.sogliaMinPercInZona}%.`}
                {result.status === 'missing_data' && result.missingFields.join(', ')}
              </p>
            </div>
          </div>
        )}

        {forbidden && (
          <div className="p-3 rounded-lg bg-rose-50 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-none text-rose-600" />
            <span>{verdict}</span>
          </div>
        )}

        {d && (
          <>
            <section className="rounded-xl bg-[#0d6e5a] text-white p-3.5">
              <span className="block text-[11px] font-medium text-emerald-100">
                {d.isCommerciale ? 'SLP realizzabile' : 'Volume realizzabile'}
              </span>
              <span className="block text-3xl font-extrabold tracking-tight leading-tight">
                {d.isCommerciale ? `${formatNumber(d.slpProgetto)} m²` : `${formatNumber(d.volFinale)} m³`}
              </span>
              {!d.isCommerciale && (
                <span className="block text-sm font-semibold">SLP massima {formatNumber(d.slpProgetto)} m²</span>
              )}
              <span className="mt-2 block text-[11px] text-emerald-50">
                {d.procedura}
                {d.pctPremialita > 0 && ` · premialità +${d.pctPremialita}% inclusa`}
                {d.lr14Applicata && ' · L.R. 14/2019'}
              </span>
            </section>

            <section className="space-y-1.5">
              <h3 className="domina-section-title">SLP di partenza</h3>
              <div className="grid grid-cols-2 gap-2">
                <Tile
                  label="Esistente"
                  value={`${formatNumber(existingSlp)} m²`}
                  highlighted={usesExistingSlp}
                  note={usesExistingSlp ? 'Usata: è la maggiore' : undefined}
                />
                <Tile
                  label={`Da indice ${String(config?.indiceTerritorialeMinIt ?? '').replace('.', ',')}`}
                  value={`${formatNumber(d.slpMin)} m²`}
                  highlighted={!usesExistingSlp}
                  note={!usesExistingSlp ? 'Usata: è la maggiore' : undefined}
                />
              </div>
            </section>

            <section className="space-y-1.5">
              <h3 className="domina-section-title">Limiti del lotto</h3>
              <div className="grid grid-cols-2 gap-2">
                <Tile label="Superficie fondiaria" value={`${formatNumber(d.sf)} m²`} />
                <Tile
                  label={`Cessione (${config ? percent(config.cessionePercSt) : ''} del lotto)`}
                  value={`${formatNumber(d.cessione)} m²`}
                />
                <Tile
                  label={`Coperto massimo (${config ? percent(config.icMassimoPercSf) : ''} Sf)`}
                  value={`${formatNumber(d.covMax)} m²`}
                />
                <Tile
                  label={`Verde minimo (${config ? percent(config.ipfMinimoPercSf) : ''} Sf)`}
                  value={`${formatNumber(d.permMin)} m²`}
                />
              </div>
            </section>

            <section className="space-y-1.5">
              <h3 className="domina-section-title">Distanze minime</h3>
              <div className="grid grid-cols-3 gap-2">
                <Tile label="Confini" value={d.distanze.dc !== null ? `${String(d.distanze.dc).replace('.', ',')} m` : '—'} />
                <Tile label="Edifici" value={`${d.distanze.df} m`} />
                <Tile label="Strade" value={`${d.distanze.ds} m`} />
              </div>
            </section>

            <p className="text-[11px] leading-snug text-slate-500">
              <strong className="font-semibold text-slate-600">Cessione:</strong> {d.notaCessione}
            </p>
          </>
        )}

        {m && (
          <>
            <section className="rounded-xl bg-[#0d6e5a] text-white p-3.5">
              <span className="block text-[11px] font-medium text-emerald-100">Procedura</span>
              <span className="block text-lg font-extrabold leading-tight">{m.procedura}</span>
              <span className="mt-1.5 block text-[11px] text-emerald-50">{m.nota}</span>
            </section>
            <section className="space-y-1.5">
              <h3 className="domina-section-title">Stato di fatto</h3>
              <div className="grid grid-cols-2 gap-2">
                <Tile label="Coperto" value={`${formatNumber(m.cop)} m²`} />
                <Tile label="Scoperto" value={`${formatNumber(m.sco)} m²`} />
                <Tile label="SLP" value={m.slp !== null ? `${formatNumber(m.slp)} m²` : '—'} />
                <Tile label="Volume" value={m.vol !== null ? `${formatNumber(m.vol)} m³` : '—'} />
              </div>
            </section>
          </>
        )}

        {d && (
          <section className="space-y-1.5">
            <h3 className="domina-section-title">Oggi sul lotto</h3>
            <div className="grid grid-cols-3 gap-2">
              <Tile label="Lotto" value={`${formatNumber(existing.st)} m²`} />
              <Tile label="Coperto" value={existing.cop !== null && existing.cop !== undefined ? `${formatNumber(existing.cop)} m²` : '—'} />
              <Tile label="Scoperto" value={existing.sco !== null && existing.sco !== undefined ? `${formatNumber(existing.sco)} m²` : '—'} />
            </div>
          </section>
        )}

        <p className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-500">
          <Info className="w-3 h-3 flex-none mt-px" />
          <span>Simulazione preliminare: non sostituisce la verifica del tecnico e degli strumenti urbanistici vigenti.</span>
        </p>
      </div>
    </>
  );
};
