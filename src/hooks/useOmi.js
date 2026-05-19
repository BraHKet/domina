import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useOmi() {
  const [omiData, setOmiData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetch() {
      const { data, error } = await supabase
        .from('tabella-omi-barriera-di-milano')
        .select('*')

      if (error) {
        setError(error.message)
      } else {
        setOmiData(data ?? [])
      }
      setLoading(false)
    }
    fetch()
  }, [])

  return { omiData, loading, error }
}