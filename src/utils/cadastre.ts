import polygonClipping from 'polygon-clipping';
import type { CadastralParcel, GeoPolygon, LatLngPoint, LotBoundary } from '../types/property';

/**
 * Particelle catastali dall'Agenzia delle Entrate (dato pubblico, licenza CC BY 4.0).
 * Il servizio WFS non permette chiamate dirette dal browser: passa da /api/catasto-wfs,
 * inoltrato da Vite in locale e da api/catasto-wfs.js online su Vercel.
 */
const WFS_PATH = '/api/catasto-wfs';
const GML_NS = 'http://www.opengis.net/gml/3.2';
const WFS_NS = 'http://www.opengis.net/wfs/2.0';
const CRS_URN = 'urn:ogc:def:crs:EPSG::6706';

export const CATASTO_WMS_URL = 'https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows01.php';
export const CATASTO_ATTRIBUTION = 'Cartografia catastale &copy; Agenzia delle Entrate (CC BY 4.0)';
export const CATASTO_SOURCE = 'Agenzia delle Entrate, cartografia catastale';

const EARTH_RADIUS = 6378137;
// Sotto questa superficie un pezzo di contorno è solo uno scarto tra particelle vicine
const MIN_PIECE_SQM = 1;

/**
 * Cerca la particella che contiene il punto cliccato. Restituisce null su strade e acque,
 * che nel catasto non sono particelle.
 */
export async function fetchParcelAt(lat: number, lng: number): Promise<CadastralParcel | null> {
  const delta = 0.00002; // circa 2 metri attorno al clic
  const params = new URLSearchParams({
    SERVICE: 'WFS',
    VERSION: '2.0.0',
    REQUEST: 'GetFeature',
    TYPENAMES: 'CP:CadastralParcel',
    SRSNAME: CRS_URN,
    BBOX: `${lat - delta},${lng - delta},${lat + delta},${lng + delta},${CRS_URN}`,
    COUNT: '20',
  });

  let response: Response;
  try {
    response = await fetch(`${WFS_PATH}?${params.toString()}`, { signal: AbortSignal.timeout(45000) });
  } catch {
    throw new Error('Il catasto non ha risposto: riprova tra poco.');
  }
  if (!response.ok) {
    throw new Error(`Il catasto non risponde (errore ${response.status})`);
  }

  const parcels = parseParcels(await response.text());
  return parcels.find((parcel) => parcel.polygons.some((poly) => pointInPolygon([lat, lng], poly))) ?? null;
}

function parseParcels(xml: string): CadastralParcel[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0 || /ExceptionReport/.test(doc.documentElement.nodeName)) {
    throw new Error('Risposta del catasto non leggibile');
  }

  const parcels: CadastralParcel[] = [];
  for (const member of Array.from(doc.getElementsByTagNameNS(WFS_NS, 'member'))) {
    const reference = member.getElementsByTagNameNS('*', 'NATIONALCADASTRALREFERENCE')[0]?.textContent?.trim();
    if (!reference) continue;

    const polygons: GeoPolygon[] = Array.from(member.getElementsByTagNameNS(GML_NS, 'Polygon'))
      .map((polygon) => {
        const exterior = polygon.getElementsByTagNameNS(GML_NS, 'exterior')[0];
        const interiors = Array.from(polygon.getElementsByTagNameNS(GML_NS, 'interior'));
        return [exterior, ...interiors]
          .filter(Boolean)
          .map((ring) => parsePosList(ring.getElementsByTagNameNS(GML_NS, 'posList')[0]?.textContent ?? ''));
      })
      .filter((rings) => rings.length > 0 && rings[0].length >= 4);

    if (polygons.length > 0) {
      parcels.push({ ...parseReference(reference), polygons });
    }
  }
  return parcels;
}

// Con EPSG:6706 il catasto restituisce le coordinate come latitudine, longitudine
function parsePosList(text: string): LatLngPoint[] {
  const values = text.trim().split(/\s+/).map(Number);
  const points: LatLngPoint[] = [];
  for (let i = 0; i + 1 < values.length; i += 2) {
    points.push([round(values[i]), round(values[i + 1])]);
  }
  return points;
}

