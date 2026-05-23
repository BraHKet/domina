import { haversineMeters } from './haversineMeters'

// Case "Ottimo / Ristrutturato" o "Buono / Abitabile" nel raggio definito
// Se si vendono velocemente → c'è domanda attiva post-ristrutturazione
// nella stessa micro-area → segnale positivo per il flipping

const RAGGIO_METRI = 50 // ← cambia qui il raggio

function daysOnMarket(dataCreazione) {
  if (!dataCreazione) return null
  const nowSec = Date.now() / 1000
  return Math.max(0, Math.floor((nowSec - dataCreazione) / 86400))
}

export function scoreRistrutturatoVicine(property, allProperties) {
  const vicine = allProperties.filter(
    (p) =>
      p.id !== property.id &&
      (p.stato_immobile === 'Ottimo / Ristrutturato' || p.stato_immobile === 'Buono / Abitabile') &&
      p.latitudine &&
      p.longitudine &&
      haversineMeters(
        property.latitudine,
        property.longitudine,
        p.latitudine,
        p.longitudine
      ) <= RAGGIO_METRI
  )

  if (!vicine.length) return { pt: 50, meta: { mediaGiorni: null, count: 0 } } // neutro

  const mediaGiorni = Math.round(
    vicine.reduce((acc, p) => acc + (daysOnMarket(p.data_creazione) ?? 90), 0) /
    vicine.length
  )

  let pt = 0
  if (mediaGiorni <= 30)       pt = 100
  else if (mediaGiorni <= 60)  pt = 80
  else if (mediaGiorni <= 90)  pt = 60
  else if (mediaGiorni <= 150) pt = 30
  else                         pt = 10

  return {
    pt, // normalizzato 0-100, verrà pesato in scoring.js
    meta: { mediaGiorni, count: vicine.length }
  }
}