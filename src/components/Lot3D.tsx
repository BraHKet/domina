import React, { useDeferredValue, useMemo, useState } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import type { GeoPolygon } from '../types/property';
import type { DemolizioneResult, MantenimentoResult } from '../utils/urbanCalculationEngine';
import { CELL, computeLotLayout, rotateLayout, type LotLayout } from '../utils/lotLayout';
import { formatNumber } from '../utils/urbanLot';

const COLORS = {
  cessione: '#fcd34d',
  cessioneLine: '#b45309',
  verde: '#4ade80',
  parcheggi: '#64748b',
  scoperto: '#d6d3d1',
  muroFronte: '#e2e8f0',
  muroLato: '#cbd5e1',
  tetto: '#f8fafc',
  tettoVerde: '#65a30d',
  spigolo: '#64748b',
  albero: '#15803d',
  alberoLuce: '#22c55e',
  tronco: '#78350f',
  confine: '#f59e0b',
};

const COS30 = Math.cos(Math.PI / 6);
const EXISTING_HEIGHT = 7; // altezza indicativa per lo stato di fatto
const FLOOR_HEIGHT = 3;

type Pt = [number, number];

/** Vista isometrica: x verso destra, y verso l'osservatore (il fronte del lotto è davanti). */
function makeProjector(layout: LotLayout) {
  const depthMax = layout.nv * layout.cellSize;
  return (x: number, y: number, z: number): Pt => {
    const yy = depthMax - y;
    return [(x - yy) * COS30, (x + yy) * 0.5 - z];
  };
}

const poly = (points: Pt[]) => `M${points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join('L')}Z`;
const segment = (a: Pt, b: Pt) => `M${a[0].toFixed(2)},${a[1].toFixed(2)}L${b[0].toFixed(2)},${b[1].toFixed(2)}`;

interface Scene {
  ground: Record<number, string>;
  stripes: string;
  setbackLine: string;
  walls: { front: string; side: string; floors: string };
  roof: { normal: string; green: string };
  outline: string;
  treesBehind: Pt[][];
  treesFront: Pt[][];
  heightLabel: Pt | null;
  viewBox: string;
}

