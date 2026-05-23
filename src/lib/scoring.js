import { scoreOMI } from './variables/omi'
import { scoreTempoMercato } from './variables/tempoMercato'
import { scoreRistrutturatoVicine } from './variables/ristrutturatoVicine'
import { scorefattoriImmobile } from './variables/fattoriImmobile'

// ─── Pesi ─────────────────────────────────────────────────────────────────────
// Ogni variabile restituisce un punteggio normalizzato 0-100
// I pesi qui sotto determinano quanto incide ciascuna sul totale
// La somma dei pesi deve essere 100

const PESI = {
  omi:     0.50,  // 55% — sconto rispetto ai prezzi OMI
  tempo:   0.15,  // 10% — tempo sul mercato (indicatore ambiguo, peso ridotto)
  vicine:  0.20,  // 20% — velocità vendita ristrutturate vicine
  fattori: 0.15,  // 15% — piano, ascensore, locali
}

// ─── Proprietà scorabili ──────────────────────────────────────────────────────

const STATI_SCORABILI = ['Da ristrutturare']

// ─── Score totale ─────────────────────────────────────────────────────────────

export function calcolaScore(property, allProperties, omiRows) {
  if (!STATI_SCORABILI.includes(property.stato_immobile)) return null

  const omi     = scoreOMI(property, omiRows)
  const tempo   = scoreTempoMercato(property, allProperties)
  const vicine  = scoreRistrutturatoVicine(property, allProperties)
  const fattori = scorefattoriImmobile(property)

  const totale = Math.round(
    omi.pt     * PESI.omi +
    tempo.pt   * PESI.tempo +
    vicine.pt  * PESI.vicine +
    fattori.pt * PESI.fattori
  )

  return {
    totale: Math.min(100, Math.max(0, totale)),
    dettaglio: {
      omi:     { pt: Math.round(omi.pt     * PESI.omi),     max: Math.round(100 * PESI.omi),     meta: omi.meta },
      tempo:   { pt: Math.round(tempo.pt   * PESI.tempo),   max: Math.round(100 * PESI.tempo),   meta: tempo.meta },
      vicine:  { pt: Math.round(vicine.pt  * PESI.vicine),  max: Math.round(100 * PESI.vicine),  meta: vicine.meta },
      fattori: { pt: Math.round(fattori.pt * PESI.fattori), max: Math.round(100 * PESI.fattori), meta: fattori.meta },
    },
  }
}

// ─── Calcola score per tutti ──────────────────────────────────────────────────

export function calcolaTuttiGliScore(allRawProperties, omiRows) {
  return allRawProperties.map((p) => ({
    ...p,
    scoring: calcolaScore(p, allRawProperties, omiRows),
  }))
}