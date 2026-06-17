import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function mapRow(row) {
  const oggi = new Date()
  const dataCreazione = row.data_creazione ? new Date(row.data_creazione) : null
  const giorniMercato = dataCreazione
    ? Math.floor((oggi - dataCreazione) / (1000 * 60 * 60 * 24))
    : null

  const s = row.stato_immobile?.toLowerCase() ?? ''
  const type = row.stato_immobile ?? null

  return {
    id:           row.id,
    address:      row.indirizzo ?? '',
    fullAddress:  `${row.tipologia ?? ''} ${row.indirizzo ?? ''}, ${row.microzona ?? ''}, ${row.citta ?? ''}`,
    price:        row.prezzo_valore ?? 0,
    size:         row.superficie ?? 0,
    rooms:        row.locali ?? 0,
    floor:        row.piano ?? 0,
    hasElevator:  row.ascensore ?? false,
    lat:          row.latitudine ?? 45.093,
    lng:          row.longitudine ?? 7.685,
    stato:        row.stato_immobile ?? null,
    type,                                      // ← aggiunto
    imageUrl:     row.immagine_stanza ?? null,
    pricePerMq:   row.prezzo_mq ?? null,
    url:          row.url ?? null,
    agenzia:      row.agenzia ?? null,
    cellulare:    row.cellulare ?? null,
    zona:         row.microzona ?? null,
    giorniMercato,
  }
}
export function useProperties() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading]       = useState(true)
  const [fetchError, setFetchError] = useState(null)

  useEffect(() => {
    async function fetch() {
      const { data, error: supabaseError } = await supabase
        .from('annunci_attuali')
        .select('id, indirizzo, tipologia, microzona, prezzo_valore, superficie, locali, piano, ascensore, latitudine, longitudine, stato_immobile, immagine_stanza, prezzo_mq, url, data_creazione, agenzia, cellulare')
        .order('id')

      if (supabaseError) {
        setFetchError(supabaseError.message)
        setLoading(false)
        return
      }

      setProperties((data ?? []).map(mapRow))
      setLoading(false)
    }

    fetch()
  }, [])

  return { properties, loading, error: fetchError }
}