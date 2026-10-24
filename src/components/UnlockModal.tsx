import React, { useState } from 'react';
import { X, Lock, CheckCircle2, ArrowRight } from 'lucide-react';
import type { ClickSource } from '../types/property';
import { saveLead } from '../utils/storage';

interface UnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceKey?: ClickSource | string;
  sourceTitle?: string;
  propertyName?: string;
  hiddenCount?: number;
  onLeadSaved: () => void;
}

export const UnlockModal: React.FC<UnlockModalProps> = ({
  isOpen,
  onClose,
  sourceKey = 'cluster_riservato',
  sourceTitle = 'Sblocca le location',
  propertyName,
  hiddenCount,
  onLeadSaved,
}) => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@') || !email.includes('.')) {
      setError('Inserisci una mail valida.');
      return;
    }

    saveLead(email, sourceKey, sourceTitle, propertyName, hiddenCount, 'Padova');
    setIsSubmitted(true);
    setError('');
    onLeadSaved();
  };

  const handleClose = () => {
    setIsSubmitted(false);
    setEmail('');
    setError('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden text-gray-800 p-6 text-center">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!isSubmitted ? (
          <div className="space-y-4">
            {/* Lock Icon */}
            <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600">
              <Lock className="w-6 h-6" />
            </div>

            {/* Short Title & Message */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                {sourceTitle}
              </h3>
              <p className="text-xs text-gray-600 mt-1 font-medium">
                Lascia la mail e ti ricontattiamo per sbloccare le location!
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3 pt-1">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  placeholder="Inserisci la tua mail..."
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm sm:text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0d6e5a] focus:ring-1 focus:ring-[#0d6e5a]/20"
                />
                {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-[#0d6e5a] hover:bg-[#095747] text-white text-xs font-semibold tracking-wide flex items-center justify-center space-x-1.5 shadow-sm transition-all"
              >
                <span>Invia richiesta</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          <div className="py-2 space-y-3">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <h3 className="text-base font-bold text-gray-900">
              Richiesta inviata!
            </h3>

            <p className="text-xs text-gray-600">
              Ti ricontatteremo a breve all'indirizzo <span className="font-semibold text-gray-800">{email}</span>.
            </p>

            <button
              onClick={handleClose}
              className="mt-3 px-5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold transition-colors"
            >
              Chiudi
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
