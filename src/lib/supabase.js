import { createClient } from '@supabase/supabase-js'

const noOpLock = async (name, acquireTimeout, fn) => {
  return await fn()
}

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      lock: noOpLock,
    },
  }
)