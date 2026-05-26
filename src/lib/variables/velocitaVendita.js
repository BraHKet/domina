import { haversineMeters } from './haversineMeters'

/*
Converte una data in formato ISO (`YYYY-MM-DD`). Gestisce due casi:

1. **Data con slash** (es. `"25/05/2026 14:30"`) → splitta su `/`, riordina le parti da `DD/MM/YYYY` a `YYYY-MM-DD`, ignorando l'eventuale orario.

2. **Altra stringa** (es. un ISO già pronto come `"2026-05-25T14:30:00"`) → prende solo i primi 10 caratteri, cioè `"2026-05-25"`.

Gestisce anche i casi limite:
- **Valore falsy** (`null`, `undefined`, `""`) → restituisce `''`
- **Padding** con `padStart(2,'0')` per garantire mese e giorno sempre a due cifre (es. `"5"` → `"05"`)


NON PRENDE L'ORARIO 
*/


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



// Calcola quanti giorni sono passati da una data di creazione ad oggi

function daysOnMarket(dataCreazione) {
  if (!dataCreazione) return null
  const iso = toISO(dataCreazione)
  const ms = new Date(iso).getTime()
  if (isNaN(ms)) return null
  return Math.max(0, Math.floor((Date.now() - ms) / 86400000))
}

export function scoreVelocitaVendita(property, storicoRows) {

  // ── PARTE 1 ──────────────────

  const mioGiorni = daysOnMarket(property.data_creazione)   // calcola giorni da data di creazione dell'annuncio target



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

  // CALCOLO SCORE

  let ptTempo = 50 // neutro se manca il dato

  if (mioGiorni !== null) {
      // nessuna media zona disponibile → giorni assoluti
    if      (mioGiorni <= 30)  ptTempo = 15
    else if (mioGiorni <= 60)  ptTempo = 35
    else if (mioGiorni <= 120) ptTempo = 55
    else if (mioGiorni <= 240) ptTempo = 75
    else                       ptTempo = 90
  }

  let ptRibassi = 10 // neutro se storico insufficiente

  if (storicoAnnuncio.length > 1) {
    if      (numRibassi === 0) ptRibassi = 10
    else if (numRibassi === 1) ptRibassi = 50
    else if (numRibassi === 2) ptRibassi = 65
    else if (numRibassi === 3) ptRibassi = 80
    else                       ptRibassi = 95
  }

  const pt = Math.round(Math.pow(ptTempo, 0.3) * Math.pow(ptRibassi, 0.7))

  const storicoMappato = storicoAnnuncio.map(r => ({
    data:   toISO(r.data_scraping),
    prezzo: r.prezzo_valore,
  }))

  return {
    pt,
    meta: {
      mioGiorni,
      numRibassi,
      ptTempo,
      ptRibassi,
      storicoAnnuncio: storicoMappato,  // ← così
    },
  }
}