function buildScene(layout: LotLayout, height: number): Scene {
  const { nu, nv, cellSize: c, cells, buildable } = layout;
  const project = makeProjector(layout);
  const isBuilding = (i: number, j: number) =>
    i >= 0 && j >= 0 && i < nu && j < nv && (cells[i + j * nu] === CELL.edificio || cells[i + j * nu] === CELL.tettoVerde);

  const ground: Record<number, string> = {};
  let stripes = '';
  let setbackLine = '';
  let wallFront = '';
  let wallSide = '';
  let floors = '';
  let roofNormal = '';
  let roofGreen = '';
  const allPoints: Pt[] = [];
  let buildingDepth = -Infinity;
  let buildingDepthSum = 0;
  let buildingCount = 0;
  let heightLabel: Pt | null = null;
  const stripeEvery = Math.max(1, Math.round(2.5 / c));

  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const kind = cells[i + j * nu];
      if (kind === CELL.outside) continue;
      const x0 = i * c;
      const x1 = x0 + c;
      const y0 = j * c;
      const y1 = y0 + c;
      const base = [project(x0, y0, 0), project(x1, y0, 0), project(x1, y1, 0), project(x0, y1, 0)];

      if (kind === CELL.edificio || kind === CELL.tettoVerde) {
        const top = [project(x0, y0, height), project(x1, y0, height), project(x1, y1, height), project(x0, y1, height)];
        if (kind === CELL.tettoVerde) roofGreen += poly(top);
        else roofNormal += poly(top);
        allPoints.push(...top);
        // Pareti visibili: verso destra (i + 1) e verso l'osservatore (j - 1)
        if (!isBuilding(i + 1, j)) {
          wallSide += poly([project(x1, y0, 0), project(x1, y1, 0), project(x1, y1, height), project(x1, y0, height)]);
          for (let z = FLOOR_HEIGHT; z < height - 0.5; z += FLOOR_HEIGHT) floors += segment(project(x1, y0, z), project(x1, y1, z));
        }
        if (!isBuilding(i, j - 1)) {
          wallFront += poly([project(x0, y0, 0), project(x1, y0, 0), project(x1, y0, height), project(x0, y0, height)]);
          for (let z = FLOOR_HEIGHT; z < height - 0.5; z += FLOOR_HEIGHT) floors += segment(project(x0, y0, z), project(x1, y0, z));
        }
        const depth = x1 + (nv * c - y0);
        buildingDepthSum += depth;
        buildingCount++;
        if (depth > buildingDepth) {
          buildingDepth = depth;
          heightLabel = project(x1, y0, height);
        }
      } else {
        ground[kind] = (ground[kind] ?? '') + poly(base);
        if (kind === CELL.parcheggi && i % stripeEvery === 0) stripes += segment(base[0], base[3]);
      }

      // Linea tratteggiata: limite entro cui l'edificio rispetta la distanza dai confini
      const k = i + j * nu;
      if (buildable[k]) {
        if (!buildable[k + 1] || i === nu - 1) setbackLine += segment(project(x1, y0, 0.05), project(x1, y1, 0.05));
        if (i === 0 || !buildable[k - 1]) setbackLine += segment(project(x0, y0, 0.05), project(x0, y1, 0.05));
        if (j === nv - 1 || !buildable[k + nu]) setbackLine += segment(project(x0, y1, 0.05), project(x1, y1, 0.05));
        if (j === 0 || !buildable[k - nu]) setbackLine += segment(project(x0, y0, 0.05), project(x1, y0, 0.05));
      }
    }
  }

  const outline = layout.outline
    .map((ring) => {
      const pts = ring.map(([x, y]) => project(x, y, 0));
      allPoints.push(...pts);
      return poly(pts);
    })
    .join('');

  // Alberi: tronco e chioma; quelli davanti all'edificio si disegnano dopo
  const meanDepth = buildingCount ? buildingDepthSum / buildingCount : Infinity;
  const treesBehind: Pt[][] = [];
  const treesFront: Pt[][] = [];
  layout.trees.forEach(([x, y]) => {
    const tree = [project(x, y, 0), project(x, y, 4.5)];
    allPoints.push(project(x, y, 7));
    (x + (nv * c - y) < meanDepth ? treesBehind : treesFront).push(tree);
  });

  const xs = allPoints.map(([x]) => x);
  const ys = allPoints.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const pad = Math.max(maxX - minX, maxY - minY) * 0.06;
  const viewBox = `${(minX - pad).toFixed(1)} ${(minY - pad * 1.6).toFixed(1)} ${(maxX - minX + pad * 2).toFixed(1)} ${(maxY - minY + pad * 2.6).toFixed(1)}`;

  return {
    ground,
    stripes,
    setbackLine,
    walls: { front: wallFront, side: wallSide, floors },
    roof: { normal: roofNormal, green: roofGreen },
    outline,
    treesBehind,
    treesFront,
    heightLabel,
    viewBox,
  };
}

const Trees: React.FC<{ trees: Pt[][]; radius: number }> = ({ trees, radius }) => (
  <g>
    {trees.map(([foot, crown], index) => (
      <g key={index}>
        <line x1={foot[0]} y1={foot[1]} x2={crown[0]} y2={crown[1]} stroke={COLORS.tronco} strokeWidth={radius * 0.35} />
        <circle cx={crown[0]} cy={crown[1]} r={radius} fill={COLORS.albero} />
        <circle cx={crown[0] - radius * 0.3} cy={crown[1] - radius * 0.3} r={radius * 0.45} fill={COLORS.alberoLuce} opacity={0.7} />
      </g>
    ))}
  </g>
);

interface LegendItem {
  color: string;
  label: string;
  value: string;
  pattern?: 'hatch' | 'stripes';
}

const Legend: React.FC<{ items: LegendItem[] }> = ({ items }) => (
  <ul className="grid grid-cols-2 gap-x-3 gap-y-2">
    {items.map((item) => (
      <li key={item.label} className="flex items-center gap-2 min-w-0">
        <span className="w-3.5 h-3.5 rounded flex-none ring-1 ring-black/10" style={{ background: item.color }} />
        <span className="min-w-0 leading-tight">
          <span className="block text-xs text-slate-700">{item.label}</span>
          <span className="block text-sm font-bold text-slate-900">{item.value}</span>
        </span>
      </li>
    ))}
  </ul>
);

