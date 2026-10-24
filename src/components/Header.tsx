import React from 'react';
import { Plus, RotateCcw, LogOut, Shield, BarChart3 } from 'lucide-react';

interface HeaderProps {
  isAdmin: boolean;
  onLogoutAdmin: () => void;
  onAddNewLocation: () => void;
  onOpenLeads: () => void;
  leadsCount: number;
  onResetData: () => void;
  onTriggerHiddenLogin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isAdmin,
  onLogoutAdmin,
  onAddNewLocation,
  onOpenLeads,
  leadsCount,
  onResetData,
  onTriggerHiddenLogin,
}) => {
  return (
    <header className="z-30 flex-none bg-[#141f28] text-white px-3 sm:px-6 py-2.5 sm:py-3 border-b border-[#22303e] shadow-sm">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Left Side: Brand Logo & Name */}
        <div className="flex items-center space-x-3 sm:space-x-6">
          <div
            className="flex items-center space-x-2.5 cursor-pointer select-none"
            onDoubleClick={onTriggerHiddenLogin}
            title="Domina"
          >
            {/* Emerald geometric 4-petal clover logo */}
            <div className="w-6 h-6 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-emerald-400">
                <path
                  d="M12 2C9.5 2 7.5 4 7.5 6.5C7.5 9 9.5 11 12 11C14.5 11 16.5 9 16.5 6.5C16.5 4 14.5 2 12 2Z"
                  fill="currentColor"
                  fillOpacity="0.9"
                />
                <path
                  d="M6.5 7.5C4 7.5 2 9.5 2 12C2 14.5 4 16.5 6.5 16.5C9 16.5 11 14.5 11 12C11 9.5 9 7.5 6.5 7.5Z"
                  fill="currentColor"
                  fillOpacity="0.75"
                />
                <path
                  d="M17.5 7.5C15 7.5 13 9.5 13 12C13 14.5 15 16.5 17.5 16.5C20 16.5 22 14.5 22 12C22 9.5 20 7.5 17.5 7.5Z"
                  fill="currentColor"
                  fillOpacity="0.75"
                />
                <path
                  d="M12 13C9.5 13 7.5 15 7.5 17.5C7.5 20 9.5 22 12 22C14.5 22 16.5 20 16.5 17.5C16.5 15 14.5 13 12 13Z"
                  fill="currentColor"
                  fillOpacity="0.9"
                />
              </svg>
            </div>

            <span className="font-bold text-lg tracking-tight text-white">Domina</span>
          </div>

          <span className="hidden sm:inline text-xs text-slate-400 font-normal tracking-normal border-l border-slate-700/60 pl-6">
            Real Estate Location Intelligence
          </span>
        </div>

        {/* Right Side: ONLY visible when logged in as ADMIN */}
        {isAdmin && (
          <div className="flex items-center space-x-1 sm:space-x-2 text-xs flex-wrap sm:flex-nowrap gap-1 animate-fade-in">
            <span className="px-2 sm:px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold flex items-center space-x-1">
              <Shield className="w-3 h-3" />
              <span>ADMIN</span>
            </span>

            <button
              onClick={onAddNewLocation}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#0d6e5a] hover:bg-[#095747] text-white font-semibold flex items-center space-x-1 shadow-sm transition-colors text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nuova location</span>
              <span className="sm:hidden">Nuova</span>
            </button>

            <button
              onClick={onOpenLeads}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold flex items-center space-x-1 sm:space-x-1.5 transition-colors text-xs"
              title="Monitoraggio clic e contatti acquisiti"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clic & Lead ({leadsCount})</span>
              <span className="sm:hidden">Lead ({leadsCount})</span>
            </button>

            <button
              onClick={onResetData}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Ripristina dataset iniziale"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onLogoutAdmin}
              className="px-2 sm:px-2.5 py-1.5 rounded-lg bg-red-900/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 font-medium flex items-center space-x-1 transition-colors text-xs"
              title="Esci dall'Admin"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Esci</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
