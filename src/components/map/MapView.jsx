import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'

// Icons defined at module level to avoid recreation on every render
const houseIcon = L.divIcon({
  html: `<div style="width:40px;height:40px;background:#F59E0B;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.25);">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
    </svg>
  </div>`,
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -22],
})

const greenDotIcon = L.divIcon({
  html: `<div style="width:13px;height:13px;background:#22C55E;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.2);"></div>`,
  className: '',
  iconSize: [13, 13],
  iconAnchor: [6, 6],
  popupAnchor: [6, -6],
})

const orangeDotIcon = L.divIcon({
  html: `<div style="width:13px;height:13px;background:#F97316;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.2);"></div>`,
  className: '',
  iconSize: [13, 13],
  iconAnchor: [6, 6],
  popupAnchor: [6, -6],
})

const yellowDotIcon = L.divIcon({
  html: `<div style="width:22px;height:22px;background:#F59E0B;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);"></div>`,
  className: '',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -13],
})

function PopupContent({ property }) {
  return (
    <div style={{ padding: '12px', minWidth: '210px' }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div
          style={{
            width: '58px',
            height: '46px',
            borderRadius: '7px',
            background: '#374151',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          <img
            src={`https://picsum.photos/seed/${property.id}map/58/46`}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { e.target.style.display = 'none' }}
          />
        </div>
        <p style={{ color: 'white', fontWeight: '700', fontSize: '13px', lineHeight: '1.4', margin: 0 }}>
          {property.address}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '10px' }}>
        <div>
          <p style={{ color: '#9CA3AF', fontSize: '10px', margin: '0 0 2px 0' }}>Square</p>
          <p style={{ color: 'white', fontSize: '13px', fontWeight: '600', margin: 0 }}>{property.size} m²</p>
        </div>
        {property.financing && (
          <div>
            <p style={{ color: '#9CA3AF', fontSize: '10px', margin: '0 0 2px 0' }}>Financing</p>
            <p style={{ color: 'white', fontSize: '13px', fontWeight: '600', margin: 0 }}>
              €{(property.financing / 1000).toFixed(1)}K
            </p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ flex: 1, height: '6px', background: '#374151', borderRadius: '3px' }}>
          <div
            style={{
              width: `${(property.score / 10) * 100}%`,
              height: '100%',
              background: '#22C55E',
              borderRadius: '3px',
            }}
          />
        </div>
        <span style={{ color: '#22C55E', fontWeight: '700', fontSize: '14px' }}>
          {property.score}/10
        </span>
      </div>
    </div>
  )
}

const iconMap = {
  house: houseIcon,
  'green-dot': greenDotIcon,
  'orange-dot': orangeDotIcon,
}

export default function MapView({
  center = [45.093, 7.685],
  zoom = 15,
  markers = [],
  selectedProperty = null,
  markerType = 'house',
  cantieri = [],
  zoneRischio = [],
  height = '260px',
  className = '',
}) {
  const icon = iconMap[markerType] ?? greenDotIcon

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height, width: '100%', borderRadius: '14px' }}
      className={className}
      zoomControl={markerType === 'house'}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />

      {/* Regular markers */}
      {markers.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={icon}>
          <Popup closeButton={false}>
            <PopupContent property={p} />
          </Popup>
        </Marker>
      ))}

      {/* Selected property — popup auto-opens */}
      {selectedProperty && (
        <Marker
          position={[selectedProperty.lat, selectedProperty.lng]}
          icon={yellowDotIcon}
          eventHandlers={{ add: (e) => e.target.openPopup() }}
        >
          <Popup closeButton={false} autoClose={false} closeOnClick={false}>
            <PopupContent property={selectedProperty} />
          </Popup>
        </Marker>
      )}

      {/* Cantieri */}
      {cantieri.map((c, i) => (
        <Circle
          key={i}
          center={[c.lat, c.lng]}
          radius={80}
          pathOptions={{ color: '#6B7280', fillColor: '#9CA3AF', fillOpacity: 0.5, weight: 1 }}
        />
      ))}

      {/* Zone a rischio criminalità */}
      {zoneRischio.map((z, i) => (
        <Circle
          key={i}
          center={[z.lat, z.lng]}
          radius={z.radius}
          pathOptions={{ color: '#FCA5A5', fillColor: '#FCA5A5', fillOpacity: 0.3, weight: 0 }}
        />
      ))}
    </MapContainer>
  )
}