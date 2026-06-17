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

    // Bug aperto in Supabase + Chrome Memory Saver: la tab sospesa a metà di un
    // refresh token causa uno stato auth incoerente al risveglio. Soluzione pragmatica:
    // reload pulito se la tab era in background per più di 15 secondi.
    let wasHidden = false
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        wasHidden = true
      } else if (document.visibilityState === 'visible' && wasHidden) {
        window.location.reload()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      listener.subscription.unsubscribe()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