const Scene3D: React.FC<{ layout: LotLayout; height: number; label: string; showSetback: boolean }> = ({
  layout,
  height,
  label,
  showSetback,
}) => {
  const [turns, setTurns] = useState(0);
  // Il disegno si aggiorna subito dopo le barre: trascinarle resta fluido
  const deferredLayout = useDeferredValue(layout);
  const deferredHeight = useDeferredValue(height);
  const scene = useMemo(
    () => buildScene(rotateLayout(deferredLayout, turns), deferredHeight),
    [deferredLayout, turns, deferredHeight]
  );
  const unit = layout.cellSize;
  const treeRadius = 2.2;

  return (
    <div className="relative rounded-xl overflow-hidden bg-gradient-to-b from-sky-100 to-slate-100 ring-1 ring-slate-200">
      <svg viewBox={scene.viewBox} role="img" aria-label={label} className="block w-full h-[210px]">
        <defs>
          <pattern id="domina-hatch" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="3" height="3" fill={COLORS.cessione} />
            <rect width="0.8" height="3" fill={COLORS.cessioneLine} opacity="0.45" />
          </pattern>
        </defs>
        {/* Terreno */}
        <g stroke="none">
          {scene.ground[CELL.cessione] && <path d={scene.ground[CELL.cessione]} fill="url(#domina-hatch)" />}
          {scene.ground[CELL.verde] && <path d={scene.ground[CELL.verde]} fill={COLORS.verde} />}
          {scene.ground[CELL.parcheggi] && <path d={scene.ground[CELL.parcheggi]} fill={COLORS.parcheggi} />}
          {scene.ground[CELL.scoperto] && <path d={scene.ground[CELL.scoperto]} fill={COLORS.scoperto} />}
        </g>
        {/* Le celle si toccano: un bordo dello stesso colore toglie le fessure */}
        <g fill="none" strokeWidth={unit * 0.12}>
          {scene.ground[CELL.verde] && <path d={scene.ground[CELL.verde]} stroke={COLORS.verde} />}
          {scene.ground[CELL.parcheggi] && <path d={scene.ground[CELL.parcheggi]} stroke={COLORS.parcheggi} />}
          {scene.ground[CELL.scoperto] && <path d={scene.ground[CELL.scoperto]} stroke={COLORS.scoperto} />}
        </g>
        {scene.stripes && <path d={scene.stripes} stroke="#f8fafc" strokeWidth={0.25} opacity={0.8} />}
        {showSetback && scene.setbackLine && (
          <path d={scene.setbackLine} stroke="#ffffff" strokeWidth={0.45} strokeDasharray="1.4 1" fill="none" />
        )}
        <path d={scene.outline} fill="none" stroke={COLORS.confine} strokeWidth={0.9} strokeLinejoin="round" />

        <Trees trees={scene.treesBehind} radius={treeRadius} />

        {/* Edificio */}
        <path d={scene.walls.side} fill={COLORS.muroLato} stroke={COLORS.muroLato} strokeWidth={unit * 0.1} />
        <path d={scene.walls.front} fill={COLORS.muroFronte} stroke={COLORS.muroFronte} strokeWidth={unit * 0.1} />
        <path d={scene.walls.floors} stroke="#94a3b8" strokeWidth={0.25} />
        <path d={scene.roof.normal} fill={COLORS.tetto} stroke={COLORS.tetto} strokeWidth={unit * 0.12} />
        <path d={scene.roof.green} fill={COLORS.tettoVerde} stroke={COLORS.tettoVerde} strokeWidth={unit * 0.12} />

        <Trees trees={scene.treesFront} radius={treeRadius} />

        {scene.heightLabel && (
          <text
            x={scene.heightLabel[0] + 1.5}
            y={scene.heightLabel[1] - 1.5}
            fontSize={Math.max(3.5, unit * 2.6)}
            fontWeight={700}
            fill="#0f172a"
            stroke="#ffffff"
            strokeWidth={0.8}
            paintOrder="stroke"
          >
            {`${String(deferredHeight).replace('.', ',')} m`}
          </text>
        )}
      </svg>
      <button
        type="button"
        onClick={() => setTurns((t) => t + 1)}
        className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/90 text-[11px] font-semibold text-slate-800 shadow-sm hover:bg-white"
        aria-label="Ruota la vista del lotto"
      >
        <RotateCw className="w-3 h-3" />
        Ruota
      </button>
    </div>
  );
};

