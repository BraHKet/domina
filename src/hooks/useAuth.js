import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { syncAlLogin } from '../lib/visti'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      console.log('SESSION:', data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AUTH EVENT:', event, session)
      const u = session?.user ?? null
      setUser(u)
      if (event === 'SIGNED_IN' && u) {
        await syncAlLogin(u.id)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return { user, loading } 
}