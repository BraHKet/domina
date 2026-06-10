import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate('/dashboard', { replace: true })
      } else {
        // Aspetta un attimo che Supabase processi l'hash
        setTimeout(() => {
          navigate('/dashboard', { replace: true })
        }, 1000)
      }
    })
  }, [])

  return <div style={{ color: 'white', padding: 40 }}>Accesso in corso...</div>
}