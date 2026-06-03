import { useState, useEffect } from 'react'
import { getVistiLocali, getSeguitiLocali, getVistiRemoti, getSeguitiRemoti } from '../lib/visti'

export function useVisti(userId) {
  const [visti,   setVisti]   = useState(new Set())
  const [seguiti, setSeguiti] = useState(new Set())

  async function refresh() {
    if (userId) {
      const [v, s] = await Promise.all([getVistiRemoti(userId), getSeguitiRemoti(userId)])
      setVisti(v)
      setSeguiti(s)
    } else {
      setVisti(getVistiLocali())
      setSeguiti(getSeguitiLocali())
    }
  }

  useEffect(() => { refresh() }, [userId])

  return { visti, seguiti, refresh }
}