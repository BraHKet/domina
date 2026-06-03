import { useState } from 'react'
import MapView from '../components/map/MapView'
import { useProperties } from '../hooks/useProperties'

export default function Dashboard() {
  const { properties, dateUniche, loading } = useProperties()
  const [giorniFiltro, setGiorniFiltro] = useState(null) // null = tutti

  if (loading) return <div className="p-8 text-gray-400">Caricamento mappa...</div>

  // soglia: se giorniFiltro = N, mostra solo proprietà la cui primaDataVista
  // è >= dateUniche[dateUniche.length - N]  (cioè nelle ultime N date di scraping)
  const soglia = giorniFiltro !== null
    ? dateUniche.at(-giorniFiltro) ?? null
    : null

  const visibili = properties
    .filter(p => p.score !== null && p.score >= 60)
    .filter(p => soglia ? (p.primaDataVista ?? '') >= soglia : true)

  const bottoni = [
    { key: null, label: 'Tutti' },
    { key: 1,    label: 'Oggi' },
    { key: 2,    label: '2 giorni' },
    { key: 3,    label: '3 giorni' },
    { key: 5,    label: '5 giorni' },
    { key: 7,    label: '7 giorni' },
  ]

  return (
    <div className="p-8" style={{ height: 'calc(100vh - 82px)', position: 'relative' }}>

      <div style={{
        position: 'absolute', top: '24px', left: '24px', zIndex: 1000,
        display: 'flex', gap: '8px', flexWrap: 'wrap',
      }}>
        {bottoni.map(({ key, label }) => (
          <button
            key={String(key)}
            onClick={() => setGiorniFiltro(key)}
            style={{
              padding: '8px 16px', borderRadius: '10px', border: 'none',
              background: giorniFiltro === key ? '#22C55E' : '#1F2937',
              color: giorniFiltro === key ? '#000' : '#fff',
              fontWeight: '600', fontSize: '13px', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <MapView
        center={[45.093, 7.685]}
        zoom={15}
        markers={visibili}
        markerType="house"
        height="100%"
      />
    </div>
  )
}