import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, CircleMarker, useMap } from 'react-leaflet'
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

// ── Spread marker sovrapposti ────────────────────────────────────────────────
// Più annunci nello stesso palazzo condividono spesso le stesse coordinate (o
// quasi). Li raggruppiamo e li dispongo a cerchio attorno al punto vero, così
// restano tutti visibili e cliccabili senza nasconderli dietro un cluster.
function spreadMarkers(markers) {
  const gruppi = new Map()
  markers.forEach(p => {
    if (p.lat == null || p.lng == null) return
    const key = `${p.lat.toFixed(4)}_${p.lng.toFixed(4)}`
    if (!gruppi.has(key)) gruppi.set(key, [])
    gruppi.get(key).push(p)
  })

  const risultato = []
  gruppi.forEach(gruppo => {
    if (gruppo.length === 1) {
      const p = gruppo[0]
      risultato.push({ ...p, displayLat: p.lat, displayLng: p.lng })
      return
    }
    const raggioMetri = 9 + Math.min(gruppo.length, 10) * 2
    gruppo.forEach((p, i) => {
      const angolo = (2 * Math.PI * i) / gruppo.length
      const dLat = (raggioMetri * Math.cos(angolo)) / 111320
      const dLng = (raggioMetri * Math.sin(angolo)) / (111320 * Math.cos(p.lat * Math.PI / 180))
      risultato.push({ ...p, displayLat: p.lat + dLat, displayLng: p.lng + dLng })
    })
  })
  return risultato
}

// ── Popup ─────────────────────────────────────────────────────────────────────

function PopupContent({ property, userId, onSeguito }) {
  const [seguito, setSeguito] = useState(isSeguito(property.id))

  useEffect(() => {
    marcaVisto(property.id, userId).then(() => onSeguito?.())
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

function CircleDrawTool({ onCircleDrawn, drawMode }) {
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
      const color = drawMode === 'competitor' ? '#10B981' : '#FBBF24'
      previewRef.current = L.circle(startLatLngRef.current, {
        radius: r,
        color: color,
        fillColor: color,
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
  }, [map, onCircleDrawn, drawMode])

  return null
}

// ── PolygonDrawTool ───────────────────────────────────────────────────────────────────

function PolygonDrawTool({ onPointAdded, drawMode }) {
  const map = useMap()

  useEffect(() => {
    if (!onPointAdded) return

    const container = map.getContainer()
    container.style.cursor = 'crosshair'
    map.dragging.disable()
    map.doubleClickZoom.disable()

    function onClick(e) {
      onPointAdded({ lat: e.latlng.lat, lng: e.latlng.lng })
    }

    map.on('click', onClick)

    return () => {
      container.style.cursor = ''
      map.dragging.enable()
      map.doubleClickZoom.enable()
      map.off('click', onClick)
    }
  }, [map, onPointAdded, drawMode])

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
  pendingPolygon = null,
  drawMode = null,
  shapeType = 'circle',
  onCircleDrawn,
  onPointAdded,
  polygonPoints = [],
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

      {pendingCircle && (
        <Circle
          center={[pendingCircle.lat, pendingCircle.lng]}
          radius={pendingCircle.radius}
          pathOptions={{
            color: drawMode === 'competitor' ? '#10B981' : '#FBBF24',
            fillColor: drawMode === 'competitor' ? '#10B981' : '#FBBF24',
            fillOpacity: 0.12,
            weight: 2,
            dashArray: '6,4'
          }}
        />
      )}

      {pendingPolygon && (
        <Polygon
          positions={pendingPolygon.points.map(p => [p.lat, p.lng])}
          pathOptions={{
            color: drawMode === 'competitor' ? '#10B981' : '#FBBF24',
            fillColor: drawMode === 'competitor' ? '#10B981' : '#FBBF24',
            fillOpacity: 0.12,
            weight: 2,
            dashArray: '6,4'
          }}
        />
      )}

      {polygonPoints.length >= 2 && (
        <Polygon
          positions={polygonPoints.map(p => [p.lat, p.lng])}
          pathOptions={{
            color: drawMode === 'competitor' ? '#10B981' : '#FBBF24',
            fillColor: drawMode === 'competitor' ? '#10B981' : '#FBBF24',
            fillOpacity: 0.12,
            weight: 2,
            dashArray: '6,4'
          }}
        />
      )}

      {polygonPoints.length >= 1 && polygonPoints.map((p, i) => (
        <CircleMarker
          key={i}
          center={[p.lat, p.lng]}
          radius={5}
          pathOptions={{
            color: drawMode === 'competitor' ? '#10B981' : '#FBBF24',
            fillColor: drawMode === 'competitor' ? '#10B981' : '#FBBF24',
            fillOpacity: 1,
            weight: 1,
          }}
        />
      ))}
      {polygonPoints.length >= 2 && (
        <Polygon
          positions={polygonPoints.map(p => [p.lat, p.lng])}
          pathOptions={{
            color: drawMode === 'competitor' ? '#10B981' : '#FBBF24',
            fillColor: drawMode === 'competitor' ? '#10B981' : '#FBBF24',
            fillOpacity: 0.12,
            weight: 2,
            dashArray: '6,4'
          }}
        />
      )}

      {spreadMarkers(markers).map(p => {
        const isNuovo = !visti.has(String(p.id))

        return (
          <Marker
            key={p.id}
            position={[p.displayLat, p.displayLng]}
            icon={makePriceIcon(p.pricePerMq, isNuovo)}
          >
            <Popup closeButton={false}>
              <PopupContent property={p} userId={userId} onSeguito={onRefresh} />
            </Popup>
          </Marker>
        )
      })}

      {zone.map(z => {
        const isCompetitor = z.stato_filtro && (z.stato_filtro.includes('Ottimo') || z.stato_filtro.includes('Nuovo'))
        const color = isCompetitor ? '#10B981' : '#FBBF24'
        
        if (z.polygon_points) {
          return (
            <Polygon
              key={z.id}
              positions={z.polygon_points.map(p => [p.lat, p.lng])}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.08, weight: 2 }}
            />
          )
        }
        return (
          <Circle
            key={z.id}
            center={[z.center_lat, z.center_lng]}
            radius={z.radius_m}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.08, weight: 2 }}
          />
        )
      })}

      {drawMode && shapeType === 'circle' && (
        <CircleDrawTool onCircleDrawn={onCircleDrawn} drawMode={drawMode} />
      )}
      {drawMode && shapeType === 'polygon' && (
        <PolygonDrawTool onPointAdded={onPointAdded} drawMode={drawMode} />
      )}

    </MapContainer>
  )
}
