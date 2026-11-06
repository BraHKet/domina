import type { GeoPolygon } from '../types/property';

/**
 * Disposizione indicativa del progetto dentro la forma vera del lotto.
 * Il lotto viene diviso in una griglia di celle: ogni area (cessione, edificio, verde,
 * parcheggi) riceve un numero di celle proporzionale ai m² calcolati dal motore.
 * È uno schema per capire a colpo d'occhio, non un progetto: la posizione è un'ipotesi.
 */

export const CELL = {
  outside: 0,
  cessione: 1,
  verde: 2,
  parcheggi: 3,
  edificio: 4,
  tettoVerde: 5,
  scoperto: 6,
} as const;
export type CellKind = (typeof CELL)[keyof typeof CELL];

export interface LayoutInput {
  outline: GeoPolygon[] | null; // [lat, lng]; null = forma rettangolare indicativa
  st: number; // superficie del lotto usata dai calcoli (m²)
  cessione: number; // frazione del lotto
  coperto: number; // frazione del lotto
  verde: number; // frazione del lotto (verde a terra)
  tettoVerde: number; // frazione del coperto con tetto verde
  setback: number; // distanza minima dell'edificio dai confini (m)
  alberi: number;
  existing?: boolean; // stato di fatto: niente cessione né distanze, il resto è scoperto
}

export interface LotLayout {
  nu: number;
  nv: number;
  cellSize: number; // m
  cells: Uint8Array; // tipo di ogni cella, indice i + j * nu
  buildable: Uint8Array; // 1 = rispetta la distanza dai confini
  outline: [number, number][][]; // contorno in metri, nello stesso sistema delle celle
  trees: [number, number][]; // centro degli alberi in metri
  copertoMancante: number; // m² di coperto che non entrano rispettando le distanze
  isRealShape: boolean;
}

type Point = [number, number];

const MAX_CELLS = 2200;
const MAX_TREES = 70;

