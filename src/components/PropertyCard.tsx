import React, { useState } from 'react';
import type { Property } from '../types/property';
import {
  X,
  MapPin,
  Store,
  Maximize2,
  Disc,
  FileText,
  Compass,
  FileCheck2,
  HelpCircle,
  UserCheck,
  Activity,
  ArrowLeft,
  TrendingUp,
  Edit3,
  Eye,
  EyeOff,
} from 'lucide-react';

interface PropertyCardProps {
  property: Property | null;
  isAdmin: boolean;
  onClose: () => void;
  onRequestAction: (actionType: 'analisi' | 'target' | 'proprietario', property: Property) => void;
  onEditProperty?: (property: Property) => void;
  onToggleVisibility?: (property: Property) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  isAdmin,
  onClose,
  onRequestAction,
  onEditProperty,
  onToggleVisibility,
}) => {
  const [viewMode, setViewMode] = useState<'normal' | 'health'>('normal');

  if (!property) return null;

  const isAttivo = property.activityStatus === 'attivo' || property.status === 'Attivo';
  const health = property.businessHealth;

  return (
    <div
      className="absolute top-4 right-4 sm:right-6 bottom-4 sm:bottom-6 w-[calc(100%-2rem)] sm:w-[420px] md:w-[430px] max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border border-gray-200/80 z-20 flex flex-col overflow-hidden text-gray-800 transition-all animate-fade-in"
      role="dialog"
      aria-label={`Dettagli ${property.name}`}
    >
      {/* ---------------- VIEW MODE 1: NORMAL VIEW ---------------- */}
      {viewMode === 'normal' ? (
        <>
          {/* Top Image with Close Button and Admin Quick Bar */}
          <div className="relative h-48 sm:h-52 w-full flex-shrink-0 bg-gray-100">
            <img
              src={property.image}
              alt={property.name}
              className="w-full h-full object-cover"
              loading="eager"
            />

            {/* Admin Badge & Controls overlay */}
            {isAdmin && (
              <div className="absolute top-3 left-3 flex items-center space-x-1.5">
                <button
                  onClick={() => onEditProperty?.(property)}
                  className="px-2.5 py-1 rounded-lg bg-gray-900/85 hover:bg-black text-white text-[11px] font-semibold flex items-center space-x-1 backdrop-blur-sm shadow-md transition-all"
                  title="Modifica questo pin"
                >
                  <Edit3 className="w-3 h-3 text-emerald-400" />
                  <span>Modifica</span>
                </button>

                <button
                  onClick={() => onToggleVisibility?.(property)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center space-x-1 backdrop-blur-sm shadow-md transition-all ${property.isVisibleToUser !== false
                    ? 'bg-emerald-900/85 text-emerald-200 hover:bg-emerald-800'
                    : 'bg-amber-900/85 text-amber-200 hover:bg-amber-800'
                    }`}
                  title="Modifica visibilità per l'utente"
                >
                  {property.isVisibleToUser !== false ? (
                    <>
                      <Eye className="w-3 h-3" />
                      <span>Pubblico</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3 h-3" />
                      <span>Nel Pallino</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Close Button at top-right of image */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition-colors shadow-md"
              title="Chiudi scheda"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Card Body */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {/* Title & Address */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight leading-snug">
                {property.name}
              </h2>
              <div className="mt-1 flex items-center text-xs text-gray-500 space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span>{property.address}</span>
              </div>
            </div>

            {/* Category & Status Tags */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-sky-50 text-sky-600 border border-sky-100">
                {property.categoryLabel}
              </span>

              {/* Dicitura Dismesso o Attivo */}
              <span
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center space-x-1 ${isAttivo
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${isAttivo ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                />
                <span>{isAttivo ? 'Attivo' : 'Dismesso'}</span>
              </span>

              {/* Se Attivo -> Pulsante Stato di salute attività */}
              {isAttivo && (
                <button
                  onClick={() => setViewMode('health')}
                  className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#0d6e5a] hover:bg-[#095747] text-white flex items-center space-x-1 shadow-xs transition-colors"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Stato di salute attività</span>
                </button>
              )}
            </div>

            {/* Metric Boxes (Superficie coperta & Metri quadri totali) */}
            <div className="grid grid-cols-2 gap-3">
              {/* Superficie coperta */}
              <div className="bg-[#f8fafc] border border-gray-100 rounded-xl p-3 flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 flex-shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] text-gray-500 font-normal">Superficie coperta</div>
                  <div className="text-sm font-bold text-gray-900">
                    {property.coveredAreaSqm !== null ? `${property.coveredAreaSqm} m²` : 'Dato non disponibile'}
                  </div>
                </div>
              </div>

              {/* Metri quadri totali / Superficie lotto */}
              <div className="bg-[#f8fafc] border border-gray-100 rounded-xl p-3 flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 flex-shrink-0">
                  <Maximize2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] text-gray-500 font-normal">Metri quadri totali</div>
                  <div className="text-sm font-bold text-gray-900">
                    {property.lotAreaSqm !== null ? `${property.lotAreaSqm} m²` : 'Dato non disponibile'}
                  </div>
                </div>
              </div>
            </div>

            {/* Stato row */}
            <div className="flex items-center space-x-3 pt-1">
              <Disc className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <div>
                <div className="text-[11px] text-gray-400 font-normal">Stato</div>
                <div className="text-xs font-semibold text-gray-800">
                  {property.condition || (isAttivo ? 'In esercizio' : 'Da ristrutturare')}
                </div>
              </div>
            </div>

            {/* Descrizione row */}
            <div className="flex items-start space-x-3 pt-1">
              <FileText className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-gray-900 mb-1">Descrizione</div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {property.description}
                </p>
              </div>
            </div>

            {/* Contesto row */}
            <div className="flex items-start space-x-3 pt-1">
              <Compass className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-gray-900 mb-1">Contesto</div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {property.context || property.surroundingContext}
                </p>
              </div>
            </div>
          </div>

          {/* Footer Action Buttons: THREE BUTTONS */}
          <div className="p-4 bg-white border-t border-gray-100 flex-none space-y-2">
            {/* Row 1: Vedi analisi urbanistica & Dimmi a chi proporla */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onRequestAction('analisi', property)}
                className="w-full py-2.5 px-2 rounded-xl flex items-center justify-center space-x-1.5 bg-[#0d6e5a] hover:bg-[#095747] text-white font-semibold text-xs tracking-tight shadow-xs transition-all"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span className="truncate">Analisi urbanistica</span>
              </button>

              <button
                onClick={() => onRequestAction('target', property)}
                className="w-full py-2.5 px-2 rounded-xl flex items-center justify-center space-x-1.5 bg-gray-900 hover:bg-black text-white font-semibold text-xs tracking-tight shadow-xs transition-all"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                <span className="truncate">A chi proporla?</span>
              </button>
            </div>

            {/* Row 2: Trova il proprietario */}
            <button
              onClick={() => onRequestAction('proprietario', property)}
              className="w-full py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-gray-800 font-semibold text-xs tracking-tight transition-all border border-gray-200"
            >
              <UserCheck className="w-3.5 h-3.5 text-sky-600" />
              <span>Trova il proprietario</span>
            </button>
          </div>
        </>
      ) : (
        /* ---------------- VIEW MODE 2: HEALTH STATUS VIEW ---------------- */
        <div className="flex-1 flex flex-col h-full bg-white">
          {/* Top Bar with Back Button */}
          <div className="flex-none px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-slate-50/80">
            <button
              onClick={() => setViewMode('normal')}
              className="flex items-center space-x-1.5 text-xs font-bold text-gray-700 hover:text-[#0d6e5a] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Torna alla scheda</span>
            </button>

            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
              Attività Attiva
            </span>
          </div>

          {/* Health Content & Charts (Clean & Reduced to the bone) */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
            {/* Header info */}
            <div>
              <div className="flex items-center space-x-1.5 text-emerald-700 font-bold text-xs uppercase tracking-wider mb-0.5">
                <Activity className="w-4 h-4" />
                <span>Stato di salute attività</span>
              </div>
              <h3 className="text-base font-bold text-gray-900">{property.name}</h3>
              <p className="text-gray-500 text-[11px]">{property.address}</p>
            </div>

            {/* CHART: Andamento Fatturato & Margine (Ultimi 3 anni) */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-800 uppercase tracking-wide flex items-center space-x-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#0d6e5a]" />
                  <span>Andamento Fatturato & Margine</span>
                </span>
                <span className="text-[10px] font-semibold text-gray-400">Ultimi 3 anni</span>
              </div>

              {/* Bar Chart Visualization */}
              <div className="space-y-2.5 pt-1">
                {(health?.revenueTrend || [
                  { year: '2023', revenue: 950000, margin: 14 },
                  { year: '2024', revenue: 990000, margin: 15 },
                  { year: '2025', revenue: 1040000, margin: 16 },
                ]).map((item, idx, arr) => {
                  const maxRev = Math.max(...arr.map((r) => r.revenue), 1000);
                  const barPercent = Math.min(Math.round((item.revenue / maxRev) * 100), 100);
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-gray-700">{item.year}</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-gray-900">
                            € {item.revenue.toLocaleString('it-IT')}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${item.margin >= 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                              }`}
                          >
                            {item.margin >= 0 ? `+${item.margin}%` : `${item.margin}%`}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${barPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Short Editable Activity Description (Replacing the old two blocks) */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-[11px] font-bold text-gray-800 uppercase tracking-wide block">
                Descrizione attività
              </span>
              <p className="text-xs text-gray-700 leading-relaxed bg-white p-3 rounded-lg border border-gray-200">
                {health?.activityDescription ||
                  'Attività commerciale in regolare esercizio con clientela fidelizzata, fatturato in crescita e canone sostenibile.'}
              </p>
            </div>
          </div>

          {/* Footer Back Button */}
          <div className="p-4 bg-white border-t border-gray-100 flex-none">
            <button
              onClick={() => setViewMode('normal')}
              className="w-full py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Torna alla schermata normale</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
