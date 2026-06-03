import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { calcolaTuttiGliScore } from '../lib/scoring'
import { scoreOMI } from '../lib/variables/omi'

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
    primaDataVista: row.primaDataVista ?? null,
    yearBuilt: null,
    imageCount: null,
  }
}

async function fetchStoricoAll(ids) {
  const PAGE = 1000
  let from = 0
  let allRows = []

  while (true) {
    const { data, error } = await supabase
      .from('barriera-di-milano-storico')
      .select('id, data_scraping, prezzo_valore, data_creazione, stato_immobile, latitudine, longitudine')
      .in('id', ids)
      .range(from, from + PAGE - 1)

    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break

    allRows = [...allRows, ...data]

    if (data.length < PAGE) break
    from += PAGE
  }

  return allRows
}

export function useProperties() {
  const [properties, setProperties] = useState([])
  const [dateUniche, setDateUniche] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchAll() {
      const [
        { data: propData,  error: propError },
        { data: omiData,   error: omiError },
      ] = await Promise.all([
        supabase.from('barriera-di-milano-attuale').select('*').order('id'),
        supabase.from('tabella-omi-barriera-di-milano').select('*'),
      ])

      if (propError || omiError) {
        setError(propError?.message ?? omiError?.message)
        setLoading(false)
        return
      }

      const ids = (propData ?? [])
        .filter(p => p.stato_immobile?.toLowerCase().includes('da ristrutturare'))
        .filter(p => scoreOMI(p, omiData).pt >= 60)
        .map(p => p.id)

      let storicoData = []
      try {
        storicoData = await fetchStoricoAll(ids)
      } catch (e) {
        setError(e.message)
        setLoading(false)
        return
      }

      // date uniche ordinate
      const date = [...new Set(storicoData.map(r => toISO(r.data_scraping)))]
        .filter(Boolean).sort()
      setDateUniche(date)

      // per ogni proprietà, trova la prima data in cui compare nello storico
      const primaDataPerId = {}
      for (const r of storicoData) {
        const id = String(r.id)
        const iso = toISO(r.data_scraping)
        if (!iso) continue
        if (!primaDataPerId[id] || iso < primaDataPerId[id]) {
          primaDataPerId[id] = iso
        }
      }

      const withScores = calcolaTuttiGliScore(
        propData    ?? [],
        omiData     ?? [],
        storicoData ?? [],
      ).map(p => ({
        ...p,
        primaDataVista: primaDataPerId[String(p.id)] ?? null,
      }))

      setProperties(withScores.map(mapRow))
      setLoading(false)
    }

    fetchAll()
  }, [])

  return { properties, dateUniche, loading, error }
}