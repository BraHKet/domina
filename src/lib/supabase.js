import { createClient } from '@supabase/supabase-js'

// navigator.locks causa deadlock su Chrome con Memory Saver e su Safari.
// Mutex in-memory: serializza le operazioni auth senza usare API browser instabili.
let lockQueue = Promise.resolve()
const memoryLock = async (_name, _timeout, fn) => {
  let release
  const next = new Promise(r => { release = r })
  const prev = lockQueue
  lockQueue = next
  await Promise.race([prev, new Promise(r => setTimeout(r, 8000))])
  try {
    return await fn()
  } finally {
    release()
  }
}

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { lock: memoryLock } }
)
