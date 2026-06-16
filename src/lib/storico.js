import { supabase } from './supabase'

// Recupera l'ultimo snapshot conosciuto (indirizzo, prezzo, ecc.) per ogni id,
// usato per mostrare i dettagli di annunci che non sono più in barriera-di-milano-attuale.
export async function getUltimoStorico(ids) {
  if (!ids || ids.length === 0) return {}

  const { data } = await supabase
    .from('barriera-di-milano-storico')
    .select('id, indirizzo, prezzo_valore, prezzo_mq, url, data_scraping')
    .in('id', ids.map(Number))
    .order('data_scraping', { ascending: false })

  const result = {}
  ;(data ?? []).forEach(row => {
    const key = String(row.id)
    if (!result[key]) result[key] = row
  })
  return result
}

// Andamento storico completo (indirizzo, prezzo, data) per un singolo annuncio,
// usato per mostrare il grafico del prezzo nel tempo nella scheda di dettaglio.
export async function getStoricoCompleto(id) {
  const { data } = await supabase
    .from('barriera-di-milano-storico')
    .select('data_scraping, prezzo_valore, indirizzo, prezzo_mq, url, immagine_stanza, superficie, locali, piano, ascensore, bagni, stato_immobile, tipologia')
    .eq('id', Number(id))
    .order('data_scraping', { ascending: true })
  return data ?? []
}
