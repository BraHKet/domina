import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { haversineMeters } from '../../lib/variables/haversineMeters'
import { marcaVisto, toggleSeguito, isSeguito } from '../../lib/visti'

// ── Icone marker ──────────────────────────────────────────────────────────────

function makePriceIcon(pricePerMq, isNuovo) {
  const bg = isNuovo ? '#22C55E' : '#F59E0B'
  const label = pricePerMq ? `${(pricePerMq / 1000).toFixed(1)}k` : '?'
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${bg};
      color:#000;
      font-size:9px;
      font-weight:700;
      padding:3px 6px;
      border-radius:6px;
      white-space:nowrap;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
      border:1.5px solid rgba(255,255,255,0.5);
      line-height:1.2;
    ">${label}</div>`,
    iconSize: [40, 20],
    iconAnchor: [20, 10],
    popupAnchor: [0, -14],
  })
}

// ── Popup ─────────────────────────────────────────────────────────────────────

function PopupContent({ property, userId, onSeguito }) {
  const [seguito, setSeguito] = useState(isSeguito(property.id))

  useEffect(() => {
    marcaVisto(property.id, userId)
    onSeguito?.()
  }, [])

  function handleSegui() {
    toggleSeguito(property.id, userId).then(ora => {
      setSeguito(ora)
      onSeguito?.()
    })
  }

  return (
    <div style={{ minWidth: '260px', maxWidth: '300px', overflow: 'hidden', borderRadius: '12px' }}>

      {property.imageUrl && (
        <div style={{ width: '100%', height: '140px', overflow: 'hidden', position: 'relative' }}>
          <img
            src={property.imageUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <div style={{
            position: 'absolute', bottom: '10px', left: '10px',
            background: 'rgba(0,0,0,0.72)', borderRadius: '8px', padding: '5px 10px',
          }}>
            <span style={{ color: '#FBBF24', fontWeight: '800', fontSize: '18px' }}>
              {property.price ? `${(property.price / 1000).toFixed(0)}k €` : '—'}
            </span>
            {property.pricePerMq && (
              <span style={{ color: '#9CA3AF', fontSize: '11px', marginLeft: '6px' }}>
                {property.pricePerMq.toLocaleString('it')} €/m²
              </span>
            )}
          </div>
        </div>
      )}

      <div style={{ padding: '12px 14px 14px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ color: 'white', fontWeight: '700', fontSize: '13px', margin: '0 0 2px 0' }}>
              {property.address}
            </p>
            <p style={{ color: '#6B7280', fontSize: '11px', margin: 0 }}>
              {property.stato}
            </p>
          </div>
          {property.url && (
            
            <a  href={property.url}
              target="_blank"
              rel="noreferrer"
              style={{ color: '#60A5FA', fontSize: '11px', marginLeft: '8px', whiteSpace: 'nowrap' }}
            >
              Apri →
            </a>
          )}
        </div>

        {!property.imageUrl && (
          <div style={{ marginBottom: '10px' }}>
            <span style={{ color: '#FBBF24', fontWeight: '800', fontSize: '20px' }}>
              {property.price ? `${(property.price / 1000).toFixed(0)}k €` : '—'}
            </span>
            {property.pricePerMq && (
              <span style={{ color: '#6B7280', fontSize: '11px', marginLeft: '6px' }}>
                {property.pricePerMq.toLocaleString('it')} €/m²
              </span>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          {[
            { label: 'Sup.',   value: property.size ? `${property.size} m²` : '—' },
            { label: 'Locali', value: property.rooms ?? '—' },
            { label: 'Piano',  value: property.floor ?? '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ color: '#4B5563', fontSize: '9px', margin: '0 0 1px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
              <p style={{ color: 'white', fontSize: '12px', fontWeight: '600', margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>

        {property.giorniMercato !== null && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: property.giorniMercato > 90 ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${property.giorniMercato > 90 ? 'rgba(34,197,94,0.2)' : '#1F2937'}`,
            borderRadius: '6px', padding: '5px 10px', marginBottom: '10px',
          }}>
            <span style={{ color: property.giorniMercato > 90 ? '#22C55E' : '#9CA3AF', fontSize: '12px', fontWeight: '600' }}>
              🕐 {property.giorniMercato} giorni sul mercato
            </span>
            {property.giorniMercato > 90 && (
              <span style={{ color: '#16A34A', fontSize: '10px', marginLeft: '2px' }}>· venditore motivato?</span>
            )}
          </div>
        )}

        <button
          onClick={handleSegui}
          style={{
            width: '100%', padding: '8px', borderRadius: '8px', cursor: 'pointer',
            border: seguito ? '1px solid rgba(251,191,36,0.4)' : '1px solid #2d3748',
            background: seguito ? 'rgba(251,191,36,0.08)' : 'transparent',
            color: seguito ? '#FBBF24' : '#6B7280',
            fontWeight: '600', fontSize: '12px', transition: 'all 0.15s',
          }}
        >
          {seguito ? '★ Stai seguendo' : '☆ Segui annuncio'}
        </button>

      </div>
    </div>
  )
}

// ── Tool disegno cerchio ──────────────────────────────────────────────────────

function CircleDrawTool({ onCircleDrawn }) {
  const map = useMap()
  const drawingRef = useRef(false)
  const startLatLngRef = useRef(null)
  const previewRef = useRef(null)

  useEffect(() => {
    if (!onCircleDrawn) return

    const container = map.getContainer()
    container.style.cursor = 'crosshair'

    function getPoint(e) {
      const rect = container.getBoundingClientRect()
      return L.point(e.clientX - rect.left, e.clientY - rect.top)
    }

    function onMouseDown(e) {
      if (e.button !== 0) return
      e.stopPropagation()
      map.dragging.disable()
      map.scrollWheelZoom.disable()
      drawingRef.current = true
      startLatLngRef.current = map.containerPointToLatLng(getPoint(e))
    }

    function onMouseMove(e) {
      if (!drawingRef.current || !startLatLngRef.current) return
      const cur = map.containerPointToLatLng(getPoint(e))
      const r = haversineMeters(
        startLatLngRef.current.lat, startLatLngRef.current.lng,
        cur.lat, cur.lng
      )
      if (previewRef.current) previewRef.current.remove()
      previewRef.current = L.circle(startLatLngRef.current, {
        radius: r,
        color: '#60A5FA',
        fillColor: '#60A5FA',
        fillOpacity: 0.12,
        weight: 2,
        dashArray: '6,4',
      }).addTo(map)
    }

    function onMouseUp(e) {
      if (!drawingRef.current || !startLatLngRef.current) return
      drawingRef.current = false
      map.dragging.enable()
      map.scrollWheelZoom.enable()
      const cur = map.containerPointToLatLng(getPoint(e))
      const r = haversineMeters(
        startLatLngRef.current.lat, startLatLngRef.current.lng,
        cur.lat, cur.lng
      )
      if (previewRef.current) { previewRef.current.remove(); previewRef.current = null }
      if (r > 50) {
        onCircleDrawn({
          lat: startLatLngRef.current.lat,
          lng: startLatLngRef.current.lng,
          radius: Math.round(r),
        })
      }
      startLatLngRef.current = null
    }

    container.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      container.style.cursor = ''
      map.dragging.enable()
      map.scrollWheelZoom.enable()
      container.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      if (previewRef.current) { previewRef.current.remove(); previewRef.current = null }
    }
  }, [map, onCircleDrawn])

  return null
}

// ── MapView ───────────────────────────────────────────────────────────────────

export default function MapView({
  userId,
  onRefresh,
  center = [45.093, 7.685],
  zoom = 15,
  markers = [],
  zone = [],
  pendingCircle = null,
  drawMode = false,
  onCircleDrawn,
  visti = new Set(),
  height = '100%',
}) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height, width: '100%', borderRadius: '14px' }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />

      {zone.map(z => (
        <Circle
          key={z.id}
          center={[z.center_lat, z.center_lng]}
          radius={z.radius_m}
          pathOptions={{ color: '#60A5FA', fillColor: '#60A5FA', fillOpacity: 0.08, weight: 2 }}
        />
      ))}

      {pendingCircle && (
        <Circle
          center={[pendingCircle.lat, pendingCircle.lng]}
          radius={pendingCircle.radius}
          pathOptions={{ color: '#60A5FA', fillColor: '#60A5FA', fillOpacity: 0.12, weight: 2, dashArray: '6,4' }}
        />
      )}

      {markers.map(p => {
        const zonaMatch = zone.find(z =>
          haversineMeters(p.lat, p.lng, z.center_lat, z.center_lng) <= z.radius_m
        )

        

        const isNuovo = !visti.has(String(p.id))

        return (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={makePriceIcon(p.pricePerMq, isNuovo)}
          >
            <Popup closeButton={false}>
              <PopupContent property={p} userId={userId} onSeguito={onRefresh} />
            </Popup>
          </Marker>
        )
      })}

      {drawMode && <CircleDrawTool onCircleDrawn={onCircleDrawn} />}
    </MapContainer>
  )
}
