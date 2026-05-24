import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { calcolaTuttiGliScore } from '../lib/scoring'

function mapStato(stato) {
  if (!stato) return null
  const s = stato.toLowerCase()
  if (s.includes('ottim') || s.includes('ristrutturato')) return 'ristrutturato'
  if (s.includes('da ristrutturare'))                     return 'non-ristrutturato'
  return null 
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
    stato_immobile: row.stato_immobile ?? null,
    badge: row.label_extra ?? null,
    imageUrl: row.immagine_stanza ?? null,
    pricePerMq: row.prezzo_mq ?? null,
    url: row.url ?? null,
    financing: row.acconto_percentuale
      ? Math.round((row.prezzo_valore ?? 0) * row.acconto_percentuale / 100)
      : null,
    score: row.scoring?.totale ?? null,
    scoreDettaglio: row.scoring?.dettaglio ?? null,
    yearBuilt: null,
    imageCount: null,
  }
}

export function useProperties() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchAll() {
      const [
        { data: propData,     error: propError },
        { data: omiData,      error: omiError },
        { data: storicoData,  error: storicoError },
      ] = await Promise.all([
        supabase.from('barriera-di-milano-attuale').select('*').order('id'),
        supabase.from('tabella-omi-barriera-di-milano').select('*'),
        supabase
          .from('barriera-di-milano-storico')
          .select('id, data_scraping, prezzo_valore, data_creazione, stato_immobile, latitudine, longitudine').limit(10000),
      ])

      if (propError || omiError || storicoError) {
        setError(propError?.message ?? omiError?.message ?? storicoError?.message)
        setLoading(false)
        return
      }

      const withScores = calcolaTuttiGliScore(
        propData  ?? [],
        omiData   ?? [],
        storicoData ?? [],
      )
      setProperties(withScores.map(mapRow))
      console.log('storico 129044216', storicoData.filter(r => String(r.id) === '129044216'))
      setLoading(false)
    }

    fetchAll()
    
  }, [])

  
  return { properties, loading, error }
}