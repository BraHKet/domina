import { useState } from 'react'
import MapView from '../components/map/MapView'
import { useProperties } from '../hooks/useProperties'
import { useZone } from '../lib/useZone'
import { useAuth } from '../hooks/useAuth'
import { useVisti } from '../hooks/useVisti'
import { loginGoogle, logout } from '../lib/auth'

export default function Dashboard() {
  const { user }                                                    = useAuth()
  const { properties, loading }                                     = useProperties()
  const { zone, addZona, removeZona, updateZona, loading: zoneLoading } = useZone(user?.id)
  const { visti, seguiti, refresh: refreshVisti }                   = useVisti(user?.id)

  const [drawMode, setDrawMode]           = useState(false)
  const [pendingCircle, setPendingCircle] = useState(null)
  const [inputEuroMq, setInputEuroMq]     = useState('')
  const [inputLabel, setInputLabel]       = useState('')
  const [inputInclAste, setInputInclAste] = useState(true)
  const [editingId, setEditingId]         = useState(null)
  const [editEuroMq, setEditEuroMq]       = useState('')
  const [soloNuovi, setSoloNuovi]         = useState(false)
  const [soloSeguiti, setSoloSeguiti]     = useState(false)

  function handleCircleDrawn(circle) {
    setDrawMode(false)
    setPendingCircle(circle)
    setInputEuroMq('')
    setInputLabel('')
    setInputInclAste(true)
  }

  async function handleSalvaZona() {
    const mq = parseInt(inputEuroMq)
    if (!mq || mq <= 0) return
    await addZona({
      label:        inputLabel || null,
      center_lat:   pendingCircle.lat,
      center_lng:   pendingCircle.lng,
      radius_m:     pendingCircle.radius,
      max_euro_mq:  mq,
      includi_aste: inputInclAste,
    })
    setPendingCircle(null)
    setInputEuroMq('')
    setInputLabel('')
    setInputInclAste(true)
  }

  async function handleAggiorna(id) {
    const mq = parseInt(editEuroMq)
    if (!mq || mq <= 0) return
    await updateZona(id, { max_euro_mq: mq })
    setEditingId(null)
    setEditEuroMq('')
  }

  const hasZone = zone.length > 0

  function dentroZone(p) {
    return zone.some(z => {
      const dist = Math.sqrt(
        Math.pow((p.lat - z.center_lat) * 111320, 2) +
        Math.pow((p.lng - z.center_lng) * 111320 * Math.cos(z.center_lat * Math.PI / 180), 2)
      )
      const astaOk = z.includi_aste ? true : !p.isAsta
      return dist <= z.radius_m && p.pricePerMq && p.pricePerMq <= z.max_euro_mq * 1.15 && astaOk
    })
  }

  const visibili = properties.filter(p => {
    if (!p.pricePerMq) return false
    if (!hasZone) return false                     // ← aggiunta questa riga
    if (!dentroZone(p)) return false
    if (soloNuovi   && visti.has(String(p.id)))    return false
    if (soloSeguiti && !seguiti.has(String(p.id))) return false
    return true
  })

  const nuoviCount   = hasZone ? properties.filter(p => p.pricePerMq && dentroZone(p) && !visti.has(String(p.id))).length : 0
  const seguitiCount = properties.filter(p => seguiti.has(String(p.id))).length

  if (loading || zoneLoading) return (
    <div style={{ padding: '32px', color: '#9CA3AF' }}>Caricamento...</div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh' }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: '280px', flexShrink: 0,
        background: '#0D1117', borderRight: '1px solid #1a2233',
        display: 'flex', flexDirection: 'column', height: '100vh',
      }}>

        {/* Logo + header */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #1a2233' }}>
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>
              <span style={{ background: 'linear-gradient(135deg, #60A5FA, #A78BFA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>D</span>
              <span style={{ color: 'white' }}>omina</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: '#F9FAFB', fontWeight: '700', fontSize: '13px', margin: '0 0 2px 0', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                Zone di Interesse
              </p>
              <p style={{ color: '#4B5563', fontSize: '12px', margin: 0 }}>
                {visibili.length} annunci attivi
              </p>
            </div>
            <div style={{ background: '#1a2233', border: '1px solid #2d3748', borderRadius: '8px', padding: '4px 10px' }}>
              <span style={{ color: '#60A5FA', fontSize: '12px', fontWeight: '700' }}>{zone.length}</span>
              <span style={{ color: '#4B5563', fontSize: '11px', marginLeft: '3px' }}>zone</span>
            </div>
          </div>
        </div>

        {/* Bottone disegna */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #1a2233' }}>
          <button
            onClick={() => { setDrawMode(d => !d); setPendingCircle(null) }}
            style={{
              width: '100%', padding: '10px', borderRadius: '10px',
              border: drawMode ? '1px solid #3B82F6' : '1px solid #2d3748',
              background: drawMode ? 'rgba(59,130,246,0.12)' : 'transparent',
              color: drawMode ? '#60A5FA' : '#9CA3AF',
              fontWeight: '600', fontSize: '13px', cursor: 'pointer',
            }}
          >
            {drawMode ? '✏️  Trascina sulla mappa...' : '+ Disegna zona'}
          </button>
          {drawMode && (
            <p style={{ color: '#3B82F6', fontSize: '11px', margin: '8px 0 0 0', textAlign: 'center', opacity: 0.8 }}>
              Tieni premuto e trascina per disegnare
            </p>
          )}
        </div>

        {/* Filtri nuovi / seguiti */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #1a2233', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={soloNuovi} onChange={e => setSoloNuovi(e.target.checked)}
                style={{ accentColor: '#22C55E', width: '13px', height: '13px' }} />
              <span style={{ color: '#D1D5DB', fontSize: '12px', fontWeight: '600' }}>Solo nuovi</span>
            </div>
            {nuoviCount > 0 && (
              <span style={{ background: '#22C55E', color: '#000', fontSize: '10px', fontWeight: '800', padding: '2px 7px', borderRadius: '999px' }}>
                {nuoviCount} nuovi
              </span>
            )}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={soloSeguiti} onChange={e => setSoloSeguiti(e.target.checked)}
                style={{ accentColor: '#FBBF24', width: '13px', height: '13px' }} />
              <span style={{ color: '#D1D5DB', fontSize: '12px', fontWeight: '600' }}>Solo seguiti</span>
            </div>
            {seguitiCount > 0 && (
              <span style={{ background: 'rgba(251,191,36,0.15)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.3)', fontSize: '10px', fontWeight: '800', padding: '2px 7px', borderRadius: '999px' }}>
                {seguitiCount} seguiti
              </span>
            )}
          </label>
        </div>

        {/* Form conferma zona */}
        {pendingCircle && (
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #1a2233' }}>
            <div style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '12px', padding: '14px' }}>
              <p style={{ color: '#60A5FA', fontSize: '11px', fontWeight: '700', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Nuova zona · {Math.round(pendingCircle.radius)} m
              </p>
              <input placeholder="Nome zona (opzionale)" value={inputLabel} onChange={e => setInputLabel(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid #2d3748', borderRadius: '8px', color: 'white', padding: '8px 10px', fontSize: '12px', marginBottom: '8px', boxSizing: 'border-box', outline: 'none' }} />
              <input type="number" placeholder="Max €/m²" value={inputEuroMq} onChange={e => setInputEuroMq(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid #2d3748', borderRadius: '8px', color: 'white', padding: '8px 10px', fontSize: '12px', marginBottom: '10px', boxSizing: 'border-box', outline: 'none' }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer' }}>
                <input type="checkbox" checked={inputInclAste} onChange={e => setInputInclAste(e.target.checked)}
                  style={{ accentColor: '#22C55E', width: '13px', height: '13px', flexShrink: 0 }} />
                <span style={{ color: '#9CA3AF', fontSize: '12px' }}>Includi aste giudiziarie</span>
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={handleSalvaZona}
                  style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none', background: '#22C55E', color: '#000', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                  Salva
                </button>
                <button onClick={() => setPendingCircle(null)}
                  style={{ padding: '9px 13px', borderRadius: '8px', border: '1px solid #2d3748', background: 'transparent', color: '#6B7280', fontSize: '13px', cursor: 'pointer' }}>
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista zone */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 16px' }}>
          {zone.length === 0 && !pendingCircle && (
            <div style={{ textAlign: 'center', marginTop: '32px', padding: '0 8px' }}>
              <div style={{ fontSize: '28px', marginBottom: '10px', opacity: 0.3 }}>◎</div>
              <p style={{ color: '#374151', fontSize: '12px', lineHeight: '1.6', margin: 0 }}>
                Nessuna zona configurata.<br />Disegna un cerchio sulla mappa.
              </p>
            </div>
          )}
          {zone.map(z => (
            <div key={z.id} style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: '12px', padding: '14px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <p style={{ color: '#F9FAFB', fontWeight: '700', fontSize: '13px', margin: '0 0 2px 0' }}>
                    {z.label || `Zona ${z.id.slice(0, 6)}`}
                  </p>
                  <p style={{ color: '#374151', fontSize: '11px', margin: 0 }}>r = {z.radius_m} m</p>
                </div>
                <button onClick={() => removeZona(z.id)}
                  style={{ background: 'none', border: 'none', color: '#374151', cursor: 'pointer', fontSize: '16px', padding: 0, lineHeight: 1 }}>×</button>
              </div>
              {editingId === z.id ? (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
                  <input type="number" value={editEuroMq} onChange={e => setEditEuroMq(e.target.value)} placeholder="€/m²"
                    style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid #2d3748', borderRadius: '6px', color: 'white', padding: '6px 8px', fontSize: '12px', outline: 'none' }} />
                  <button onClick={() => handleAggiorna(z.id)}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#22C55E', color: '#000', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>OK</button>
                  <button onClick={() => setEditingId(null)}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #2d3748', background: 'transparent', color: '#6B7280', fontSize: '12px', cursor: 'pointer' }}>✕</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '6px', padding: '5px 10px' }}>
                    <span style={{ color: '#22C55E', fontWeight: '700', fontSize: '13px' }}>≤ {z.max_euro_mq.toLocaleString('it')} €/m²</span>
                    <span style={{ color: '#374151', fontSize: '10px', marginLeft: '5px' }}>+15% tratt.</span>
                  </div>
                  <button onClick={() => { setEditingId(z.id); setEditEuroMq(String(z.max_euro_mq)) }}
                    style={{ background: 'none', border: 'none', color: '#374151', cursor: 'pointer', fontSize: '11px' }}>modifica</button>
                </div>
              )}
              <p style={{ color: z.includi_aste ? '#22C55E' : '#4B5563', fontSize: '10px', margin: 0, fontWeight: '600' }}>
                {z.includi_aste ? '✓ Aste incluse' : '✗ Aste escluse'}
              </p>
            </div>
          ))}
        </div>

        {/* ── Login Google in fondo ── */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid #1a2233' }}>
          {user ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                {user.user_metadata?.avatar_url && (
                  <img src={user.user_metadata.avatar_url} alt="" style={{ width: '26px', height: '26px', borderRadius: '50%' }} />
                )}
                <p style={{ color: '#9CA3AF', fontSize: '11px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </p>
              </div>
              <button onClick={logout}
                style={{ width: '100%', padding: '7px', borderRadius: '8px', border: '1px solid #2d3748', background: 'transparent', color: '#4B5563', fontSize: '11px', cursor: 'pointer' }}>
                Esci
              </button>
            </div>
          ) : (
            <div>
              <p style={{ color: '#374151', fontSize: '10px', margin: '0 0 8px 0', lineHeight: '1.5', textAlign: 'center' }}>
                Accedi per non perdere le tue mappature, i seguiti e la cronologia.
              </p>
              <button onClick={loginGoogle}
                style={{
                  width: '100%', padding: '9px', borderRadius: '8px',
                  border: '1px solid #2d3748', background: 'rgba(255,255,255,0.04)',
                  color: '#D1D5DB', fontSize: '12px', fontWeight: '600',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}>
                <svg width="14" height="14" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Accedi con Google
              </button>
            </div>
          )}
        </div>

      </div>

      {/* ── Mappa ── */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapView
          center={[45.093, 7.685]}
          zoom={15}
          markers={visibili}
          zone={zone}
          pendingCircle={pendingCircle}
          drawMode={drawMode}
          onCircleDrawn={handleCircleDrawn}
          onRefresh={refreshVisti}
          visti={visti}
          userId={user?.id}
          height="100%"
        />
        <div style={{ position: 'absolute', bottom: '20px', right: '20px', zIndex: 1000, background: 'rgba(17,24,39,0.92)', borderRadius: '10px', padding: '10px 14px', backdropFilter: 'blur(4px)' }}>
          {[
            { color: '#22C55E', label: 'Sotto soglia (o entro -15%)' },
            { color: '#F59E0B', label: 'Annunci generici' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ width: 10, height: 10, borderRadius: '3px', background: color, flexShrink: 0 }} />
              <span style={{ color: '#D1D5DB', fontSize: '11px' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

