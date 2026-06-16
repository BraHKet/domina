import { supabase } from './supabase'

const LS_VISTI   = 'domina_visti'
const LS_SEGUITI = 'domina_seguiti'

// ── localStorage helpers ──────────────────────────────────────────────────────

function lsGet(key) {
  try { return new Set(JSON.parse(localStorage.getItem(key) ?? '[]')) }
  catch { return new Set() }
}

function lsSet(key, set) {
  localStorage.setItem(key, JSON.stringify([...set]))
}

// Supabase/PostgREST limita ogni query a 1000 righe di default: senza paginare,
// utenti con più di 1000 annunci_visti/annunci_seguiti perdono silenziosamente
// le righe oltre la millesima (spesso le più recenti).
async function fetchAllAnnuncioIds(table, userId) {
  const pageSize = 1000
  let tutte = []
  let offset = 0
  while (true) {
    const { data } = await supabase
      .from(table)
      .select('annuncio_id')
      .eq('user_id', userId)
      .range(offset, offset + pageSize - 1)
    if (!data || data.length === 0) break
    tutte = tutte.concat(data)
    if (data.length < pageSize) break
    offset += pageSize
  }
  return tutte
}

// ── Visti ─────────────────────────────────────────────────────────────────────

export function getVistiLocali() { return lsGet(LS_VISTI) }

export function marcaVistoLocale(id) {
  const s = lsGet(LS_VISTI)
  s.add(String(id))
  lsSet(LS_VISTI, s)
}

export async function marcaVisto(id, userId) {
  marcaVistoLocale(id)
  if (!userId) return
  await supabase.from('annunci_visti').upsert({ user_id: userId, annuncio_id: String(id) })
}

export async function getVistiRemoti(userId) {
  if (!userId) return new Set()
  const data = await fetchAllAnnuncioIds('annunci_visti', userId)
  return new Set(data.map(r => r.annuncio_id))
}

// ── Seguiti ───────────────────────────────────────────────────────────────────

export function getSeguitiLocali() { return lsGet(LS_SEGUITI) }

export async function toggleSeguito(id, userId) {
  const s = lsGet(LS_SEGUITI)
  const sid = String(id)
  if (s.has(sid)) {
    s.delete(sid)
    lsSet(LS_SEGUITI, s)
    if (userId) await supabase.from('annunci_seguiti').delete().eq('user_id', userId).eq('annuncio_id', sid)
  } else {
    s.add(sid)
    lsSet(LS_SEGUITI, s)
    if (userId) await supabase.from('annunci_seguiti').upsert({ user_id: userId, annuncio_id: sid })
  }
  return s.has(sid)
}

export async function getSeguitiRemoti(userId) {
  if (!userId) return new Set()
  const data = await fetchAllAnnuncioIds('annunci_seguiti', userId)
  return new Set(data.map(r => r.annuncio_id))
}

// ── Sync localStorage → Supabase al login ────────────────────────────────────

export async function syncAlLogin(userId) {
  const vistiLocali   = lsGet(LS_VISTI)
  const seguitiLocali = lsGet(LS_SEGUITI)

  if (vistiLocali.size > 0) {
    await supabase.from('annunci_visti').upsert(
      [...vistiLocali].map(id => ({ user_id: userId, annuncio_id: id }))
    )
  }
  if (seguitiLocali.size > 0) {
    await supabase.from('annunci_seguiti').upsert(
      [...seguitiLocali].map(id => ({ user_id: userId, annuncio_id: id }))
    )
  }
}

export function isSeguito(id) {
  return lsGet(LS_SEGUITI).has(String(id))
}

export async function rimuoviSeguiti(ids, userId) {
  const s = lsGet(LS_SEGUITI)
  ids.forEach(id => s.delete(String(id)))
  lsSet(LS_SEGUITI, s)
  if (userId && ids.length > 0) {
    await supabase.from('annunci_seguiti')
      .delete()
      .eq('user_id', userId)
      .in('annuncio_id', ids.map(String))
  }
}
