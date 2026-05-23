import { haversineMeters } from './haversineMeters'

const RAGGIO_SIMILI_METRI = 500 // ← cambia qui il raggio

function daysOnMarket(dataCreazione) {
  if (!dataCreazione) return null
  const nowSec = Date.now() / 1000
  return Math.max(0, Math.floor((nowSec - dataCreazione) / 86400))
}

export function scoreTempoMercato(property, allProperties) {
  const giorni = daysOnMarket(property.data_creazione)
  if (giorni === null) return { pt: 0, meta: null }

  const simili = allProperties.filter(
    (p) =>
      p.id !== property.id &&
      p.stato_immobile === property.stato_immobile &&
      p.data_creazione &&
      p.latitudine &&
      p.longitudine &&
      haversineMeters(
        property.latitudine,
        property.longitudine,
        p.latitudine,
        p.longitudine
      ) <= RAGGIO_SIMILI_METRI
  )

  let pt = 0
  let mediaGiorni = null

  if (!simili.length) {
    pt = giorni > 60 ? 50 : 25
  } else {
    mediaGiorni = Math.round(
      simili.reduce((acc, p) => acc + daysOnMarket(p.data_creazione), 0) /
      simili.length
    )
    const ratio = giorni / mediaGiorni
    if (ratio >= 2.0)      pt = 100
    else if (ratio >= 1.5) pt = 80
    else if (ratio >= 1.2) pt = 60
    else if (ratio >= 1.0) pt = 40
    else                   pt = 15
  }

  return {
    pt,
    meta: { giorni, mediaZona: mediaGiorni }
  }
}