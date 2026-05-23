export function scoreOMI(property, omiRows) {
  const mq = property.prezzo_mq
  if (!mq || !omiRows?.length) return { pt: 0, meta: null }

  // Usiamo SEMPRE Abitazioni civili + Normale come riferimento
  // È il benchmark corretto per case da ristrutturare in zona
  const omiRow = omiRows.find(
    (r) =>
      r.tipologia === 'Abitazioni civili' &&
      r.stato_conservativo === 'Normale'
  )

  if (!omiRow) return { pt: 0, meta: null }

  const min = omiRow.prezzo_min
  const max = omiRow.prezzo_max
  const media = (min + max) / 2
  const diff = (media - mq) / media // positivo = sottomercato

  let pt = 0
  if (diff >= 0.40)      pt = 100
  else if (diff >= 0.30) pt = 84
  else if (diff >= 0.20) pt = 70
  else if (diff >= 0.10) pt = 50
  else if (diff >= 0)    pt = 30
  else if (mq <= max)    pt = 10
  else                   pt = 0

  return {
    pt,
    meta: {
      prezzoMq: mq,
      omiMin: min,
      omiMax: max,
      omiMedia: Math.round(media),
      sconto: Math.round(diff * 100),
    }
  }
}