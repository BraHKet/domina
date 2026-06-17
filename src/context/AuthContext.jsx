import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, resetSupabaseClient } from '../lib/supabase'
import { syncAlLogin } from '../lib/visti'

const AuthContext = createContext(null)

function subscribeToAuth(client, setUser, setLoading) {
  client.auth.getSession().then(({ data }) => {
    console.log('SESSION:', data.session)
    setUser(data.session?.user ?? null)
    setLoading(false)
  })
  const { data: listener } = client.auth.onAuthStateChange(async (event, session) => {
    console.log('AUTH EVENT:', event, session)
    const u = session?.user ?? null
    setUser(u)
    setLoading(false)
    if (event === 'SIGNED_IN' && u) {
      await syncAlLogin(u.id)
    }
  })
  return () => listener.subscription.unsubscribe()
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubscribe = subscribeToAuth(supabase, setUser, setLoading)
    let hiddenAt = null

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
      } else if (document.visibilityState === 'visible' && hiddenAt) {
        const away = Date.now() - hiddenAt
        hiddenAt = null
        if (away > 15000) {
          unsubscribe()
          resetSupabaseClient()
          unsubscribe = subscribeToAuth(supabase, setUser, setLoading)
        }
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      unsubscribe()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
