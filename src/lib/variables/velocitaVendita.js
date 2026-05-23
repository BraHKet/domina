import { haversineMeters } from './haversineMeters'

const RAGGIO_METRI = 200

function toISO(val) {
  if (!val) return ''
  const s = String(val).trim()
  if (s.includes('/')) {
    const [datePart] = s.split(' ')
    const [d, m, y] = datePart.split('/')
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
  }
  return s.slice(0, 10)
}

function daysOnMarket(dataCreazione) {
  if (!dataCreazione) return null
  const iso = toISO(dataCreazione)
  const ms = new Date(iso).getTime()
  if (isNaN(ms)) return null
  return Math.max(0, Math.floor((Date.now() - ms) / 86400000))
}

export function scoreVelocitaVendita(property, storicoRows) {

  // ── PARTE 1: liquidità di zona all'ultima data di scraping ──────────────────
  const dateDisponibili = [...new Set(
    storicoRows.map(r => toISO(r.data_scraping)).filter(Boolean)
  )].sort()
  const ultimoGiorno = dateDisponibili[dateDisponibili.length - 1]

  let ptZona = 50
  let mediaZonaGiorni = null
  let countVicini = 0
  const mioGiorni = daysOnMarket(property.data_creazione)

  if (ultimoGiorno) {
    const rowsUltimaData = storicoRows.filter(
      r => toISO(r.data_scraping) === ultimoGiorno
    )

    const vicini = rowsUltimaData.filter(r =>
      String(r.id) !== String(property.id) &&
      r.stato_immobile === 'Da ristrutturare' &&
      r.latitudine && r.longitudine &&
      haversineMeters(
        property.latitudine, property.longitudine,
        r.latitudine,        r.longitudine
      ) <= RAGGIO_METRI
    )

    countVicini = vicini.length

    if (vicini.length > 0) {
      mediaZonaGiorni = Math.round(
        vicini.reduce((acc, r) => acc + (daysOnMarket(r.data_creazione) ?? 90), 0) /
        vicini.length
      )

      if      (mediaZonaGiorni <= 30)  ptZona = 90
      else if (mediaZonaGiorni <= 60)  ptZona = 75
      else if (mediaZonaGiorni <= 90)  ptZona = 55
      else if (mediaZonaGiorni <= 150) ptZona = 35
      else                             ptZona = 15
    }
  }

  // ── PARTE 2: ribassi storici prezzo dello stesso annuncio ───────────────────
  const storicoAnnuncio = storicoRows
    .filter(r => String(r.id) === String(property.id) && r.data_scraping && r.prezzo_valore != null)
    .sort((a, b) => toISO(a.data_scraping).localeCompare(toISO(b.data_scraping)))

  let numRibassi = 0
  for (let i = 1; i < storicoAnnuncio.length; i++) {
    if (storicoAnnuncio[i].prezzo_valore < storicoAnnuncio[i - 1].prezzo_valore) {
      numRibassi++
    }
  }

  let ptRibassi = 50
  if (storicoAnnuncio.length > 1) {
    if      (numRibassi === 0) ptRibassi = 20
    else if (numRibassi === 1) ptRibassi = 55
    else if (numRibassi === 2) ptRibassi = 75
    else                       ptRibassi = 90
  }

  const pt = Math.round(ptZona * 0.6 + ptRibassi * 0.4)

  return {
    pt: Math.min(100, Math.max(0, pt)),
    meta: {
      mediaZonaGiorni,
      countVicini,
      mioGiorni,
      numRibassi,
      storicoAnnuncio: storicoAnnuncio.map(r => ({
        data:   toISO(r.data_scraping),
        prezzo: r.prezzo_valore,
      })),
    },
  }
}