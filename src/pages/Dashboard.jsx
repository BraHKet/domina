import MapView from '../components/map/MapView'
import { useProperties } from '../hooks/useProperties'

export default function Dashboard() {
  const { properties, loading } = useProperties()

  if (loading) return <div className="p-8 text-gray-400">Caricamento mappa...</div>

  return (
    <div className="p-8" style={{ height: 'calc(100vh - 82px)' }}>
      <MapView
        center={[45.093, 7.685]}
        zoom={15}
        markers={properties.filter(p => p.score !== null && p.score >= 60)}
        markerType="house"
        height="100%"
      />
    </div>
  )
}