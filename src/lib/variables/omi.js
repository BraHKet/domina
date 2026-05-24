export function scoreOMI(property, omiRows) {
  const mq = property.prezzo_mq
  if (!mq || !omiRows?.length) return { pt: 0, meta: null }

  const omiRow = omiRows.find(
    r => r.tipologia === 'Abitazioni civili' && r.stato_conservativo === 'Normale'
  )
  if (!omiRow) return { pt: 0, meta: null }

  const min = omiRow.prezzo_min
  const max = omiRow.prezzo_max
  const range = max - min

  // x = 0 quando mq === max OMI → score 50
  // x negativo → sotto max → score sale verso 100
  // x positivo → sopra max → score scende verso 0
  const x = (mq - max) / range  // normalizzato sul range OMI

  // sigmoide: 100 / (1 + e^(k*x))
  // k controlla la ripidità della curva
  const k = 4
  const pt = Math.round(100 / (1 + Math.exp(k * x)))

  return {
    pt,
    meta: {
      prezzoMq: mq,
      omiMin: min,
      omiMax: max,
      omiMedia: Math.round((min + max) / 2),
      sconto: Math.round(((max - mq) / max) * 100),
    }
  }
}