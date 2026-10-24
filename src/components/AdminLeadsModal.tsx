import React from 'react';
import { X, Mail, Download, Trash2, Calendar, ShieldCheck } from 'lucide-react';
import type { LeadSubmission } from '../types/property';
import { deleteStoredLead } from '../utils/storage';

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
  if (!isOpen) return null;

  const handleDelete = (id: string) => {
    const updated = deleteStoredLead(id);
    onLeadsUpdated(updated);
  };

  const handleExportCSV = () => {
    if (leads.length === 0) return;
    const headers = 'ID,Email,Data e Ora,Opportunita Richieste,Citta\n';
    const rows = leads
      .map((l) => `"${l.id}","${l.email}","${l.timestamp}","${l.hiddenCount}","${l.city}"`)
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `domina-leads-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden text-gray-800 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex-none px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-gray-900 tracking-tight">
                  Lead & Contatti Raccolti
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  {leads.length} {leads.length === 1 ? 'contatto' : 'contatti'}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Email inviate dagli utenti che hanno cliccato sul pallino delle opportunità riservate
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

        {/* List Body */}
        <div className="flex-1 p-6 overflow-y-auto">
          {leads.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs">
              <Mail className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p className="font-semibold text-gray-700">Nessuna email registrata al momento</p>
              <p className="text-gray-500 mt-1">
                Le email degli utenti che cliccano su "Sblocca opportunità" appariranno qui.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className="p-3.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 flex items-center justify-between transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900">{lead.email}</div>
                      <div className="flex items-center space-x-2 text-[11px] text-gray-500 mt-0.5">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span>{lead.timestamp}</span>
                        <span>•</span>
                        <span className="text-amber-700 font-medium">
                          {lead.hiddenCount} immobili riservati ({lead.city})
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(lead.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="Elimina lead"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-none p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1.5 text-gray-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Salvataggio persistente in browser (localStorage)</span>
          </div>

          <div className="flex items-center space-x-2">
            {leads.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-1.5 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 font-semibold flex items-center space-x-1.5 transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Esporta CSV</span>
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
