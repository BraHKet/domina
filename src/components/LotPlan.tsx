import React from 'react';
import type {
  DemolizioneResult,
  MantenimentoResult,
} from '../utils/urbanCalculationEngine.ts';
import { formatNumber } from '../utils/urbanLot.ts';

const SIZE = 200;
const MAX_DRAWN_TREES = 48;

const PLAN_COLORS = {
  cessione: '#fbbf24',
  coperto: '#1e293b',
  tettoVerde: '#4ade80',
  verde: '#16a34a',
  parcheggi: '#38bdf8',
  scoperto: '#86efac',
  albero: '#14532d',
};

interface LegendRow {
  key: string;
  color: string;
  label: string;
  value: string;
  indented?: boolean;
}

const Label: React.FC<{
  x: number;
  y: number;
  text: string;
  fill?: string;
  halo?: string;
  weight?: number;
}> = ({ x, y, text, fill = '#fff', halo, weight = 700 }) => (
  <text
    x={x}
    y={y}
    textAnchor="middle"
    dominantBaseline="central"
    fontSize={11}
    fontWeight={weight}
    fill={fill}
    stroke={halo}
    strokeWidth={halo ? 3 : 0}
    paintOrder="stroke"
  >
    {text}
  </text>
);

const Legend: React.FC<{ rows: LegendRow[] }> = ({ rows }) => (
  <ul className="flex-1 min-w-0 space-y-1.5 text-[11px] leading-tight">
    {rows.map((row) => (
      <li key={row.key} className={row.indented ? 'pl-3' : ''}>
        <span className="flex items-center gap-1.5 text-slate-500">
          <span className="w-2.5 h-2.5 rounded-sm flex-none" style={{ background: row.color }} />
          <span className="truncate">{row.label}</span>
        </span>
        <span className="block pl-4 font-bold text-slate-900 text-xs">{row.value}</span>
      </li>
    ))}
  </ul>
);

const PlanFrame: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <svg
    viewBox={`0 0 ${SIZE} ${SIZE}`}
    role="img"
    aria-label={label}
    className="w-[190px] h-[190px] flex-none rounded-xl overflow-hidden ring-1 ring-slate-200"
  >
    <defs>
      <pattern id="domina-roof" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="8" height="8" fill={PLAN_COLORS.coperto} />
        <rect width="4" height="8" fill={PLAN_COLORS.tettoVerde} />
      </pattern>
    </defs>
    {children}
  </svg>
);

