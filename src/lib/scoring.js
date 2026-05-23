import { scoreOMI } from './variables/omi'
import { scoreVelocitaVendita } from './variables/velocitaVendita'

const PESI = {
  omi:      0.60,
  velocita: 0.40,
}

const STATI_SCORABILI = ['Da ristrutturare']

export function calcolaScore(property, omiRows, storicoRows) {
  if (!STATI_SCORABILI.includes(property.stato_immobile)) return null

  const omi      = scoreOMI(property, omiRows)
  const velocita = scoreVelocitaVendita(property, storicoRows)

  const totale = Math.round(
    omi.pt      * PESI.omi +
    velocita.pt * PESI.velocita
  )

  return {
    totale: Math.min(100, Math.max(0, totale)),
    dettaglio: {
      omi: {
        pt:  Math.round(omi.pt      * PESI.omi),
        max: Math.round(100         * PESI.omi),
        meta: omi.meta,
      },
      velocita: {
        pt:  Math.round(velocita.pt * PESI.velocita),
        max: Math.round(100         * PESI.velocita),
        meta: velocita.meta,
      },
    },
  }
}

export function calcolaTuttiGliScore(allRawProperties, omiRows, storicoRows) {
  return allRawProperties.map((p) => ({
    ...p,
    scoring: calcolaScore(p, omiRows, storicoRows ?? []),
  }))
}