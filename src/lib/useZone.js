import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export function useZone() {
  const [zone, setZone] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchZone()
  }, [])

  async function fetchZone() {
    setLoading(true)
    const { data, error } = await supabase
      .from('zone_interesse')
      .select('*')
      .order('created_at')
    if (!error) setZone(data ?? [])
    setLoading(false)
  }

  async function addZona(zona) {
    const { data, error } = await supabase
      .from('zone_interesse')
      .insert([zona])
      .select()
      .single()
    if (!error && data) setZone(prev => [...prev, data])
    return { data, error }
  }

  async function removeZona(id) {
    const { error } = await supabase
      .from('zone_interesse')
      .delete()
      .eq('id', id)
    if (!error) setZone(prev => prev.filter(z => z.id !== id))
  }

  async function updateZona(id, updates) {
    const { data, error } = await supabase
      .from('zone_interesse')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error && data) setZone(prev => prev.map(z => z.id === id ? data : z))
    return { data, error }
  }

  return { zone, loading, fetchZone, addZona, removeZona, updateZona }
}