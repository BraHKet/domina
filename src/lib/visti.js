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
  const { data } = await supabase
    .from('annunci_visti')
    .select('annuncio_id')
    .eq('user_id', userId)
  return new Set((data ?? []).map(r => r.annuncio_id))
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
  const { data } = await supabase
    .from('annunci_seguiti')
    .select('annuncio_id')
    .eq('user_id', userId)
  return new Set((data ?? []).map(r => r.annuncio_id))
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