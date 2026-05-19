import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Mappa stato_immobile del DB → tipo usato nell'app
// ⚠️ Controlla i valori esatti nella tua colonna stato_immobile e aggiusta qui
function mapStato(stato) {
  if (!stato) return 'non-ristrutturato'
  const s = stato.toLowerCase()
  if (s.includes('ottim') || s.includes('ristrutturato') || s.includes('buon') || s.includes('nuovo')) {
    return 'ristrutturato'
  }
  return 'non-ristrutturato'
}

function mapRow(row) {
  return {
    id: row.id,
    address: row.indirizzo ?? '',
    fullAddress: `${row.tipologia ?? ''} ${row.indirizzo ?? ''}, ${row.microzona ?? ''}, Torino`,
    price: row.prezzo_valore ?? 0,
    size: row.superficie ?? 0,
    rooms: row.locali ?? 0,
    bathrooms: row.bagni ?? 0,
    floor: row.piano ?? 0,
    hasElevator: row.ascensore ?? false,
    lat: row.latitudine ?? 45.093,
    lng: row.longitudine ?? 7.685,
    type: mapStato(row.stato_immobile),
    badge: row.label_extra ?? null,
    imageUrl: row.immagine_stanza ?? null,
    pricePerMq: row.prezzo_mq ?? null,
    url: row.url ?? null,
    financing: row.acconto_percentuale
      ? Math.round((row.prezzo_valore ?? 0) * row.acconto_percentuale / 100)
      : null,
    score: null, // non presente in DB
    yearBuilt: null,
    imageCount: null,
  }
}

export function useProperties() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetch() {
      const { data, error } = await supabase
        .from('barriera-di-milano')
        .select('*')
        .order('id')

      if (error) {
        setError(error.message)
      } else {
        setProperties((data ?? []).map(mapRow))
      }
      setLoading(false)
    }
    fetch()
  }, [])

  return { properties, loading, error }
}