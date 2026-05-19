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
// Confronta prezzo_mq della casa vs range OMI per la stessa tipologia
// È il fattore più importante: essere sottomercato è il segnale più oggettivo

export function scoreOMI(property, omiRows) {
  const mq = property.prezzo_mq
  if (!mq || !omiRows?.length) return 0

  const tipologia = (property.tipologia ?? '').toLowerCase()
  const omiRow =
    omiRows.find((r) => r.tipologia?.toLowerCase().includes(tipologia)) ??
    omiRows[0]

  const min = omiRow?.prezzo_min
  const max = omiRow?.prezzo_max
  if (!min || !max) return 0

  const media = (min + max) / 2
  const diff = (media - mq) / media // positivo = sottomercato

  if (diff >= 0.40) return 50  // >40% sotto media OMI → jackpot
  if (diff >= 0.30) return 42
  if (diff >= 0.20) return 35
  if (diff >= 0.10) return 25
  if (diff >= 0)    return 15  // sotto media ma meno del 10%
  if (mq <= max)    return 5   // tra media e max OMI
  return 0                     // sopra max OMI
}

// ─── B) Tempo sul mercato relativo (max 20pt) ────────────────────────────────
// Confronta giorni in vendita di questa casa vs media delle case simili
// Ratio alto = venditore motivato a vendere

export function scoreTempoMercato(property, allProperties) {
  const giorni = daysOnMarket(property.data_creazione)
  if (giorni === null) return 0

  const simili = allProperties.filter(
    (p) =>
      p.id !== property.id &&
      p.stato_immobile === property.stato_immobile &&
      p.data_creazione
  )

  if (!simili.length) return giorni > 60 ? 10 : 5

  const mediaGiorni =
    simili.reduce((acc, p) => acc + daysOnMarket(p.data_creazione), 0) /
    simili.length

  const ratio = giorni / mediaGiorni

  if (ratio >= 2.0) return 20
  if (ratio >= 1.5) return 16
  if (ratio >= 1.2) return 12
  if (ratio >= 1.0) return 8
  return 3
}

// ─── C) Velocità ristrutturate vicine entro 50m (max 15pt) ───────────────────
// Case "Ottimo / Ristrutturato" nel raggio 50m → se si vendono veloce
// significa che c'è domanda attiva post-ristrutturazione in quella micro-area

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

  if (!vicine.length) return 7 // dati insufficienti → neutro

  const mediaGiorni =
    vicine.reduce((acc, p) => acc + (daysOnMarket(p.data_creazione) ?? 90), 0) /
    vicine.length

  if (mediaGiorni <= 30)  return 15
  if (mediaGiorni <= 60)  return 12
  if (mediaGiorni <= 90)  return 9
  if (mediaGiorni <= 150) return 5
  return 2
}

// ─── D) Stato immobile (max 8pt) ─────────────────────────────────────────────
// Da ristrutturare = margine massimo di guadagno
// Buono/Abitabile = margine ridotto ma presente

export function scoreStato(property) {
  switch (property.stato_immobile) {
    case 'Da ristrutturare':  return 8
    case 'Buono / Abitabile': return 4
    default:                  return 0
  }
}

// ─── E) Fattori immobile (max 7pt, con penalità) ─────────────────────────────
// Ascensore, piano e numero locali influenzano la rivendibilità
// Penalità forte per piani alti senza ascensore (difficili da rivendere)

export function scorefattoriImmobile(property) {
  let pt = 0

  const piano = property.piano ?? 0
  const ascensore = property.ascensore ?? false
  const locali = property.locali ?? 0

  // Ascensore
  if (ascensore) pt += 2

  // Piano
  if (piano >= 2 && piano <= 5) pt += 2
  else if (piano === 1) pt += 1

  // Penalità piano alto senza ascensore
  if (!ascensore && piano >= 5) pt -= 20
  else if (!ascensore && piano >= 4) pt -= 10

  // Liquidità per numero locali (bilocali più liquidi in zona)
  if (locali === 2)      pt += 3
  else if (locali === 3) pt += 2
  else if (locali >= 4)  pt += 1

  return pt
}

// ─── Score totale ─────────────────────────────────────────────────────────────

const STATI_SCORABILI = ['Da ristrutturare', 'Buono / Abitabile']

export function calcolaScore(property, allProperties, omiRows) {
  if (!STATI_SCORABILI.includes(property.stato_immobile)) return null

  const a = scoreOMI(property, omiRows)
  const b = scoreTempoMercato(property, allProperties)
  const c = scoreRistrutturationeVicine(property, allProperties)
  const d = scoreStato(property)
  const e = scorefattoriImmobile(property)

  const totale = Math.min(100, Math.max(0, a + b + c + d + e))

  return {
    totale,
    dettaglio: { omi: a, tempo: b, vicine: c, stato: d, fattori: e },
  }
}

// ─── Calcola score per tutti gli immobili ────────────────────────────────────

export function calcolaTuttiGliScore(allRawProperties, omiRows) {
  return allRawProperties.map((p) => ({
    ...p,
    scoring: calcolaScore(p, allRawProperties, omiRows),
  }))
}