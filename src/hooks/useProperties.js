import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function mapRow(row) {
  return {
    id:           row.id,
    address:      row.indirizzo ?? '',
    fullAddress:  `${row.tipologia ?? ''} ${row.indirizzo ?? ''}, ${row.microzona ?? ''}, Torino`,
    price:        row.prezzo_valore ?? 0,
    size:         row.superficie ?? 0,
    rooms:        row.locali ?? 0,
    floor:        row.piano ?? 0,
    hasElevator:  row.ascensore ?? false,
    lat:          row.latitudine ?? 45.093,
    lng:          row.longitudine ?? 7.685,
    stato:        row.stato_immobile ?? null,
    imageUrl:     row.immagine_stanza ?? null,
    pricePerMq:   row.prezzo_mq ?? null,
    url:          row.url ?? null,
  }
}

export function useProperties() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  useEffect(() => {
    async function fetch() {
      const { data, error } = await supabase
        .from('barriera-di-milano-attuale')
        .select('id, indirizzo, tipologia, microzona, prezzo_valore, superficie, locali, piano, ascensore, latitudine, longitudine, stato_immobile, immagine_stanza, prezzo_mq, url')
        .order('id')

      if (error) { setError(error.message); setLoading(false); return }
      setProperties((data ?? []).map(mapRow))
      setLoading(false)
    }
    fetch()
  }, [])

  return { properties, loading, error }
}