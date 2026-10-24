import React, { useState } from 'react';
import {
  X,
  Mail,
  Download,
  Trash2,
  Calendar,
  ShieldCheck,
  MousePointerClick,
  FileCheck2,
  HelpCircle,
  UserCheck,
  Lock,
  TrendingUp,
  BarChart3,
  RotateCcw,
  Cloud,
  CheckCircle2,
  Copy,
  Send,
  RefreshCw,
  MapPin,
  Smartphone,
  Clock,
  Compass,
} from 'lucide-react';
import type { LeadSubmission, ClickEvent, ClickStats } from '../types/property';
import { deleteStoredLead, clearStoredClicks, getStoredClicks, getClickStats } from '../utils/storage';
import {
  getGoogleSheetWebhookUrl,
  setGoogleSheetWebhookUrl,
  syncLeadToGoogleSheet,
  fetchRemoteGoogleSheetData,
  APPS_SCRIPT_TEMPLATE,
} from '../utils/googleSheets';

interface AdminLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: LeadSubmission[];
  onLeadsUpdated: (leads: LeadSubmission[]) => void;
}

export const AdminLeadsModal: React.FC<AdminLeadsModalProps> = ({
  isOpen,
  onClose,
  leads,
  onLeadsUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'leads' | 'clicks' | 'sheets'>('leads');
  const [clicks, setClicks] = useState<ClickEvent[]>(() => getStoredClicks());
  const [clickStats, setClickStats] = useState<ClickStats>(() => getClickStats());

  // Google Sheets state
  const [sheetWebhookUrl, setSheetWebhookUrl] = useState<string>(() => getGoogleSheetWebhookUrl());
  const [isUrlSaved, setIsUrlSaved] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  if (!isOpen) return null;

  const refreshData = () => {
    setClicks(getStoredClicks());
    setClickStats(getClickStats());
  };

  const handleDeleteLead = (id: string) => {
    const updated = deleteStoredLead(id);
    onLeadsUpdated(updated);
  };

  const handleClearClicks = () => {
    if (confirm('Vuoi azzerare la cronologia e i contatori dei clic?')) {
      clearStoredClicks();
      refreshData();
    }
  };

  const handleSaveSheetUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleSheetWebhookUrl(sheetWebhookUrl);
    setIsUrlSaved(true);
    setTimeout(() => setIsUrlSaved(false), 3000);
  };

  const handleTestGoogleSheet = async () => {
    if (!sheetWebhookUrl.trim()) {
      setTestStatus('Inserisci prima l\'URL del Webhook di Google Apps Script.');
      return;
    }
    setIsTesting(true);
    setTestStatus('Invio test in corso a Google Sheets...');
    const testLead: LeadSubmission = {
      id: `test-${Date.now()}`,
      email: 'test.investitore@domina-realestate.it',
      source: 'analisi_urbanistica',
      sourceLabel: 'TEST Connessione Google Sheets',
      propertyName: 'Test Immobile Padova Centro',
      timestamp: new Date().toLocaleString('it-IT'),
      city: 'Padova',
    };
    const success = await syncLeadToGoogleSheet(testLead);
    setIsTesting(false);
    if (success) {
      setTestStatus('✅ Inviato con successo! Controlla il tuo Foglio Google: la riga di test è stata aggiunta.');
    } else {
      setTestStatus('⚠️ Errore durante l\'invio. Verifica che la Web App di Google sia distribuita con accesso "Chiunque".');
    }
  };

  const handleSyncRemoteData = async () => {
    setIsSyncing(true);
    try {
      const remote = await fetchRemoteGoogleSheetData();
      if (remote && remote.leads) {
        onLeadsUpdated(remote.leads);
        if (remote.clicks) setClicks(remote.clicks);
        alert(`Sincronizzazione completata! Trovati ${remote.leads.length} lead e ${remote.clicks?.length || 0} clic su Google Sheets.`);
      } else {
        alert('Impossibile recuperare i dati remoti o nessun dato trovato. Verifica la configurazione della Web App.');
      }
    } catch (err) {
      alert('Errore durante la sincronizzazione: ' + String(err));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const handleExportCSV = () => {
    if (leads.length === 0) return;
    const headers =
      'ID,Email,Data e Ora,Pulsante Cliccato,Immobile / Contesto,Citta Immobile,Citta Utente (Geo-IP),Dispositivo,Provenienza,Tempo sul Sito\n';
    const rows = leads
      .map(
        (l) =>
          `"${l.id}","${l.email}","${l.timestamp}","${l.sourceLabel || l.source}","${
            l.propertyName || (l.hiddenCount ? `${l.hiddenCount} immobili riservati` : '')
          }","${l.city}","${l.userCity || 'Sconosciuta'}","${l.device || 'Desktop'}","${
            l.referrer || 'Accesso Diretto'
          }","${l.timeOnSite || '0 sec'}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `domina-leads-tracking-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helper badge color & icon based on source
  const getSourceBadge = (source: string | undefined, sourceLabel?: string) => {
    switch (source) {
      case 'analisi_urbanistica':
      case 'Analisi urbanistica':
        return {
          icon: <FileCheck2 className="w-3 h-3 text-emerald-600" />,
          label: sourceLabel || 'Vedi analisi urbanistica',
          badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        };
      case 'dimmi_a_chi_proporla':
      case 'Dimmi a chi proporla':
        return {
          icon: <HelpCircle className="w-3 h-3 text-amber-500" />,
          label: sourceLabel || 'Dimmi a chi proporla',
          badgeClass: 'bg-slate-900 text-amber-300 border-slate-700',
        };
      case 'trova_proprietario':
      case 'Trova il proprietario':
        return {
          icon: <UserCheck className="w-3 h-3 text-sky-600" />,
          label: sourceLabel || 'Trova il proprietario',
          badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
        };
      case 'cluster_riservato':
      case 'Opportunità riservate':
      default:
        return {
          icon: <Lock className="w-3 h-3 text-purple-600" />,
          label: sourceLabel || 'Pin cluster riservati',
          badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
        };
    }
  };

  const totalClicksCount = clickStats.totalClicks;
  const conversionRate =
    totalClicksCount > 0 ? Math.min(Math.round((leads.length / totalClicksCount) * 100), 100) : 0;
  const isSheetConfigured = Boolean(sheetWebhookUrl && sheetWebhookUrl.trim().length > 10);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden text-gray-800 max-h-[92vh] sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-none px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0d6e5a]/10 border border-[#0d6e5a]/30 flex items-center justify-center text-[#0d6e5a] flex-shrink-0">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight">
                  Tracciamento Clic & Lead Raccolti
                </h3>
                {isSheetConfigured ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center space-x-1">
                    <Cloud className="w-2.5 h-2.5" />
                    <span className="hidden sm:inline">Google Sheets Connesso</span>
                    <span className="sm:hidden">Sheets Connesso</span>
                  </span>
                ) : (
                  <button
                    onClick={() => setActiveTab('sheets')}
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 flex items-center space-x-1 transition-colors"
                  >
                    <Cloud className="w-2.5 h-2.5" />
                    <span>Collega Google Sheets</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                Tieni traccia di chi lascia la mail e di quanti cliccano sui diversi pulsanti dell'app
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top KPI Cards (Quanti & Chi Summary) */}
        <div className="flex-none px-4 sm:px-6 py-3 sm:py-3.5 bg-slate-50/70 border-b border-gray-100">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {/* KPI 1: Clic Totali (Quanti) */}
            <div className="p-3 bg-white rounded-xl border border-gray-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                  Clic Totali
                </span>
                <MousePointerClick className="w-4 h-4 text-[#0d6e5a]" />
              </div>
              <div className="text-xl font-extrabold text-gray-900 mt-0.5">
                {totalClicksCount}
              </div>
              <span className="text-[10px] text-gray-400">sui pulsanti di sblocco</span>
            </div>

            {/* KPI 2: Lead Raccolti (Chi) */}
            <div className="p-3 bg-white rounded-xl border border-gray-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                  Lead Raccolti
                </span>
                <Mail className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-xl font-extrabold text-gray-900 mt-0.5">{leads.length}</div>
              <span className="text-[10px] text-gray-400">email acquisite</span>
            </div>

            {/* KPI 3: Tasso Conversione */}
            <div className="p-3 bg-white rounded-xl border border-gray-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                  Conversione
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-extrabold text-emerald-700 mt-0.5">
                {conversionRate}%
              </div>
              <span className="text-[10px] text-gray-400">da clic a email inserita</span>
            </div>
          </div>

          {/* Breakdown per singolo pulsante (Quanti) */}
          <div className="mt-3 pt-2.5 border-t border-gray-200/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            {/* Button 1 */}
            <div className="p-2 rounded-lg bg-white border border-gray-200">
              <div className="flex items-center space-x-1.5 text-gray-600 font-medium">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span className="truncate">Analisi Urb.</span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="font-bold text-gray-900 text-xs">
                  {clickStats.bySource.analisi_urbanistica} clic
                </span>
                <span className="text-[10px] text-gray-400 font-semibold">
                  {totalClicksCount > 0
                    ? Math.round((clickStats.bySource.analisi_urbanistica / totalClicksCount) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>

            {/* Button 2 */}
            <div className="p-2 rounded-lg bg-white border border-gray-200">
              <div className="flex items-center space-x-1.5 text-gray-600 font-medium">
                <HelpCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span className="truncate">A chi proporla</span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="font-bold text-gray-900 text-xs">
                  {clickStats.bySource.dimmi_a_chi_proporla} clic
                </span>
                <span className="text-[10px] text-gray-400 font-semibold">
                  {totalClicksCount > 0
                    ? Math.round((clickStats.bySource.dimmi_a_chi_proporla / totalClicksCount) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>

            {/* Button 3 */}
            <div className="p-2 rounded-lg bg-white border border-gray-200">
              <div className="flex items-center space-x-1.5 text-gray-600 font-medium">
                <UserCheck className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                <span className="truncate">Proprietario</span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="font-bold text-gray-900 text-xs">
                  {clickStats.bySource.trova_proprietario} clic
                </span>
                <span className="text-[10px] text-gray-400 font-semibold">
                  {totalClicksCount > 0
                    ? Math.round((clickStats.bySource.trova_proprietario / totalClicksCount) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>

            {/* Button 4 */}
            <div className="p-2 rounded-lg bg-white border border-gray-200">
              <div className="flex items-center space-x-1.5 text-gray-600 font-medium">
                <Lock className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                <span className="truncate">Pin Riservati</span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="font-bold text-gray-900 text-xs">
                  {clickStats.bySource.cluster_riservato} clic
                </span>
                <span className="text-[10px] text-gray-400 font-semibold">
                  {totalClicksCount > 0
                    ? Math.round((clickStats.bySource.cluster_riservato / totalClicksCount) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex-none px-3 sm:px-6 pt-3 border-b border-gray-200 flex items-center justify-between overflow-x-auto no-scrollbar">
          <div className="flex space-x-2 sm:space-x-4 flex-shrink-0">
            <button
              onClick={() => setActiveTab('leads')}
              className={`pb-2.5 text-xs font-bold border-b-2 transition-colors flex items-center space-x-1.5 ${
                activeTab === 'leads'
                  ? 'border-[#0d6e5a] text-[#0d6e5a]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Chi ha inserito la mail ({leads.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('clicks')}
              className={`pb-2.5 text-xs font-bold border-b-2 transition-colors flex items-center space-x-1.5 ${
                activeTab === 'clicks'
                  ? 'border-[#0d6e5a] text-[#0d6e5a]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <MousePointerClick className="w-3.5 h-3.5" />
              <span>Cronologia dei clic ({clicks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('sheets')}
              className={`pb-2.5 text-xs font-bold border-b-2 transition-colors flex items-center space-x-1.5 ${
                activeTab === 'sheets'
                  ? 'border-[#0d6e5a] text-[#0d6e5a]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Google Sheets Database 📊</span>
            </button>
          </div>

          {activeTab === 'clicks' && clicks.length > 0 && (
            <button
              onClick={handleClearClicks}
              className="mb-2 text-[11px] text-gray-400 hover:text-red-600 flex items-center space-x-1 transition-colors"
              title="Azzera storico clic"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Azzera clic</span>
            </button>
          )}
        </div>

        {/* Tab Body */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'leads' ? (
            /* TAB 1: CHI HA INSERITO LA MAIL */
            leads.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">
                <Mail className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p className="font-semibold text-gray-700">Nessuna email registrata al momento</p>
                <p className="text-gray-500 mt-1">
                  Le persone che inseriscono la propria mail nei vari sblocchi appariranno qui con il dettaglio del pulsante premuto.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {leads.map((lead) => {
                  const badge = getSourceBadge(lead.source, lead.sourceLabel);
                  return (
                    <div
                      key={lead.id}
                      className="p-3.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 flex-shrink-0">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-gray-900">{lead.email}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center space-x-1 ${badge.badgeClass}`}
                            >
                              {badge.icon}
                              <span>{badge.label}</span>
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-500 mt-1">
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              <span>{lead.timestamp}</span>
                            </span>
                            <span>•</span>
                            <span className="text-gray-700 font-medium">
                              {lead.propertyName ||
                                (lead.hiddenCount
                                  ? `${lead.hiddenCount} immobili riservati`
                                  : 'Padova')}
                            </span>
                          </div>

                          {/* Extra Session Metadata Row: Geo, Device, Traffic, Time */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1.5 text-[10px]">
                            {lead.userCity && (
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200/60 font-medium flex items-center space-x-1">
                                <MapPin className="w-2.5 h-2.5 text-blue-600" />
                                <span>{lead.userCity}</span>
                              </span>
                            )}
                            {lead.device && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium flex items-center space-x-1">
                                <Smartphone className="w-2.5 h-2.5 text-slate-500" />
                                <span>{lead.device}</span>
                              </span>
                            )}
                            {lead.timeOnSite && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/60 font-medium flex items-center space-x-1">
                                <Clock className="w-2.5 h-2.5 text-amber-600" />
                                <span>Sul sito: {lead.timeOnSite}</span>
                              </span>
                            )}
                            {lead.referrer && (
                              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200/60 font-medium flex items-center space-x-1">
                                <Compass className="w-2.5 h-2.5 text-purple-600" />
                                <span>{lead.referrer}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteLead(lead.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
                        title="Elimina contatto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          ) : activeTab === 'clicks' ? (
            /* TAB 2: CRONOLOGIA DEI CLIC (QUANTI E DOVE) */
            clicks.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">
                <MousePointerClick className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p className="font-semibold text-gray-700">Nessun clic registrato</p>
                <p className="text-gray-500 mt-1">
                  Ogni clic su "Vedi analisi urbanistica", "Dimmi a chi proporla", "Trova proprietario" o sul pin riservato verrà annotato qui.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {clicks.map((c) => {
                  const badge = getSourceBadge(c.source, c.sourceLabel);
                  return (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-xl border border-gray-100 bg-[#fbfcfd] hover:bg-white hover:border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center space-x-1 w-fit ${badge.badgeClass}`}
                        >
                          {badge.icon}
                          <span>{badge.label}</span>
                        </span>
                        <span className="text-gray-800 font-semibold truncate max-w-[260px]">
                          {c.propertyName || c.propertyAddress || 'Opportunità riservate'}
                        </span>
                        {c.userCity && (
                          <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/50 w-fit">
                            📍 {c.userCity}
                          </span>
                        )}
                        {c.timeOnSite && (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/50 w-fit">
                            ⏱️ {c.timeOnSite}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5 text-[11px] text-gray-400 flex-shrink-0 self-end sm:self-auto">
                        <Calendar className="w-3 h-3 text-gray-300" />
                        <span>{c.timestamp}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* TAB 3: GOOGLE SHEETS CLOUD DATABASE CONFIGURATION */
            <div className="space-y-5 text-xs text-gray-700">
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-start space-x-3">
                <Cloud className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-gray-900 text-xs">
                    Database Cloud Google Sheets (Tempo Reale)
                  </h4>
                  <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">
                    Collegando il tuo Foglio Google, ogni volta che un utente nel mondo clicca su un pulsante o inserisce la mail su Vercel, i dati vengono scritti istantaneamente su Google Drive nel tuo foglio di calcolo personale.
                  </p>
                </div>
              </div>

              {/* Webhook URL Input */}
              <form onSubmit={handleSaveSheetUrl} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-800 uppercase tracking-wider mb-1">
                    URL Webhook Google Apps Script
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="url"
                      value={sheetWebhookUrl}
                      onChange={(e) => setSheetWebhookUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0d6e5a]"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#0d6e5a] hover:bg-[#095747] text-white font-semibold flex items-center space-x-1 shadow-2xs transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Salva URL</span>
                    </button>
                  </div>
                  {isUrlSaved && (
                    <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                      ✅ URL salvata correttamente nel browser!
                    </p>
                  )}
                </div>

                {/* Actions: Test & Sync */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleTestGoogleSheet}
                    disabled={isTesting}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5 text-amber-300" />
                    <span>{isTesting ? 'Invio test...' : 'Invia riga di test a Google Sheets'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncRemoteData}
                    disabled={isSyncing}
                    className="px-3.5 py-1.5 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 font-semibold flex items-center space-x-1.5 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-sky-600 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Scaricamento...' : 'Scarica lead dal Foglio Google'}</span>
                  </button>
                </div>

                {testStatus && (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-gray-800">
                    {testStatus}
                  </div>
                )}
              </form>

              {/* 3 Steps Guide to Setup */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 text-xs">
                    Come configurarlo in 1 minuto (Gratuito):
                  </span>
                  <button
                    onClick={handleCopyScript}
                    className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-semibold flex items-center space-x-1 text-[11px] transition-colors"
                  >
                    <Copy className="w-3 h-3 text-[#0d6e5a]" />
                    <span>{copiedCode ? 'Copiato!' : 'Copia codice Script'}</span>
                  </button>
                </div>

                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-gray-600 leading-relaxed">
                  <li>
                    Apri un nuovo foglio su <strong>Google Sheets</strong> (chiamalo ad es. <em>Domina Leads</em>).
                  </li>
                  <li>
                    Nel menu in alto clicca su <strong>Estensioni</strong> &rarr; <strong>Apps Script</strong>.
                  </li>
                  <li>
                    Cancella tutto, incolla il codice dello script (pulsante <em>Copia codice Script</em> qui sopra) e clicca su <strong>Salva (💾)</strong>.
                  </li>
                  <li>
                    In alto a destra clicca su <strong>Distribuisci</strong> &rarr; <strong>Nuova distribuzione</strong>.
                  </li>
                  <li>
                    Seleziona tipo <strong>Applicazione web</strong>, imposta <em>Esegui come: Me</em> e <em>Chi può accedere: Chiunque (Anyone)</em>, poi clicca <strong>Distribuisci</strong>.
                  </li>
                  <li>
                    Copia l'<strong>URL dell'applicazione web</strong> che termina con <code>/exec</code> e incollala qui sopra nel campo URL!
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-none p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1.5 text-gray-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {isSheetConfigured
                ? 'Cloud Sync: Google Sheets + Fallback Locale'
                : 'Salvataggio locale browser (Collega Google Sheets per il cloud)'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {leads.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-1.5 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 font-semibold flex items-center space-x-1.5 transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Esporta CSV ({leads.length})</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-[#0d6e5a] hover:bg-[#095747] text-white font-semibold transition-colors"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
