import { createClient } from '@supabase/supabase-js'

function createMemoryLock() {
  let lockQueue = Promise.resolve()
  return async (_name, _timeout, fn) => {
    let release
    const next = new Promise(r => { release = r })
    const prev = lockQueue
    lockQueue = next
    // Timeout di 8s: se il lock precedente non si sblocca, procediamo comunque
    await Promise.race([prev, new Promise(r => setTimeout(r, 8000))])
    try {
      return await fn()
    } finally {
      release()
    }
  }
}

function buildClient() {
  return createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    { auth: { lock: createMemoryLock() } }
  )
}

export let supabase = buildClient()

export function resetSupabaseClient() {
  supabase.auth.dispose?.()
  supabase = buildClient()
}