/** Progetto in demolizione disegnato in 3D dentro i confini veri del lotto. */
export const Lot3DPlan: React.FC<{
  result: DemolizioneResult;
  outline: GeoPolygon[] | null;
  height: number;
}> = ({ result, outline, height }) => {
  // Il ricalcolo della disposizione segue le barre senza bloccarle
  const d = useDeferredValue(result);
  const st = Math.max(d.st, 1);
  const setback = d.distanze.dc ?? 0;
  const layout = useMemo(
    () =>
      computeLotLayout({
        outline,
        st,
        cessione: d.cessione / st,
        coperto: d.covEff / st,
        verde: d.permTerra / st,
        tettoVerde: d.covEff > 0 ? Math.min(d.tv, d.covEff) / d.covEff : 0,
        setback,
        alberi: d.alberi,
      }),
    [outline, st, d.cessione, d.covEff, d.permTerra, d.tv, setback, d.alberi]
  );

  return (
    <div className="space-y-2">
      <Scene3D
        layout={layout}
        height={height}
        showSetback
        label={`Lotto di ${formatNumber(d.st)} metri quadri in 3D: edificio di ${formatNumber(d.covEff)} metri quadri alto ${height} metri, verde ${formatNumber(d.permTerra)}, parcheggi ${formatNumber(d.parcheggi)}, cessione ${formatNumber(d.cessione)}, ${d.alberi} alberi.`}
      />
      <p className="text-xs leading-snug text-slate-600">
        <span className="inline-block w-5 border-t-2 border-dashed border-slate-500 align-middle mr-1.5" />
        L’edificio sta ad almeno {String(setback).replace('.', ',')} m dai confini.{' '}
        {layout.isRealShape ? 'Forma del lotto dal catasto.' : 'Forma del lotto indicativa.'} La disposizione è uno schema.
      </p>
      {layout.copertoMancante > 1 && (
        <p className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-50 text-xs leading-snug text-amber-900">
          <AlertTriangle className="w-3.5 h-3.5 flex-none mt-px text-amber-600" />
          <span>
            Con {String(setback).replace('.', ',')} m dai confini, circa {formatNumber(layout.copertoMancante)} m² di coperto non
            entrano nel lotto: verifica la sagoma con il tecnico.
          </span>
        </p>
      )}
    </div>
  );
};

/** Le aree del progetto con gli stessi colori del disegno 3D. */
export const DemolitionLegend: React.FC<{ result: DemolizioneResult; height: number }> = ({ result: d, height }) => (
  <Legend
    items={[
      {
        color: COLORS.tetto,
        label: `Edificio (${Math.max(1, Math.floor(height / FLOOR_HEIGHT))} piani)`,
        value: `${formatNumber(d.covEff)} m²`,
      },
      ...(d.tv > 0 ? [{ color: COLORS.tettoVerde, label: 'Tetto verde', value: `${formatNumber(d.tv)} m²` }] : []),
      { color: COLORS.verde, label: 'Verde a terra', value: `${formatNumber(d.permTerra)} m²` },
      { color: COLORS.parcheggi, label: 'Parcheggi', value: `${formatNumber(d.parcheggi)} m²` },
      { color: COLORS.cessione, label: 'Cessione', value: `${formatNumber(d.cessione)} m²` },
      { color: COLORS.albero, label: 'Alberi', value: formatNumber(d.alberi) },
    ]}
  />
);

/** Stato di fatto: edificio esistente e area scoperta, con altezza indicativa. */
export const Existing3DPlan: React.FC<{ result: MantenimentoResult; outline: GeoPolygon[] | null }> = ({
  result: m,
  outline,
}) => {
  const total = Math.max(m.cop + m.sco, 1);
  const layout = useMemo(
    () =>
      computeLotLayout({
        outline,
        st: total,
        cessione: 0,
        coperto: m.cop / total,
        verde: 0,
        tettoVerde: 0,
        setback: 0,
        alberi: 0,
        existing: true,
      }),
    [outline, total, m.cop]
  );

  return (
    <div className="space-y-3">
      <Scene3D
        layout={layout}
        height={EXISTING_HEIGHT}
        showSetback={false}
        label={`Stato di fatto: coperto ${formatNumber(m.cop)} metri quadri, scoperto ${formatNumber(m.sco)} metri quadri.`}
      />
      <Legend
        items={[
          { color: COLORS.tetto, label: 'Coperto', value: `${formatNumber(m.cop)} m²` },
          { color: COLORS.scoperto, label: 'Scoperto', value: `${formatNumber(m.sco)} m²` },
        ]}
      />
      <p className="text-xs leading-snug text-slate-600">Altezza e posizione dell’edificio sono indicative.</p>
    </div>
  );
};
