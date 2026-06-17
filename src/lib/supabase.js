import { createClient } from '@supabase/supabase-js'

// navigator.locks causa deadlock in certi browser (es. Safari, pagine in bfcache).
// Questo mutex in-memory serializza le operazioni auth senza usare API browser instabili.
let lockQueue = Promise.resolve()
const memoryLock = async (_name, _timeout, fn) => {
  let release
  const next = new Promise(r => { release = r })
  const prev = lockQueue
  lockQueue = next
  await prev
  try {
    return await fn()
  } finally {
    release()
  }
}

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      lock: memoryLock,
    },
  }
)