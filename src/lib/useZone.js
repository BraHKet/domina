import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export function useZone(userId) {
  const [zone, setZone]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchZone()
  }, [userId])

  async function fetchZone() {
    setLoading(true)
    console.log('Fetching zones for userId:', userId)
    let query = supabase.from('zone_interesse').select('*').order('created_at')
    if (userId) {
      query = query.eq('user_id', userId)
    }
    else query = query.is('user_id', null)

    const { data: { session } } = await supabase.auth.getSession()
console.log('session al momento della query:', session?.access_token?.slice(0, 20))
    const { data, error } = await query
    console.log('fetchZone result:', data, error)
    setZone(data ?? [])
    setLoading(false)
  }

  async function addZona(zona) {
    const payload = userId ? { ...zona, user_id: userId } : zona
    const { data, error } = await supabase
      .from('zone_interesse').insert([payload]).select().single()
    if (!error && data) setZone(prev => [...prev, data])
    return { data, error }
  }

  async function removeZona(id) {
    const { error } = await supabase.from('zone_interesse').delete().eq('id', id)
    if (!error) setZone(prev => prev.filter(z => z.id !== id))
  }

  async function updateZona(id, updates) {
    const { data, error } = await supabase
      .from('zone_interesse').update(updates).eq('id', id).select().single()
    if (!error && data) setZone(prev => prev.map(z => z.id === id ? data : z))
    return { data, error }
  }

  return { zone, loading, fetchZone, addZona, removeZona, updateZona }
}