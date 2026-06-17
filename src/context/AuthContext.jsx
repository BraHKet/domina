import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { syncAlLogin } from '../lib/visti'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
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
      setLoading(false)
      if (event === 'SIGNED_IN' && u) {
        await syncAlLogin(u.id)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
