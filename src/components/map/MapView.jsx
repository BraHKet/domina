import { useState } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'

// ── Icone mappa ───────────────────────────────────────────────────────────────

const houseIcon = L.divIcon({
  html: `<div style="width:28px;height:28px;background:#F59E0B;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.2);">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
    </svg>
  </div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16],
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

// ── Grafico storico prezzi ────────────────────────────────────────────────────

function PriceChart({ storicoAnnuncio }) {
  if (!storicoAnnuncio?.length || storicoAnnuncio.length < 2) return null

  const W = 312, H = 80, PAD = 10
  const prezzi = storicoAnnuncio.map(r => r.prezzo)
  const minP = Math.min(...prezzi)
  const maxP = Math.max(...prezzi)
  const range = maxP - minP || 1

  const n = storicoAnnuncio.length
  const xStep = (W - PAD * 2) / Math.max(n - 1, 1)
  const toX = i => PAD + i * xStep
  const toY = p => PAD + (1 - (p - minP) / range) * (H - PAD * 2 - 14)

  const linePath = storicoAnnuncio
    .map((r, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(r.prezzo)}`)
    .join(' ')

  const areaPath =
    linePath +
    ` L${toX(n - 1)},${H - 14} L${toX(0)},${H - 14} Z`

  const formatDate = d => {
    if (!d) return ''
    const dt = new Date(d)
    return `${dt.getDate()}/${dt.getMonth() + 1}`
  }

  return (
    <div style={{ marginTop: '12px' }}>
      <p style={{
        color: '#6B7280', fontSize: '10px', margin: '0 0 6px 0',
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        Storico prezzo annuncio
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: `${H}px` }}>
        {/* Area fill */}
        <path d={areaPath} fill="rgba(34,197,94,0.08)" />
        {/* Linea */}
        <path d={linePath} fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        {/* Punti + label */}
        {storicoAnnuncio.map((r, i) => {
          const isRibasso = i > 0 && r.prezzo < storicoAnnuncio[i - 1].prezzo
          const cx = toX(i)
          const cy = toY(r.prezzo)
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={3} fill={isRibasso ? '#EF4444' : '#22C55E'} />
              {/* label prezzo sopra il punto */}
              <text
                x={cx} y={cy - 6}
                textAnchor="middle" fontSize="7.5" fill="#D1D5DB"
                fontWeight="600"
              >
                {(r.prezzo / 1000).toFixed(0)}k
              </text>
              {/* label data sotto */}
              <text
                x={cx} y={H - 2}
                textAnchor="middle" fontSize="7" fill="#4B5563"
              >
                {formatDate(r.data)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── ScoreDetailCard ───────────────────────────────────────────────────────────

function ScoreDetailCard({ property, onClose }) {
  const d = property.scoreDettaglio
  if (!d) return null

  const items = [
    {
      label: 'Sconto OMI',
      pt: d.omi.pt,
      max: d.omi.max,
      detail: d.omi.meta ? (
        <div style={{ display: 'flex', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
          <span style={{ color: '#6B7280', fontSize: '10px' }}>
            Casa <span style={{ color: '#F59E0B', fontWeight: '700' }}>{d.omi.meta.prezzoMq} €/m²</span>
          </span>
          <span style={{ color: '#6B7280', fontSize: '10px' }}>
            OMI media <span style={{ color: 'white', fontWeight: '600' }}>{d.omi.meta.omiMedia} €/m²</span>
          </span>
          {d.omi.meta.sconto >= 0
            ? <span style={{ color: '#22C55E', fontSize: '10px', fontWeight: '600' }}>-{d.omi.meta.sconto}% sotto media</span>
            : <span style={{ color: '#EF4444', fontSize: '10px', fontWeight: '600' }}>+{Math.abs(d.omi.meta.sconto)}% sopra media</span>
          }
        </div>
      ) : null,
    },
    {
      label: 'Velocità di vendita',
      pt: d.velocita.pt,
      max: d.velocita.max,
      detail: d.velocita.meta ? (
        <div style={{ marginTop: '4px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {d.velocita.meta.mioGiorni != null && (
              <span style={{ color: '#6B7280', fontSize: '10px' }}>
                Giorni annuncio <span style={{ color: 'white', fontWeight: '600' }}>{d.velocita.meta.mioGiorni}</span>
              </span>
            )}
            <span style={{ color: '#6B7280', fontSize: '10px' }}>
              Ribassi <span style={{ color: d.velocita.meta.numRibassi > 0 ? '#22C55E' : '#9CA3AF', fontWeight: '600' }}>{d.velocita.meta.numRibassi}</span>
            </span>
            <span style={{ color: '#6B7280', fontSize: '10px' }}>
              pt Tempo <span style={{ color: 'white', fontWeight: '600' }}>{d.velocita.meta.ptTempo}</span>
            </span>
            <span style={{ color: '#6B7280', fontSize: '10px' }}>
              pt Ribassi <span style={{ color: 'white', fontWeight: '600' }}>{d.velocita.meta.ptRibassi}</span>
            </span>
          </div>
          <PriceChart storicoAnnuncio={d.velocita.meta.storicoAnnuncio} />
        </div>
      ) : null,
    },
  ]

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#111827', borderRadius: '16px', padding: '24px',
          width: '360px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <p style={{
              color: '#9CA3AF', fontSize: '11px', margin: '0 0 4px 0',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Dettaglio score
            </p>
            <p style={{ color: 'white', fontWeight: '700', fontSize: '14px', margin: 0, lineHeight: '1.3' }}>
              {property.address}
            </p>
            <p style={{ color: '#6B7280', fontSize: '10px', margin: '4px 0 0 0', fontFamily: 'monospace' }}>
              ID: {property.id}
            </p>
          </div>
          <div style={{ textAlign: 'right', marginLeft: '16px' }}>
            <p style={{ color: '#22C55E', fontWeight: '800', fontSize: '32px', margin: 0, lineHeight: 1 }}>
              {property.score}
            </p>
            <p style={{ color: '#6B7280', fontSize: '11px', margin: 0 }}>/100</p>
          </div>
        </div>

        {/* Barre score */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {items.map(({ label, pt, max, detail }) => {
            const pct = Math.min(100, Math.max(0, (pt / max) * 100))
            const color = pct >= 70 ? '#22C55E' : pct >= 40 ? '#F59E0B' : '#EF4444'
            return (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <p style={{ color: 'white', fontSize: '12px', fontWeight: '600', margin: 0 }}>{label}</p>
                  <p style={{ color, fontWeight: '700', fontSize: '13px', margin: '0 0 0 12px', whiteSpace: 'nowrap' }}>
                    {pt}/{max}
                  </p>
                </div>
                <div style={{ height: '4px', background: '#374151', borderRadius: '2px', marginBottom: '5px' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '2px', transition: 'width 0.4s ease' }} />
                </div>
                {detail}
              </div>
            )
          })}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: '20px', width: '100%', padding: '10px',
            background: '#1F2937', border: 'none', borderRadius: '10px',
            color: '#9CA3AF', fontSize: '13px', fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Chiudi
        </button>
      </div>
    </div>
  )
}

// ── PopupContent ──────────────────────────────────────────────────────────────

function PopupContent({ property, onScoreClick }) {
  return (
    <div style={{ padding: '10px', minWidth: '180px', maxWidth: '200px' }}>
      {/* Immagine + indirizzo + prezzo */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
        <div
          onClick={() => property.url && window.open(property.url, '_blank')}
          style={{
            width: '44px', height: '36px', borderRadius: '6px',
            background: '#374151', flexShrink: 0, overflow: 'hidden',
            cursor: property.url ? 'pointer' : 'default',
          }}
        >
          {property.imageUrl
            ? <img src={property.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
            : <div style={{ width: '100%', height: '100%', background: '#374151' }} />
          }
        </div>
        <div>
          <p style={{
            color: '#9CA3AF', fontSize: '10px', margin: '0 0 1px 0',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px',
          }}>
            {property.address}
          </p>
          <p style={{ color: '#F59E0B', fontWeight: '700', fontSize: '14px', margin: 0 }}>
            €{property.price?.toLocaleString('it-IT')}
          </p>
        </div>
      </div>

      {/* Dettagli griglia */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        {[
          { label: 'Superficie', value: property.size ? `${property.size} m²` : '—' },
          { label: 'Locali',     value: property.rooms ?? '—' },
          { label: 'Piano',      value: property.floor ?? '—' },
          { label: 'Ascensore',  value: property.hasElevator ? 'Sì' : 'No' },
        ].map(({ label, value }) => (
          <div key={label}>
            <p style={{ color: '#6B7280', fontSize: '9px', margin: '0 0 1px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
            <p style={{ color: 'white', fontSize: '12px', fontWeight: '600', margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Prezzo mq */}
      {property.pricePerMq && (
        <p style={{ color: '#6B7280', fontSize: '10px', margin: '6px 0 0 0', borderTop: '1px solid #374151', paddingTop: '6px' }}>
          {property.pricePerMq} €/m²
        </p>
      )}

      {/* Score — cliccabile */}
      {property.score !== null && (
        <button
          onClick={onScoreClick}
          style={{
            marginTop: '8px', width: '100%', padding: '6px 10px',
            background: '#052e16', border: '1px solid #16a34a',
            borderRadius: '8px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <span style={{ color: '#22C55E', fontWeight: '700', fontSize: '13px' }}>
            Score: {property.score}/100
          </span>
          <span style={{ color: '#16a34a', fontSize: '10px' }}>dettaglio →</span>
        </button>
      )}
    </div>
  )
}

// ── MapView ───────────────────────────────────────────────────────────────────

const iconMap = {
  house:        houseIcon,
  'green-dot':  greenDotIcon,
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
  const [scoreProperty, setScoreProperty] = useState(null)
  const icon = iconMap[markerType] ?? houseIcon

  return (
    <>
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

        {markers.map(p => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={icon}>
            <Popup closeButton={false}>
              <PopupContent property={p} onScoreClick={() => setScoreProperty(p)} />
            </Popup>
          </Marker>
        ))}

        {selectedProperty && (
          <Marker
            position={[selectedProperty.lat, selectedProperty.lng]}
            icon={yellowDotIcon}
            eventHandlers={{ add: e => e.target.openPopup() }}
          >
            <Popup closeButton={false} autoClose={false} closeOnClick={false}>
              <PopupContent property={selectedProperty} onScoreClick={() => setScoreProperty(selectedProperty)} />
            </Popup>
          </Marker>
        )}

        {cantieri.map((c, i) => (
          <Circle key={i} center={[c.lat, c.lng]} radius={80}
            pathOptions={{ color: '#6B7280', fillColor: '#9CA3AF', fillOpacity: 0.5, weight: 1 }} />
        ))}

        {zoneRischio.map((z, i) => (
          <Circle key={i} center={[z.lat, z.lng]} radius={z.radius}
            pathOptions={{ color: '#FCA5A5', fillColor: '#FCA5A5', fillOpacity: 0.3, weight: 0 }} />
        ))}
      </MapContainer>

      {scoreProperty && (
        <ScoreDetailCard
          property={scoreProperty}
          onClose={() => setScoreProperty(null)}
        />
      )}
    </>
  )
}