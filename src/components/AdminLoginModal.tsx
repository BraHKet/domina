import React, { useState } from 'react';
import { X, Shield, ArrowRight } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() === 'lorenzo' && password === 'Rizzo123') {
      setError('');
      onLoginSuccess();
      onClose();
    } else {
      setError('Credenziali non valide. Accesso riservato.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden text-gray-800 p-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-4">
          {/* Admin Shield Icon */}
          <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#0d6e5a]">
            <Shield className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">
              Accesso Amministratore
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Area riservata gestione pin e location
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3 text-left pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Nome Utente
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                placeholder="Inserisci nome utente"
                required
                autoFocus
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0d6e5a]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0d6e5a]"
              />
            </div>

            {error && <p className="text-[11px] text-red-600 font-medium">{error}</p>}

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-[#0d6e5a] hover:bg-[#095747] text-white text-xs font-semibold tracking-wide flex items-center justify-center space-x-1.5 shadow-sm transition-all"
            >
              <span>Accedi come Admin</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