/** "G224_002500.327" → comune G224, foglio 25, particella 327 */
function parseReference(reference: string): Omit<CadastralParcel, 'polygons'> {
  const [comune = '', rest = ''] = reference.split('_');
  const [sheet = '', particella = ''] = rest.split('.');
  const foglio = String(parseInt(sheet.slice(0, 4), 10) || sheet.slice(0, 4));
  const allegato = sheet.slice(4, 5);
  return {
    id: reference,
    comune,
    foglio: allegato && allegato !== '0' ? `${foglio}${allegato}` : foglio,
    particella,
  };
}

function round(value: number): number {
  return Math.round(value * 1e7) / 1e7;
}

function pointInRing([lat, lng]: LatLngPoint, ring: LatLngPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [latI, lngI] = ring[i];
    const [latJ, lngJ] = ring[j];
    if (latI > lat !== latJ > lat && lng < ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInPolygon(point: LatLngPoint, polygon: GeoPolygon): boolean {
  const [exterior, ...holes] = polygon;
  return pointInRing(point, exterior) && !holes.some((hole) => pointInRing(point, hole));
}

/** Superficie in m², con una proiezione locale: per un lotto l'errore è trascurabile. */
function ringArea(ring: LatLngPoint[]): number {
  if (ring.length < 3) return 0;
  const lat0 = (ring.reduce((sum, [lat]) => sum + lat, 0) / ring.length) * (Math.PI / 180);
  const toXY = ([lat, lng]: LatLngPoint) => [
    EARTH_RADIUS * lng * (Math.PI / 180) * Math.cos(lat0),
    EARTH_RADIUS * lat * (Math.PI / 180),
  ];
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = toXY(ring[i]);
    const [x2, y2] = toXY(ring[(i + 1) % ring.length]);
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

function polygonArea([exterior, ...holes]: GeoPolygon): number {
  return Math.max(0, ringArea(exterior) - holes.reduce((sum, hole) => sum + ringArea(hole), 0));
}

/**
 * Unisce le particelle in un unico contorno: le linee interne spariscono.
 * Particelle non confinanti restano pezzi separati.
 */
export function mergeParcels(parcels: CadastralParcel[]): GeoPolygon[] {
  if (parcels.length === 0) return [];
  // polygon-clipping lavora in [x, y], cioè [lng, lat]
  const toXY = (polygon: GeoPolygon) => polygon.map((ring) => ring.map(([lat, lng]) => [lng, lat] as [number, number]));
  const [first, ...rest] = parcels.flatMap((parcel) => parcel.polygons.map(toXY));
  const merged = polygonClipping.union(first, ...rest);

  return merged
    .map((polygon) =>
      polygon
        .map((ring) => ring.map(([lng, lat]) => [round(lat), round(lng)] as LatLngPoint))
        .filter((ring, index) => index === 0 || ringArea(ring) >= MIN_PIECE_SQM)
    )
    .filter((polygon) => polygonArea(polygon) >= MIN_PIECE_SQM);
}

export function buildLotBoundary(parcels: CadastralParcel[]): LotBoundary {
  const outline = mergeParcels(parcels);
  return {
    parcels,
    outline,
    areaSqm: Math.round(outline.reduce((sum, polygon) => sum + polygonArea(polygon), 0)),
    source: CATASTO_SOURCE,
    updatedAt: new Date().toISOString(),
  };
}

/** "Foglio 25: 40, 41 · Foglio 26: 3" */
export function formatParcelList(parcels: CadastralParcel[]): string {
  const bySheet = new Map<string, string[]>();
  parcels.forEach((parcel) => {
    const list = bySheet.get(parcel.foglio) ?? [];
    list.push(parcel.particella);
    bySheet.set(parcel.foglio, list);
  });
  return Array.from(bySheet.entries())
    .map(([foglio, list]) => `Foglio ${foglio}: ${list.sort((a, b) => a.localeCompare(b, 'it', { numeric: true })).join(', ')}`)
    .join(' · ');
}