/** Pianta del lotto in demolizione: ogni compartimento ha un'area proporzionale ai m² calcolati. */
export const DemolitionPlan: React.FC<{ result: DemolizioneResult }> = ({ result: d }) => {
  const st = Math.max(d.st, 1);
  const sf = Math.max(d.sf, 1);

  const cessioneH = (d.cessione / st) * SIZE;
  const sfH = SIZE - cessioneH;
  const coveredW = (d.covEff / sf) * SIZE;
  const roofH = d.covEff > 0 ? (Math.min(d.tv, d.covEff) / d.covEff) * sfH : 0;

  const freeW = SIZE - coveredW;
  const freeArea = Math.max(d.permTerra + d.parcheggi, 1);
  const greenH = (d.permTerra / freeArea) * sfH;
  const parkingH = sfH - greenH;

  // Alberi distribuiti in modo uniforme nell'area scoperta
  const drawnTrees = Math.min(d.alberi, MAX_DRAWN_TREES);
  const treeCols = Math.max(1, Math.ceil(Math.sqrt((drawnTrees * freeW) / Math.max(sfH, 1))));
  const treeRows = Math.max(1, Math.ceil(drawnTrees / treeCols));
  const trees = Array.from({ length: drawnTrees }, (_, i) => ({
    cx: coveredW + ((i % treeCols) + 0.5) * (freeW / treeCols),
    cy: cessioneH + (Math.floor(i / treeCols) + 0.5) * (sfH / treeRows),
  }));

  const legend: LegendRow[] = [
    { key: 'coperto', color: PLAN_COLORS.coperto, label: 'Coperto', value: `${formatNumber(d.covEff)} m²` },
    ...(d.tv > 0
      ? [{ key: 'tv', color: PLAN_COLORS.tettoVerde, label: 'Tetto verde', value: `${formatNumber(d.tv)} m²`, indented: true }]
      : []),
    { key: 'verde', color: PLAN_COLORS.verde, label: 'Verde a terra', value: `${formatNumber(d.permTerra)} m²` },
    { key: 'parcheggi', color: PLAN_COLORS.parcheggi, label: 'Parcheggi', value: `${formatNumber(d.parcheggi)} m²` },
    { key: 'cessione', color: PLAN_COLORS.cessione, label: 'Cessione', value: `${formatNumber(d.cessione)} m²` },
    { key: 'alberi', color: PLAN_COLORS.albero, label: 'Alberi', value: formatNumber(d.alberi) },
  ];

  const summary = `Pianta del lotto di ${formatNumber(d.st)} metri quadri: coperto ${formatNumber(d.covEff)}, verde ${formatNumber(d.permTerra)}, parcheggi ${formatNumber(d.parcheggi)}, cessione ${formatNumber(d.cessione)}, ${d.alberi} alberi.`;

  return (
    <div className="flex items-start gap-3">
      <PlanFrame label={summary}>
        <g stroke="#fff" strokeWidth={1.5}>
          <rect x={0} y={0} width={SIZE} height={cessioneH} fill={PLAN_COLORS.cessione} />
          <rect x={0} y={cessioneH} width={coveredW} height={sfH} fill={PLAN_COLORS.coperto} />
          {roofH > 0 && <rect x={0} y={cessioneH} width={coveredW} height={roofH} fill="url(#domina-roof)" />}
          {greenH > 0 && <rect x={coveredW} y={cessioneH} width={freeW} height={greenH} fill={PLAN_COLORS.verde} />}
          {parkingH > 0 && (
            <rect x={coveredW} y={cessioneH + greenH} width={freeW} height={parkingH} fill={PLAN_COLORS.parcheggi} />
          )}
        </g>
        <g fill={PLAN_COLORS.albero} stroke="#fff" strokeWidth={1}>
          {trees.map((tree, i) => (
            <circle key={i} cx={tree.cx} cy={tree.cy} r={3.2} />
          ))}
        </g>
        {cessioneH > 16 && <Label x={SIZE / 2} y={cessioneH / 2} text="Cessione" fill="#451a03" />}
        {coveredW > 50 && (
          <Label
            x={coveredW / 2}
            y={cessioneH + roofH + (sfH - roofH) / 2}
            text="Coperto"
            halo={PLAN_COLORS.coperto}
          />
        )}
        {greenH > 20 && <Label x={coveredW + freeW / 2} y={cessioneH + greenH / 2} text="Verde" halo="#14532d" />}
        {parkingH > 20 && (
          <Label x={coveredW + freeW / 2} y={cessioneH + greenH + parkingH / 2} text="Parcheggi" fill="#082f49" halo="#bae6fd" />
        )}
      </PlanFrame>
      <Legend rows={legend} />
    </div>
  );
};

/** Pianta dello stato di fatto in mantenimento: solo coperto e scoperto. */
export const ExistingPlan: React.FC<{ result: MantenimentoResult }> = ({ result: m }) => {
  const total = Math.max(m.cop + m.sco, 1);
  const coveredW = (m.cop / total) * SIZE;

  return (
    <div className="flex items-start gap-3">
      <PlanFrame label={`Stato di fatto: coperto ${formatNumber(m.cop)} metri quadri, scoperto ${formatNumber(m.sco)} metri quadri.`}>
        <g stroke="#fff" strokeWidth={1.5}>
          <rect x={0} y={0} width={coveredW} height={SIZE} fill={PLAN_COLORS.coperto} />
          <rect x={coveredW} y={0} width={SIZE - coveredW} height={SIZE} fill={PLAN_COLORS.scoperto} />
        </g>
        {coveredW > 50 && <Label x={coveredW / 2} y={SIZE / 2} text="Coperto" />}
        {SIZE - coveredW > 50 && <Label x={coveredW + (SIZE - coveredW) / 2} y={SIZE / 2} text="Scoperto" fill="#14532d" />}
      </PlanFrame>
      <Legend
        rows={[
          { key: 'coperto', color: PLAN_COLORS.coperto, label: 'Coperto', value: `${formatNumber(m.cop)} m²` },
          { key: 'scoperto', color: PLAN_COLORS.scoperto, label: 'Scoperto', value: `${formatNumber(m.sco)} m²` },
        ]}
      />
    </div>
  );
};
