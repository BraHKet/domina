import React, { useMemo } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import type { CadastralParcel } from '../types/property';
import { buildLotBoundary, formatParcelList } from '../utils/cadastre';
import { formatNumber } from '../utils/urbanLot';

interface ParcelPickerBarProps {
  selected: CadastralParcel[];
  pending: number;
  message: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Barra in basso durante la scelta delle particelle: riepilogo e conferma. */
export const ParcelPickerBar: React.FC<ParcelPickerBarProps> = ({
  selected,
  pending,
  message,
  onCancel,
  onConfirm,
}) => {
  const boundary = useMemo(() => (selected.length ? buildLotBoundary(selected) : null), [selected]);
  const pieces = boundary?.outline.length ?? 0;
  const loading = pending > 0;

  let detail: string;
  if (loading) {
    detail = `Cerco ${pending === 1 ? 'la particella' : `${pending} particelle`} nel catasto: può richiedere fino a 20 secondi…`;
  } else if (message) detail = message;
  else if (boundary) detail = formatParcelList(selected);
  else detail = 'Clicca dentro ogni particella del lotto. Un secondo clic la toglie.';

  return (
    <div className="domina-parcel-bar" role="status" aria-live="polite">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-slate-900">
          {boundary
            ? `${selected.length} ${selected.length === 1 ? 'particella' : 'particelle'} · ${formatNumber(boundary.areaSqm)} m²`
            : 'Scegli le particelle del lotto'}
        </p>
        <p className={`mt-0.5 text-[11px] leading-snug ${message && !loading ? 'text-amber-700' : 'text-slate-500'}`}>
          {loading && <Loader2 className="inline w-3 h-3 mr-1 animate-spin align-[-2px]" />}
          {detail}
        </p>
        {pieces > 1 && !loading && (
          <p className="mt-0.5 text-[11px] leading-snug text-amber-700">
            Le particelle formano {pieces} pezzi separati: non sono tutte confinanti.
          </p>
        )}
      </div>
      <div className="flex flex-none items-center gap-2">
        <button type="button" onClick={onCancel} className="domina-parcel-bar-button">
          <X className="w-3.5 h-3.5" />
          Annulla
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="domina-parcel-bar-button domina-parcel-bar-confirm"
        >
          <Check className="w-3.5 h-3.5" />
          Conferma
        </button>
      </div>
    </div>
  );
};
