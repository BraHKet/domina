// Fattori fisici dell'immobile che influenzano la rivendibilità
// Penalità forte per piani alti senza ascensore (difficili da rivendere)
// Bilocali sono i più liquidi in zona Barriera di Milano

export function scorefattoriImmobile(property) {
  let pt = 50 // partiamo da metà

  const piano = property.piano ?? 0
  const ascensore = property.ascensore ?? false
  const locali = property.locali ?? 0

  // Ascensore
  if (ascensore) pt += 15
  else pt -= 10

  // Piano
  if (piano >= 2 && piano <= 5) pt += 10
  else if (piano === 1) pt += 5
  else if (piano === 0) pt -= 5 // piano terra

  // Penalità piano alto senza ascensore
  if (!ascensore && piano >= 5) pt -= 40
  else if (!ascensore && piano >= 4) pt -= 25

  // Liquidità per numero locali
  if (locali === 2)      pt += 20
  else if (locali === 3) pt += 10
  else if (locali >= 4)  pt += 0
  else if (locali === 1) pt -= 10

  return {
    pt: Math.min(100, Math.max(0, pt)), // normalizzato 0-100
    meta: { piano, ascensore, locali }
  }
}