function ringArea(ring: Point[]): number {
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

function pointInRing(x: number, y: number, ring: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distanceToSegment(px: number, py: number, [ax, ay]: Point, [bx, by]: Point): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Converte il contorno catastale in metri e lo ruota col lato più lungo in orizzontale. */
function prepareShape(input: LayoutInput): { polygons: Point[][][]; isRealShape: boolean; frontAtBottom: boolean } {
  if (input.outline && input.outline.length > 0) {
    const first = input.outline[0][0];
    const lat0 = first.reduce((sum, [lat]) => sum + lat, 0) / first.length;
    const lng0 = first.reduce((sum, [, lng]) => sum + lng, 0) / first.length;
    const kx = 111320 * Math.cos((lat0 * Math.PI) / 180);
    const ky = 110540;
    const polygons = input.outline.map((polygon) =>
      polygon.map((ring) => ring.map(([lat, lng]) => [(lng - lng0) * kx, (lat - lat0) * ky] as Point))
    );

    // Il lato più lungo diventa orizzontale: spesso è il fronte strada
    let best = { length: 0, angle: 0, mid: [0, 0] as Point };
    polygons.forEach((polygon) => {
      const ring = polygon[0];
      for (let i = 0; i < ring.length - 1; i++) {
        const length = Math.hypot(ring[i + 1][0] - ring[i][0], ring[i + 1][1] - ring[i][1]);
        if (length > best.length) {
          best = {
            length,
            angle: Math.atan2(ring[i + 1][1] - ring[i][1], ring[i + 1][0] - ring[i][0]),
            mid: [(ring[i][0] + ring[i + 1][0]) / 2, (ring[i][1] + ring[i + 1][1]) / 2],
          };
        }
      }
    });
    const cos = Math.cos(-best.angle);
    const sin = Math.sin(-best.angle);
    const rotate = ([x, y]: Point): Point => [x * cos - y * sin, x * sin + y * cos];
    const rotated = polygons.map((polygon) => polygon.map((ring) => ring.map(rotate)));
    const ring = rotated[0][0];
    const meanY = ring.reduce((sum, [, y]) => sum + y, 0) / ring.length;
    return { polygons: rotated, isRealShape: true, frontAtBottom: rotate(best.mid)[1] <= meanY };
  }

  // Senza confini catastali: rettangolo della superficie del lotto
  const width = Math.sqrt(Math.max(input.st, 1) * 1.5);
  const depth = Math.max(input.st, 1) / width;
  return {
    polygons: [[[[0, 0], [width, 0], [width, depth], [0, depth], [0, 0]]]],
    isRealShape: false,
    frontAtBottom: true,
  };
}

export function computeLotLayout(input: LayoutInput): LotLayout {
  const { polygons, isRealShape, frontAtBottom } = prepareShape(input);
  const exteriors = polygons.map((polygon) => polygon[0]);
  const area = polygons.reduce(
    (sum, polygon) => sum + ringArea(polygon[0]) - polygon.slice(1).reduce((s, hole) => s + ringArea(hole), 0),
    0
  );

  const allPoints = exteriors.flat();
  const umin = Math.min(...allPoints.map(([x]) => x));
  const vmin = Math.min(...allPoints.map(([, y]) => y));
  const umax = Math.max(...allPoints.map(([x]) => x));
  const vmax = Math.max(...allPoints.map(([, y]) => y));
  const cellSize = Math.max(0.5, Math.sqrt(area / MAX_CELLS));
  const nu = Math.max(1, Math.ceil((umax - umin) / cellSize));
  const nv = Math.max(1, Math.ceil((vmax - vmin) / cellSize));
  const shifted = polygons.map((polygon) => polygon.map((ring) => ring.map(([x, y]) => [x - umin, y - vmin] as Point)));
  const outline = shifted.flat();

  const edges: [Point, Point][] = [];
  outline.forEach((ring) => {
    for (let i = 0; i < ring.length - 1; i++) edges.push([ring[i], ring[i + 1]]);
  });

  const total = nu * nv;
  const cells = new Uint8Array(total);
  const edgeDistance = new Float32Array(total);
  const insideIdx: number[] = [];
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const x = (i + 0.5) * cellSize;
      const y = (j + 0.5) * cellSize;
      const inside = shifted.some(
        ([exterior, ...holes]) => pointInRing(x, y, exterior) && !holes.some((hole) => pointInRing(x, y, hole))
      );
      if (!inside) continue;
      const k = i + j * nu;
      insideIdx.push(k);
      cells[k] = CELL.scoperto;
      let best = Infinity;
      for (const [a, b] of edges) best = Math.min(best, distanceToSegment(x, y, a, b));
      edgeDistance[k] = best;
    }
  }

  const n = insideIdx.length;
  const count = (fraction: number) => Math.max(0, Math.round(n * fraction));

  // 1. Cessione: una fascia lungo il lato più lungo del lotto
  const nCessione = input.existing ? 0 : count(input.cessione);
  const row = (k: number) => (frontAtBottom ? Math.floor(k / nu) : nv - 1 - Math.floor(k / nu));
  const byFront = [...insideIdx].sort((a, b) => row(a) - row(b) || (a % nu) - (b % nu));
  byFront.slice(0, nCessione).forEach((k) => (cells[k] = CELL.cessione));
  const fondiaria = insideIdx.filter((k) => cells[k] !== CELL.cessione);

  // 2. Distanza di ogni cella dai confini del lotto fondiario (bordo vero e cessione)
  const distance = new Float32Array(total).fill(Infinity);
  for (let k = 0; k < total; k++) if (cells[k] !== CELL.scoperto) distance[k] = 0;
  const step = (k: number, k2: number, w: number) => {
    if (distance[k2] + w < distance[k]) distance[k] = distance[k2] + w;
  };
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const k = i + j * nu;
      if (i > 0) step(k, k - 1, 1);
      if (j > 0) step(k, k - nu, 1);
      if (i > 0 && j > 0) step(k, k - nu - 1, Math.SQRT2);
      if (i < nu - 1 && j > 0) step(k, k - nu + 1, Math.SQRT2);
    }
  }
  for (let j = nv - 1; j >= 0; j--) {
    for (let i = nu - 1; i >= 0; i--) {
      const k = i + j * nu;
      if (i < nu - 1) step(k, k + 1, 1);
      if (j < nv - 1) step(k, k + nu, 1);
      if (i < nu - 1 && j < nv - 1) step(k, k + nu + 1, Math.SQRT2);
      if (i > 0 && j < nv - 1) step(k, k + nu - 1, Math.SQRT2);
    }
  }
  const clearance = new Float32Array(total);
  fondiaria.forEach((k) => {
    clearance[k] = Math.min(edgeDistance[k], (distance[k] - 0.5) * cellSize);
  });

  const setback = input.existing ? 0 : input.setback;
  const buildable = new Uint8Array(total);
  fondiaria.forEach((k) => {
    if (clearance[k] >= setback) buildable[k] = 1;
  });

  // 3. Edificio: fino a tre corpi rettangolari (a L o a U), poi eventuali ritagli
  const target = count(input.coperto);
  let placed = 0;
  const ok = (i: number, j: number) =>
    i >= 0 && j >= 0 && i < nu && j < nv && buildable[i + j * nu] === 1 && cells[i + j * nu] !== CELL.edificio;
  const take = (k: number) => {
    cells[k] = CELL.edificio;
    placed++;
  };

  // Rettangolo che cresce da un seme finché le distanze lo permettono, senza superare `limit` celle
  const growRect = (seed: number, limit: number): number[] => {
    let i0 = seed % nu;
    let i1 = i0;
    let j0 = Math.floor(seed / nu);
    let j1 = j0;
    const out = [seed];
    type Side = 'left' | 'right' | 'down' | 'up';
    const line = (side: Side): number[] => {
      const row: number[] = [];
      if (side === 'left' || side === 'right') {
        const i = side === 'left' ? i0 - 1 : i1 + 1;
        for (let j = j0; j <= j1; j++) row.push(ok(i, j) ? i + j * nu : -1);
      } else {
        const j = side === 'down' ? j0 - 1 : j1 + 1;
        for (let i = i0; i <= i1; i++) row.push(ok(i, j) ? i + j * nu : -1);
      }
      return row;
    };
    while (out.length < limit) {
      // Preferisce allungare l'edificio lungo il lato maggiore, come un capannone o una stecca
      const w = i1 - i0 + 1;
      const h = j1 - j0 + 1;
      const order: Side[] = w < 2.2 * h ? ['right', 'left', 'up', 'down'] : ['up', 'down', 'right', 'left'];
      const side = order.find((sd) => line(sd).every((k) => k >= 0));
      if (!side) break;
      const row = line(side);
      const needed = limit - out.length;
      if (row.length > needed) {
        const from = Math.floor((row.length - needed) / 2);
        out.push(...row.slice(from, from + needed));
        break;
      }
      out.push(...row);
      if (side === 'left') i0--;
      if (side === 'right') i1++;
      if (side === 'down') j0--;
      if (side === 'up') j1++;
    }
    return out;
  };

  // Prova più semi e tiene il rettangolo più grande
  const bestBlock = (seeds: number[], limit: number): number[] => {
    const sorted = [...seeds].sort((a, b) => clearance[b] - clearance[a]);
    const stride = Math.max(1, Math.floor(Math.min(sorted.length, 400) / 30));
    let best: number[] = [];
    for (let s = 0; s < Math.min(sorted.length, 400); s += stride) {
      const block = growRect(sorted[s], limit);
      if (block.length > best.length) best = block;
      if (best.length >= limit) break;
    }
    return best;
  };

  for (let block = 0; block < 3 && placed < target; block++) {
    let seeds: number[];
    if (block === 0) {
      seeds = fondiaria.filter((k) => ok(k % nu, Math.floor(k / nu)));
    } else {
      // I corpi successivi partono attaccati all'edificio già posato
      const near = new Set<number>();
      for (let k = 0; k < total; k++) {
        if (cells[k] !== CELL.edificio) continue;
        const i = k % nu;
        const j = Math.floor(k / nu);
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (ok(i + di, j + dj)) near.add(i + di + (j + dj) * nu);
        }
      }
      seeds = [...near];
    }
    if (seeds.length === 0) break;
    const cellsOfBlock = bestBlock(seeds, target - placed);
    // Un corpo aggiuntivo troppo piccolo sporca il disegno: lo si lascia ai ritagli
    if (block > 0 && cellsOfBlock.length < Math.max(4, target * 0.04)) break;
    cellsOfBlock.forEach(take);
  }

  // Ritagli: celle attaccate all'edificio, finché le distanze lo permettono
  while (placed < target) {
    let bestK = -1;
    for (let k = 0; k < total; k++) {
      if (cells[k] !== CELL.edificio) continue;
      const i = k % nu;
      const j = Math.floor(k / nu);
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!ok(i + di, j + dj)) continue;
        const nk = i + di + (j + dj) * nu;
        if (bestK < 0 || clearance[nk] > clearance[bestK]) bestK = nk;
      }
    }
    if (bestK < 0) break;
    take(bestK);
  }
  const copertoMancante = Math.max(0, target - placed) * (input.st / Math.max(n, 1));

  // Tetto verde: una parte compatta del tetto
  const building = insideIdx.filter((k) => cells[k] === CELL.edificio).sort((a, b) => (a % nu) - (b % nu) || a - b);
  building.slice(0, Math.round(building.length * input.tettoVerde)).forEach((k) => (cells[k] = CELL.tettoVerde));

  // 4. Verde lungo i confini, parcheggi nel resto
  const free = fondiaria.filter((k) => cells[k] === CELL.scoperto);
  if (!input.existing) {
    const nVerde = Math.min(free.length, count(input.verde));
    const byEdge = [...free].sort((a, b) => clearance[a] - clearance[b]);
    byEdge.forEach((k, index) => (cells[k] = index < nVerde ? CELL.verde : CELL.parcheggi));
  }

  // 5. Alberi distribuiti nel verde, poi tra i parcheggi se non bastano
  const trees: [number, number][] = [];
  if (!input.existing && input.alberi > 0) {
    const drawn = Math.min(input.alberi, MAX_TREES);
    const spots = [
      ...insideIdx.filter((k) => cells[k] === CELL.verde),
      ...insideIdx.filter((k) => cells[k] === CELL.parcheggi),
    ];
    const stride = Math.max(1, Math.floor(spots.length / drawn));
    for (let t = 0; t < drawn && t * stride < spots.length; t++) {
      const k = spots[t * stride];
      trees.push([((k % nu) + 0.5) * cellSize, (Math.floor(k / nu) + 0.5) * cellSize]);
    }
  }

  return { nu, nv, cellSize, cells, buildable, outline, trees, copertoMancante, isRealShape };
}

/** Ruota la disposizione di 90° (k volte) per guardare il lotto da un altro lato. */
export function rotateLayout(layout: LotLayout, k: number): LotLayout {
  let current = layout;
  for (let r = 0; r < ((k % 4) + 4) % 4; r++) {
    const { nu, nv, cellSize } = current;
    const height = nv * cellSize;
    const cells = new Uint8Array(nu * nv);
    const buildable = new Uint8Array(nu * nv);
    // La cella (i, j) va in (nv - 1 - j, i); la nuova griglia è larga nv e alta nu
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) {
        const target = nv - 1 - j + i * nv;
        cells[target] = current.cells[i + j * nu];
        buildable[target] = current.buildable[i + j * nu];
      }
    }
    const turn = ([x, y]: [number, number]): [number, number] => [height - y, x];
    current = {
      ...current,
      nu: nv,
      nv: nu,
      cells,
      buildable,
      outline: current.outline.map((ring) => ring.map(turn)),
      trees: current.trees.map(turn),
    };
  }
  return current;
}
