import { supabase } from './supabase'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLng = (lng2 - lng1) * rad
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function daysOnMarket(dataCreazione) {
  if (!dataCreazione) return null
  const nowSec = Date.now() / 1000
  return Math.max(0, Math.floor((nowSec - dataCreazione) / 86400))
}

// ─── A) Sconto da OMI (max 50pt) ─────────────────────────────────────────────

export function scoreOMI(property, omiRows) {
  const mq = property.prezzo_mq
  if (!mq || !omiRows?.length) return { pt: 0, meta: null }

  const tipologia = (property.tipologia ?? '').toLowerCase()
  const omiRow =
    omiRows.find((r) => r.tipologia?.toLowerCase().includes(tipologia)) ??
    omiRows[0]

  const min = omiRow?.prezzo_min
  const max = omiRow?.prezzo_max
  if (!min || !max) return { pt: 0, meta: null }

  const media = (min + max) / 2
  const diff = (media - mq) / media

  let pt = 0
  if (diff >= 0.40) pt = 50
  else if (diff >= 0.30) pt = 42
  else if (diff >= 0.20) pt = 35
  else if (diff >= 0.10) pt = 25
  else if (diff >= 0)    pt = 15
  else if (mq <= max)    pt = 5
  else pt = 0

  return {
    pt,
    meta: {
      prezzoMq: mq,
      omiMin: min,
      omiMax: max,
      omiMedia: Math.round(media),
      sconto: Math.round(diff * 100), // percentuale sotto/sopra media
    }
  }
}

// ─── B) Tempo sul mercato relativo (max 20pt) ────────────────────────────────

export function scoreTempoMercato(property, allProperties) {
  const giorni = daysOnMarket(property.data_creazione)
  if (giorni === null) return { pt: 0, meta: null }

  const simili = allProperties.filter(
    (p) =>
      p.id !== property.id &&
      p.stato_immobile === property.stato_immobile &&
      p.data_creazione
  )

  let pt = 0
  let mediaGiorni = null

  if (!simili.length) {
    pt = giorni > 60 ? 10 : 5
  } else {
    mediaGiorni = Math.round(
      simili.reduce((acc, p) => acc + daysOnMarket(p.data_creazione), 0) /
      simili.length
    )
    const ratio = giorni / mediaGiorni
    if (ratio >= 2.0) pt = 20
    else if (ratio >= 1.5) pt = 16
    else if (ratio >= 1.2) pt = 12
    else if (ratio >= 1.0) pt = 8
    else pt = 3
  }

  return {
    pt,
    meta: {
      giorni,
      mediaZona: mediaGiorni,
    }
  }
}

// ─── C) Velocità ristrutturate vicine entro 50m (max 15pt) ───────────────────

export function scoreRistrutturationeVicine(property, allProperties) {
  const RAGGIO_METRI = 50

  const vicine = allProperties.filter(
    (p) =>
      p.id !== property.id &&
      p.stato_immobile === 'Ottimo / Ristrutturato' &&
      p.latitudine &&
      p.longitudine &&
      haversineMeters(
        property.latitudine,
        property.longitudine,
        p.latitudine,
        p.longitudine
      ) <= RAGGIO_METRI
  )

  if (!vicine.length) return { pt: 7, meta: { mediaGiorni: null, count: 0 } }

  const mediaGiorni = Math.round(
    vicine.reduce((acc, p) => acc + (daysOnMarket(p.data_creazione) ?? 90), 0) /
    vicine.length
  )

  let pt = 0
  if (mediaGiorni <= 30)  pt = 15
  else if (mediaGiorni <= 60)  pt = 12
  else if (mediaGiorni <= 90)  pt = 9
  else if (mediaGiorni <= 150) pt = 5
  else pt = 2

  return {
    pt,
    meta: { mediaGiorni, count: vicine.length }
  }
}

// ─── D) Fattori immobile (max 7pt, con penalità) ─────────────────────────────

export function scorefattoriImmobile(property) {
  let pt = 0

  const piano = property.piano ?? 0
  const ascensore = property.ascensore ?? false
  const locali = property.locali ?? 0

  if (ascensore) pt += 2

  if (piano >= 2 && piano <= 5) pt += 2
  else if (piano === 1) pt += 1

  if (!ascensore && piano >= 5) pt -= 20
  else if (!ascensore && piano >= 4) pt -= 10

  if (locali === 2)      pt += 3
  else if (locali === 3) pt += 2
  else if (locali >= 4)  pt += 1

  return {
    pt,
    meta: { piano, ascensore, locali }
  }
}

// ─── E) Contesto urbano OSM nel raggio 50m (max 15pt) ────────────────────────

const TAGS_NEGATIVI = [
  '["shop"="vacant"]',
  '["amenity"="gambling"]',
  '["building"="abandoned"]',
  '["amenity"="bureau_de_change"]',
  '["amenity"="bar"]',
  '["housing"="social"]',
  '["social_facility"="shelter"]',
]

const TAGS_POSITIVI = [
  '["amenity"="school"]',
  '["amenity"="kindergarten"]',
  '["amenity"="pharmacy"]',
  '["shop"="supermarket"]',
  '["leisure"="park"]',
  '["amenity"="restaurant"]',
  '["amenity"="cafe"]',
]

export async function fetchContestoUrbano(lat, lng) {
  const RAGGIO = 200

  const buildQuery = (tags) =>
    tags.map((t) => `node${t}(around:${RAGGIO},${lat},${lng});`).join('\n')

  const query = `
    [out:json][timeout:10];
    (
      ${buildQuery(TAGS_NEGATIVI)}
      ${buildQuery(TAGS_POSITIVI)}
    );
    out tags;
  `

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
    })
    const data = await res.json()
    return data.elements ?? []
  } catch {
    return []
  }
}

// ─── Score totale ─────────────────────────────────────────────────────────────

const STATI_SCORABILI = ['Da ristrutturare']

export function calcolaScore(property, allProperties, omiRows, osmElements = []) {
  if (!STATI_SCORABILI.includes(property.stato_immobile)) return null

  const a = scoreOMI(property, omiRows)
  const b = scoreTempoMercato(property, allProperties)
  const c = scoreRistrutturationeVicine(property, allProperties)
  const d = scorefattoriImmobile(property)

  const totale = Math.min(100, Math.max(0, a.pt + b.pt + c.pt + d.pt))

  return {
    totale,
    dettaglio: {
      omi:      { pt: a.pt, max: 50, meta: a.meta },
      tempo:    { pt: b.pt, max: 20, meta: b.meta },
      vicine:   { pt: c.pt, max: 15, meta: c.meta },
      fattori:  { pt: d.pt, max: 7,  meta: d.meta },
    },
  }
}

// ─── Calcola score per tutti (sincrono, OSM on-demand nel popup) ──────────────

export function calcolaTuttiGliScore(allRawProperties, omiRows) {
  return allRawProperties.map((p) => ({
    ...p,
    scoring: calcolaScore(p, allRawProperties, omiRows, []),
  }))
}