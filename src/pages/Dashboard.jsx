import { useState, useEffect } from 'react'
import MapView from '../components/map/MapView'
import { useProperties } from '../hooks/useProperties'
import { useZone } from '../lib/useZone'
import { useAuth } from '../hooks/useAuth'
import { useVisti } from '../hooks/useVisti'
import { useOmi } from '../hooks/useOmi'
import { rimuoviSeguiti } from '../lib/visti'
import { getUltimoStorico, getStoricoCompleto } from '../lib/storico'
import { loginGoogle, logout } from '../lib/auth'
import * as XLSX from 'xlsx'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function pointInPolygon(lat, lng, points) {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].lng, yi = points[i].lat
    const xj = points[j].lng, yj = points[j].lat
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const { properties, loading } = useProperties()
  const { zone, addZona, removeZona, updateZona, loading: zoneLoading } = useZone(user?.id)
  const { visti, seguiti, refresh: refreshVisti } = useVisti(user?.id)
  const { omiData } = useOmi()
  const [storicoRimossi, setStoricoRimossi] = useState({})
  const [notificheOpen, setNotificheOpen] = useState(false)
  const [dettaglioAperto, setDettaglioAperto] = useState(null) // id annuncio o null
  const [dettaglioStorico, setDettaglioStorico] = useState([])

  const [drawMode, setDrawMode] = useState(null) // 'competitor' | 'opportunita' | null
  const [pendingCircle, setPendingCircle] = useState(null)
  const [inputLabel, setInputLabel] = useState('')
  const [inputInclAste, setInputInclAste] = useState(true)
  const [selectedStates, setSelectedStates] = useState(new Set())
  const [visibleZoneIds, setVisibleZoneIds] = useState(new Set())
  const [soloNuovi, setSoloNuovi] = useState(false)
  const [soloSeguiti, setSoloSeguiti] = useState(false)
  const [vistiSnapshot, setVistiSnapshot] = useState(null)

  useEffect(() => {
    if (zone.length > 0) {
      setVisibleZoneIds(new Set(zone.map(z => z.id)))
    } else {
      setVisibleZoneIds(new Set())
    }
  }, [zone.map(z => z.id).join(',')])

  function handleCircleDrawn(circle) {
    setPendingCircle(circle)
    setInputLabel('')
    setInputInclAste(true)
  }

  const activeZones = zone.filter(z => visibleZoneIds.has(z.id))
  const hasZone = activeZones.length > 0

  function mediaZona(z) {
    const statoFiltro = z.stato_filtro
    const activeStates = statoFiltro ? statoFiltro.split(',') : []
    const annunci = properties.filter(p => {
      if (!p.pricePerMq) return false
      if (z.polygon_points) {
        return pointInPolygon(p.lat, p.lng, z.polygon_points) &&
          (activeStates.length === 0 || activeStates.includes(p.type))
      }
      const dist = Math.sqrt(
        Math.pow((p.lat - z.center_lat) * 111320, 2) +
        Math.pow((p.lng - z.center_lng) * 111320 * Math.cos(z.center_lat * Math.PI / 180), 2)
      )
      if (dist > z.radius_m) return false
      return activeStates.length === 0 || activeStates.includes(p.type)
    })
    if (annunci.length === 0) return null
    return annunci.reduce((sum, p) => sum + p.pricePerMq, 0) / annunci.length
  }

  function matchZona(p, z) {
    let dentro = false

    if (z.polygon_points) {
      dentro = pointInPolygon(p.lat, p.lng, z.polygon_points)
    } else {
      const dist = Math.sqrt(
        Math.pow((p.lat - z.center_lat) * 111320, 2) +
        Math.pow((p.lng - z.center_lng) * 111320 * Math.cos(z.center_lat * Math.PI / 180), 2)
      )
      dentro = dist <= z.radius_m
    }

    if (!dentro) return false
    const astaOk = z.includi_aste ? true : !p.isAsta
    if (!astaOk) return false
    const statoFiltro = z.stato_filtro
    const activeStates = statoFiltro ? statoFiltro.split(',') : []
    if (activeStates.length > 0 && !activeStates.includes(p.type)) return false

    const isCompetitor = statoFiltro && (statoFiltro.includes('Ottimo') || statoFiltro.includes('Nuovo'))
    if (isCompetitor) return true

    const media = mediaZona(z)
    if (media === null) return false
    return p.pricePerMq != null && p.pricePerMq <= media
  }

  function dentroZone(p) {
    return activeZones.some(z => matchZona(p, z))
  }

  function zoneDiProperty(p) {
    const labels = activeZones.filter(z => matchZona(p, z)).map(z => z.label || 'Zona senza nome')
    return labels.join(', ')
  }

  function dentroGeografico(p, z) {
    if (z.polygon_points) return pointInPolygon(p.lat, p.lng, z.polygon_points)
    const dist = Math.sqrt(
      Math.pow((p.lat - z.center_lat) * 111320, 2) +
      Math.pow((p.lng - z.center_lng) * 111320 * Math.cos(z.center_lat * Math.PI / 180), 2)
    )
    return dist <= z.radius_m
  }

  function dentroZoneGeografico(p) {
    return activeZones.some(z => dentroGeografico(p, z))
  }

  const STATI_BARRA = [
    { stato: 'Ottimo / Ristrutturato', label: 'Ristrutturato',   colore: '#10B981', omiStato: 'Ottimo' },
    { stato: 'Nuovo / In costruzione', label: 'In costruzione',  colore: '#10B981', omiStato: 'Ottimo' },
    { stato: 'Da ristrutturare',       label: 'Da ristrutturare', colore: '#FBBF24', omiStato: 'Normale' },
    { stato: 'Buono / Abitabile',      label: 'Abitabile',       colore: '#FBBF24', omiStato: 'Normale' },
  ]

  const statiSelezionati = new Set(
    activeZones.flatMap(z => z.stato_filtro ? z.stato_filtro.split(',') : [])
  )

  const metricheBarra = hasZone
    ? STATI_BARRA
      .filter(({ stato }) => statiSelezionati.has(stato))
      .map(({ stato, label, colore, omiStato }) => {
        const annunci = properties.filter(p => p.pricePerMq && p.type === stato && dentroZoneGeografico(p))
        const media = annunci.length > 0 ? annunci.reduce((s, p) => s + p.pricePerMq, 0) / annunci.length : null
        const omi = omiData.find(r => r.tipologia === 'Abitazioni civili' && r.stato_conservativo === omiStato)
        return { label, colore, count: annunci.length, media, omi }
      })
    : []

  const vistiPerFiltro = (soloNuovi && vistiSnapshot) ? vistiSnapshot : visti

  const visibili = properties.filter(p => {
    if (!p.pricePerMq) return false
    if (!hasZone) return false
    if (!dentroZone(p)) return false
    if (soloSeguiti && !seguiti.has(String(p.id))) return false
    if (soloNuovi && vistiPerFiltro.has(String(p.id))) return false
    return true
  })

  const nuoviCount = hasZone ? properties.filter(p => p.pricePerMq && dentroZone(p) && !visti.has(String(p.id))).length : 0
  const seguitiCount = hasZone ? properties.filter(p => seguiti.has(String(p.id)) && dentroZone(p)).length : 0

  // Annunci seguiti che non sono più presenti tra gli annunci correnti (rimossi alla fonte)
  const propertiesIds = new Set(properties.map(p => String(p.id)))
  const seguitiRimossiIds = loading ? [] : [...seguiti].filter(id => !propertiesIds.has(id))

  useEffect(() => {
    if (seguitiRimossiIds.length === 0) {
      setStoricoRimossi({})
      return
    }
    getUltimoStorico(seguitiRimossiIds).then(setStoricoRimossi)
  }, [seguitiRimossiIds.join(',')])

  const seguitiRimossi = seguitiRimossiIds.map(id => ({ id, ...storicoRimossi[id] }))

  async function handleDismissRimosso(id) {
    await rimuoviSeguiti([id], user?.id)
    refreshVisti()
  }

  useEffect(() => {
    if (!dettaglioAperto) {
      setDettaglioStorico([])
      return
    }
    getStoricoCompleto(dettaglioAperto).then(setDettaglioStorico)
  }, [dettaglioAperto])

  function handleApriDettaglio(id) {
    setDettaglioAperto(id)
    setNotificheOpen(false)
  }

  function esportaSeguiti() {
    const dati = properties.filter(p => seguiti.has(String(p.id)) && dentroZone(p))
    if (dati.length === 0) return

    const conPrezzoMq = dati.filter(p => p.pricePerMq != null)
    const mediaPrezzoMq = conPrezzoMq.length > 0
      ? conPrezzoMq.reduce((sum, p) => sum + p.pricePerMq, 0) / conPrezzoMq.length
      : null

    const righe = dati.map(p => ({
      'ID': p.id,
      'Zona': zoneDiProperty(p),
      'Indirizzo': p.address,
      'Indirizzo completo': p.fullAddress,
      'Prezzo (€)': p.price,
      '€/mq': p.pricePerMq ?? '',
      'Superficie (m²)': p.size,
      'Locali': p.rooms,
      'Bagni': p.bathrooms ?? '',
      'Piano': p.floor,
      'Ascensore': p.hasElevator ? 'Sì' : 'No',
      'Stato immobile': p.stato ?? '',
      'Tipo': p.type ?? '',
      'Giorni mercato': p.giorniMercato ?? '',
      'Agenzia': p.agenzia ?? '',
      'Cellulare': p.cellulare ?? '',
      'URL': p.url ?? '',
      'Immagine': p.imageUrl ?? '',
    }))

    const ws = XLSX.utils.json_to_sheet(righe, { origin: 'A3' })
    const numCols = Object.keys(righe[0]).length
    XLSX.utils.sheet_add_aoa(ws, [[
      mediaPrezzoMq != null
        ? `Media €/mq esportazione: ${Math.round(mediaPrezzoMq).toLocaleString('it-IT')} €/m²`
        : 'Media €/mq esportazione: —'
    ]], { origin: 'A1' })
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } }]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Seguiti')
    XLSX.writeFile(wb, 'seguiti_domina.xlsx')
  }

  async function handleSalvaZona() {
    if (selectedStates.size === 0) return

    const base = {
      label: inputLabel || null,
      stato_filtro: Array.from(selectedStates).join(','),
      includi_aste: inputInclAste,
    }

    const payload = pendingPolygon
      ? { ...base, polygon_points: pendingPolygon.points, center_lat: null, center_lng: null, radius_m: null }
      : { ...base, center_lat: pendingCircle.lat, center_lng: pendingCircle.lng, radius_m: pendingCircle.radius }

    const { data, error } = await addZona(payload)
    if (error) return

    if (data) {
      setVisibleZoneIds(prev => {
        const next = new Set(prev)
        next.add(data.id)
        return next
      })
    }

    setPendingCircle(null)
    setPendingPolygon(null)
    setDrawMode(null)
    setInputLabel('')
    setInputInclAste(true)
    setSelectedStates(new Set())
  }

  async function handleRemoveZona(z) {
    const propertiesInside = properties.filter(p => {
      const dist = Math.sqrt(
        Math.pow((p.lat - z.center_lat) * 111320, 2) +
        Math.pow((p.lng - z.center_lng) * 111320 * Math.cos(z.center_lat * Math.PI / 180), 2)
      )
      return dist <= z.radius_m
    })

    const seguitiInside = propertiesInside
      .map(p => String(p.id))
      .filter(id => seguiti.has(id))

    const restantiZone = zone.filter(item => item.id !== z.id)
    const daRimuovere = seguitiInside.filter(id => {
      const p = properties.find(item => String(item.id) === id)
      if (!p) return false
      const inAltraZona = restantiZone.some(rz => {
        const dist = Math.sqrt(
          Math.pow((p.lat - rz.center_lat) * 111320, 2) +
          Math.pow((p.lng - rz.center_lng) * 111320 * Math.cos(rz.center_lat * Math.PI / 180), 2)
        )
        return dist <= rz.radius_m
      })
      return !inAltraZona
    })

    if (daRimuovere.length > 0) {
      await rimuoviSeguiti(daRimuovere, user?.id)
      refreshVisti()
    }

    await removeZona(z.id)
    setVisibleZoneIds(prev => {
      const next = new Set(prev)
      next.delete(z.id)
      return next
    })
  }

  const [shapeType, setShapeType] = useState('circle')        
  const [pendingPolygon, setPendingPolygon] = useState(null)  
  const [polygonPoints, setPolygonPoints] = useState([])

  function handlePointAdded(point) {
    setPolygonPoints(prev => [...prev, point])
  }

  function handleChiudiPoligono() {
    if (polygonPoints.length < 3) return
    setPendingPolygon({ points: polygonPoints })
    setPolygonPoints([])
  }

  const statoLabel = (s) => {
    if (!s) return 'Qualsiasi'
    if (s.includes('Buono / Abitabile')) return 'Abitabile'
    if (s.includes('Ottimo / Ristrutturato')) return 'Ottimo'
    if (s.includes('Da ristrutturare')) return 'Da Ristrutturare'
    if (s.includes('Nuovo / In costruzione')) return 'In Costruzione'
    return s
  }

  if (authLoading) return (
    <div style={{ padding: '32px', color: '#9CA3AF' }}>Caricamento...</div>
  )

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      fontFamily: '"Outfit", "Inter", sans-serif',
      background: '#0B0F17'
    }}>

      {/* ── Mappa (A tutto schermo) ── */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1
      }}>
        <MapView
          center={[45.093, 7.685]}
          zoom={15}
          markers={visibili}
          zone={zone.filter(z => visibleZoneIds.has(z.id))}
          pendingCircle={pendingCircle}
          drawMode={drawMode}
          onCircleDrawn={handleCircleDrawn}
          onRefresh={refreshVisti}
          visti={visti}
          userId={user?.id}
          height="100%"
          shapeType={shapeType}
          pendingPolygon={pendingPolygon}
          onPointAdded={handlePointAdded}
          polygonPoints={polygonPoints}
        />
      </div>

      {/* ── Overlay Sinistro ── */}
      <div style={{
        position: 'absolute',
        top: '24px',
        left: '54px',
        zIndex: 1000,
        width: '340px',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        maxHeight: 'calc(100vh - 48px)',
        pointerEvents: 'none',
      }}>

        {/* Brand / Logo */}
        <div style={{
          padding: '16px 20px',
          background: 'rgba(26, 78, 155, 0)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          pointerEvents: 'auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <span style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '-0.5px' }}>
              <span style={{ background: '#e86406', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>D</span>
              <span style={{ color: 'black' }}>omina</span>
            </span>
            <span style={{ color: '#000000', fontSize: '11px', marginLeft: '8px', fontWeight: '500' }}>v1.2</span>
          </div>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img
                src={user.user_metadata?.avatar_url}
                alt="avatar"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1.5px solid rgba(255,255,255,0.15)',
                }}
              />
              <button
                onClick={logout}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#000000',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '0',
                  letterSpacing: '0.3px',
                }}
              >
                Esci →
              </button>
            </div>
          ) : (
            <button
              onClick={loginGoogle}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgb(0, 0, 0)',
                border: '1px solid rgb(7, 7, 7)',
                borderRadius: '8px',
                color: 'rgb(255, 255, 255)',
                fontSize: '13px',
                fontWeight: 'bold',
                padding: '5px 10px',
                cursor: 'pointer',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Login
            </button>
          )}
        </div>

        {/* Pulsanti Creazione Zona */}
        <div style={{
          padding: '10px',
          background: 'rgb(0, 0, 0)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'auto'
        }}>
          <button
            onClick={() => {
              if (drawMode === 'competitor') {
                setDrawMode(null)
                setPendingCircle(null)
                setPendingPolygon(null)   // AGGIUNGI
                setPolygonPoints([])      // AGGIUNGI
              } else {
                setDrawMode('competitor')
                setSelectedStates(new Set(['Ottimo / Ristrutturato', 'Nuovo / In costruzione']))
                setPendingCircle(null)
                setPendingPolygon(null)   // AGGIUNGI
                setPolygonPoints([])      // AGGIUNGI
              }
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              padding: '12px 16px',
              borderRadius: '12px',
              border: 'none',
              background: drawMode === 'competitor' ? '#059669' : 'rgba(255, 255, 255, 0.02)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              width: '100%',
            }}
          >
            <span style={{ 
              color: drawMode === 'competitor' ? '#07110E' : '#10B981', 
              fontWeight: '800', 
              fontSize: '13px', 
              textTransform: 'uppercase', 
              letterSpacing: '0.04em' 
            }}>
              🟢 Analisi competitor
            </span>
            <span style={{ 
              color: drawMode === 'competitor' ? 'rgba(7, 17, 14, 0.75)' : '#9CA3AF', 
              fontSize: '11px', 
              marginTop: '2px', 
              textAlign: 'left' 
            }}>
              Ottimo/Ristrutturato & Nuovo/In costruzione
            </span>
          </button>

          <button
            onClick={() => {
              if (drawMode === 'opportunita') {
                setDrawMode(null)
                setPendingCircle(null)
                setPendingPolygon(null)   // AGGIUNGI
                setPolygonPoints([])      // AGGIUNGI
              } else {
                setDrawMode('opportunita')
                setSelectedStates(new Set(['Da ristrutturare', 'Buono / Abitabile']))
                setPendingCircle(null)
                setPendingPolygon(null)   // AGGIUNGI
                setPolygonPoints([])      // AGGIUNGI
              }
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              padding: '12px 16px',
              borderRadius: '12px',
              border: 'none',
              background: drawMode === 'opportunita' ? '#D97706' : 'rgba(255, 255, 255, 0.02)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              width: '100%',
            }}
          >
            <span style={{ 
              color: drawMode === 'opportunita' ? '#110D03' : '#FBBF24', 
              fontWeight: '800', 
              fontSize: '13px', 
              textTransform: 'uppercase', 
              letterSpacing: '0.04em' 
            }}>
              🟡 Analisi opportunità
            </span>
            <span style={{ 
              color: drawMode === 'opportunita' ? 'rgba(17, 13, 3, 0.75)' : '#9CA3AF', 
              fontSize: '11px', 
              marginTop: '2px', 
              textAlign: 'left' 
            }}>
              Da Ristrutturare & Buono/Abitabile
            </span>
          </button>
        </div>

        {/* Scheda Dinamica (Creazione OR Lista Zone) */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '18px',
          background: 'rgb(0, 0, 0)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
          display: 'flex',
          flexDirection: 'column',
          pointerEvents: 'auto',
        }}>
          {drawMode ? (
            /* ── FORM DI CREAZIONE ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '13px',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: drawMode === 'competitor' ? '#10B981' : '#FBBF24'
                }}>
                  Nuova Zona {drawMode === 'competitor' ? 'Competitor' : 'Opportunità'}
                </h3>
                <button 
                  onClick={() => { setDrawMode(null); setPendingCircle(null); setPendingPolygon(null); setPolygonPoints([]) }}
                  style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '16px' }}
                >
                  ✕
                </button>
              </div>

              {!pendingCircle && !pendingPolygon ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Selector forma */}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    {[
                      { type: 'circle', icon: '⬤', label: 'Cerchio' },
                      { type: 'polygon', icon: '⬡', label: 'Poligono' },
                    ].map(({ type, icon, label }) => (
                      <button
                        key={type}
                        onClick={() => {
                          setShapeType(type)
                          if (type === 'circle') setPolygonPoints([])
                        }}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: '10px',
                          border: shapeType === type
                            ? `2px solid ${drawMode === 'competitor' ? '#10B981' : '#FBBF24'}`
                            : '1.5px solid rgba(255,255,255,0.08)',
                          background: shapeType === type ? 'rgba(255,255,255,0.04)' : 'transparent',
                          color: shapeType === type
                            ? (drawMode === 'competitor' ? '#10B981' : '#FBBF24')
                            : '#6B7280',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '700',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span style={{ fontSize: '18px' }}>{icon}</span>
                        {label}
                      </button>
                    ))}
                  </div>
                  {shapeType === 'polygon' ? (
                    polygonPoints.length < 3 ? (
                      <div style={{
                        padding: '20px 14px',
                        border: '1px dashed rgba(255,255,255,0.12)',
                        borderRadius: '12px',
                        textAlign: 'center',
                        color: '#9CA3AF',
                        fontSize: '12px',
                        lineHeight: 1.5,
                        background: 'rgba(255,255,255,0.01)',
                      }}>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>🖊</div>
                        <strong>Clicca</strong> sulla mappa per aggiungere punti ({polygonPoints.length}/3 minimi).
                      </div>
                    ) : (
                      <button
                        onClick={handleChiudiPoligono}
                        style={{
                          width: '100%',
                          padding: '14px',
                          borderRadius: '10px',
                          border: `2px solid ${drawMode === 'competitor' ? '#10B981' : '#FBBF24'}`,
                          background: drawMode === 'competitor' ? 'rgba(16,185,129,0.1)' : 'rgba(251,191,36,0.1)',
                          color: drawMode === 'competitor' ? '#10B981' : '#FBBF24',
                          fontWeight: '800',
                          fontSize: '14px',
                          cursor: 'pointer',
                        }}
                      >
                        OK — Chiudi poligono ({polygonPoints.length} punti)
                      </button>
                    )
                  ) : (
                    <div style={{
                      padding: '20px 14px',
                      border: '1px dashed rgba(255,255,255,0.12)',
                      borderRadius: '12px',
                      textAlign: 'center',
                      color: '#9CA3AF',
                      fontSize: '12px',
                      lineHeight: 1.5,
                      background: 'rgba(255,255,255,0.01)',
                    }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>🖊</div>
                      <strong>Tieni premuto e trascina</strong> sulla mappa per disegnare il raggio della zona.
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {pendingCircle && (
                    <div>
                      <span style={{ color: '#4B5563', fontSize: '10px', textTransform: 'uppercase', fontWeight: '700' }}>
                        Raggio Zona
                      </span>
                      <p style={{ color: 'white', fontSize: '13px', fontWeight: '600', margin: '2px 0 0 0' }}>
                        {Math.round(pendingCircle.radius)} metri
                      </p>
                    </div>
                  )}
                  {pendingPolygon && (
                    <div>
                      <span style={{ color: '#4B5563', fontSize: '10px', textTransform: 'uppercase', fontWeight: '700' }}>
                        Punti Poligono
                      </span>
                      <p style={{ color: 'white', fontSize: '13px', fontWeight: '600', margin: '2px 0 0 0' }}>
                        {pendingPolygon.points.length} punti
                      </p>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: '#4B5563', fontSize: '10px', textTransform: 'uppercase', fontWeight: '700' }}>
                      Nome Identificativo
                    </span>
                    <input
                      placeholder="es. Barriera di Milano - Centro"
                      value={inputLabel}
                      onChange={e => setInputLabel(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        color: 'white',
                        padding: '8px 12px',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* Selector Stati */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ color: '#4B5563', fontSize: '10px', textTransform: 'uppercase', fontWeight: '700' }}>
                      Stati Inclusi
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {(drawMode === 'competitor' 
                        ? ['Ottimo / Ristrutturato', 'Nuovo / In costruzione']
                        : ['Da ristrutturare', 'Buono / Abitabile']
                      ).map(stato => {
                        const isSelected = selectedStates.has(stato)
                        const label = stato.includes('Buono') ? 'Buono / Abitabile' : stato.includes('Ottimo') ? 'Ottimo / Ristrutturato' : stato
                        return (
                          <label 
                            key={stato}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '10px', 
                              cursor: 'pointer',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              background: isSelected ? 'rgba(255,255,255,0.03)' : 'transparent',
                              border: '1.5px solid transparent',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedStates(prev => {
                                  const next = new Set(prev)
                                  if (next.has(stato)) {
                                    if (next.size > 1) next.delete(stato)
                                  } else {
                                    next.add(stato)
                                  }
                                  return next
                                })
                              }}
                              style={{ accentColor: drawMode === 'competitor' ? '#10B981' : '#FBBF24', width: '14px', height: '14px' }}
                            />
                            <span style={{ color: isSelected ? 'white' : '#9CA3AF', fontSize: '11px', fontWeight: '600' }}>
                              {label}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  {/* Aste Checkbox */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: '4px 0' }}>
                    <input
                      type="checkbox"
                      checked={inputInclAste}
                      onChange={e => setInputInclAste(e.target.checked)}
                      style={{ accentColor: '#ffffff', width: '14px', height: '14px' }}
                    />
                    <span style={{ color: '#D1D5DB', fontSize: '12px' }}>Includi aste giudiziarie</span>
                  </label>

                  {/* Salva / Cancella */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <button
                      onClick={handleSalvaZona}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '10px',
                        border: 'none',
                        background: drawMode === 'competitor' ? '#10B981' : '#FBBF24',
                        color: '#000',
                        fontWeight: '700',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Salva Zona
                    </button>
                    <button
                      onClick={() => { setPendingCircle(null); }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'transparent',
                        color: '#9CA3AF',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── ELENCO DELLE ZONE ── */
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Aree Monitorate ({zone.length})
                </span>
              </div>

              {zone.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: '#4B5563' }}>
                  <div style={{ fontSize: '30px', marginBottom: '8px', opacity: 0.3 }}>◎</div>
                  <p style={{ fontSize: '12px', margin: 0, lineHeight: 1.5 }}>
                    Nessuna area mappata.<br />Seleziona un'analisi in alto per iniziare.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1 }}>
                  {zone.map(z => {
                    const isCompetitor = z.stato_filtro && (z.stato_filtro.includes('Ottimo') || z.stato_filtro.includes('Nuovo'))
                    const themeColor = isCompetitor ? '#10B981' : '#FBBF24'
                    const isVisible = visibleZoneIds.has(z.id)

                    return (
                      <div 
                        key={z.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          borderRadius: '12px',
                          background: isVisible 
                            ? (isCompetitor ? 'rgba(16, 185, 129, 0.08)' : 'rgba(251, 191, 36, 0.08)')
                            : 'rgba(255, 255, 255, 0.01)',
                          border: 'none',
                          transition: 'all 0.2s ease',
                          opacity: isVisible ? 1 : 0.4,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => {
                            setVisibleZoneIds(prev => {
                              const next = new Set(prev)
                              if (next.has(z.id)) next.delete(z.id)
                              else next.add(z.id)
                              return next
                            })
                          }}
                          style={{ accentColor: themeColor, width: '15px', height: '15px', cursor: 'pointer', flexShrink: 0 }}
                        />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <p style={{
                              color: isVisible ? 'white' : '#6B7280',
                              fontWeight: '800',
                              fontSize: '13px',
                              margin: 0,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              {z.label || `Zona ${z.id.slice(0, 6)}`}
                            </p>
                            <button
                              onClick={() => handleRemoveZona(z)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#6B7280',
                                cursor: 'pointer',
                                fontSize: '13px',
                                padding: '0 2px',
                                transition: 'color 0.15s ease',
                              }}
                              onMouseEnter={e => e.target.style.color = '#EF4444'}
                              onMouseLeave={e => e.target.style.color = '#6B7280'}
                            >
                              ✕
                            </button>
                          </div>
                          <p style={{ color: isVisible ? '#9CA3AF' : '#6B7280', fontSize: '10px', margin: '2px 0 6px 0', fontWeight: '500' }}>
                            r = {z.radius_m}m • {z.includi_aste ? 'Aste incluse' : 'No aste'}
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {z.stato_filtro?.split(',').map(st => (
                              <span 
                                key={st}
                                style={{
                                  fontSize: '9px',
                                  fontWeight: '700',
                                  padding: '2px 6px',
                                  border: 'none',
                                  borderRadius: '4px',
                                  background: `${themeColor}15`,
                                  color: themeColor,
                                }}
                              >
                                {statoLabel(st)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Overlay Destro (Top) ── */}
      <div style={{
        position: 'absolute',
        top: '24px',
        right: '24px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        pointerEvents: 'auto',
      }}>

        {/* Campanella Notifiche */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setNotificheOpen(o => !o)}
            title="Notifiche"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgb(0, 0, 0)',
              border: 'none',
              borderRadius: '12px',
              width: '37px',
              height: '33px',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              fontSize: '15px',
              position: 'relative',
            }}
          >
            🔔
            {seguitiRimossi.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: '#EF4444',
                color: 'white',
                fontSize: '9px',
                fontWeight: '800',
                borderRadius: '999px',
                padding: '1px 5px',
                minWidth: '14px',
                lineHeight: '14px',
                textAlign: 'center',
              }}>
                {seguitiRimossi.length}
              </span>
            )}
          </button>

          {notificheOpen && (
            <>
              <div
                onClick={() => setNotificheOpen(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 1050 }}
              />
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '280px',
                background: 'rgb(0, 0, 0)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px',
                padding: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                zIndex: 1100,
              }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  Notifiche
                </div>
                {seguitiRimossi.length === 0 ? (
                  <p style={{ color: '#4B5563', fontSize: '12px', textAlign: 'center', padding: '16px 0', margin: 0 }}>
                    Nessuna notifica
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
                    {seguitiRimossi.map(item => (
                      <div
                        key={item.id}
                        onClick={() => handleApriDettaglio(item.id)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '8px',
                          background: 'rgba(255,255,255,0.04)',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, color: 'white', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.indirizzo || `Annuncio #${item.id}`}
                          </p>
                          <p style={{ margin: 0, color: '#EF4444', fontSize: '10px' }}>
                            Non più disponibile
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDismissRimosso(item.id) }}
                          title="Rimuovi dai seguiti"
                          style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '13px', flexShrink: 0 }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Toggle Solo Nuovi */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgb(0, 0, 0)',
          borderRadius: '12px',
          padding: '8px 14px',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        }}>
          <input
            type="checkbox"
            checked={soloNuovi}
            onChange={e => {
              setSoloNuovi(e.target.checked)
              setVistiSnapshot(e.target.checked ? new Set(visti) : null)
            }}
            style={{ accentColor: '#10B981', width: '13px', height: '13px' }}
          />
          <span style={{ color: '#E5E7EB', fontSize: '11px', fontWeight: '700' }}>Solo Nuovi</span>
          {nuoviCount > 0 && (
            <span style={{ background: '#10B981', color: '#000', fontSize: '9px', fontWeight: '800', padding: '1px 6px', borderRadius: '999px', marginLeft: '2px' }}>
              {nuoviCount} nuovi
            </span>
          )}
        </label>

        {/* Toggle Solo Seguiti */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgb(0, 0, 0)',
          borderRadius: '12px',
          padding: '8px 14px',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        }}>
          <input
            type="checkbox"
            checked={soloSeguiti}
            onChange={e => setSoloSeguiti(e.target.checked)}
            style={{ accentColor: '#FBBF24', width: '13px', height: '13px' }}
          />
          <span style={{ color: '#E5E7EB', fontSize: '11px', fontWeight: '700' }}>Solo Seguiti</span>
          {seguitiCount > 0 && (
            <span style={{ background: '#FBBF24', color: '#000', fontSize: '9px', fontWeight: '800', padding: '1px 6px', borderRadius: '999px', marginLeft: '2px' }}>
              {seguitiCount} seguiti
            </span>
          )}
        </label>

        {/* Bottone Esporta Excel */}
        <button
          onClick={esportaSeguiti}
          disabled={seguitiCount === 0}
          title="Esporta annunci seguiti in Excel"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1.5px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '8px 14px',
            color: '#4B5563',
            cursor: seguitiCount > 0 ? 'pointer' : 'not-allowed',
            fontSize: '11px',
            fontWeight: '700',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            height: '33px',
            boxSizing: 'border-box',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Excel
        </button>
      </div>

      {/* ── Barra Metriche Zona (Bottom Center) ── */}
      {hasZone && metricheBarra.some(m => m.media != null) && (
        <div style={{
          position: 'absolute',
          bottom: '65px',
          left: '410px',
          right: '180px',
          zIndex: 1000,
          background: 'rgb(0, 0, 0)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          pointerEvents: 'auto',
        }}>
          {metricheBarra.map((m, i) => (
            <div
              key={m.label}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '0 16px',
                borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                minWidth: 0,
              }}
            >
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: m.colore, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <p style={{
                  margin: 0,
                  color: '#6B7280',
                  fontSize: '9px',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {m.label}{m.count > 0 ? ` (${m.count})` : ''}
                </p>
                <p style={{ margin: '2px 0 0 0', color: 'white', fontSize: '15px', fontWeight: '800' }}>
                  {m.media != null ? `${Math.round(m.media).toLocaleString('it-IT')} €/m²` : '—'}
                </p>
                {m.omi && (
                  <p style={{ margin: '2px 0 0 0', color: '#4B5563', fontSize: '9px' }}>
                    OMI: {m.omi.prezzo_min}–{m.omi.prezzo_max} €/m²
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Legenda (Bottom Right) ── */}
      <div style={{
        position: 'absolute',
        bottom: '24px',
        right: '24px',
        zIndex: 1000,
        background: 'transparent',
        border: 'none',
        borderRadius: '12px',
        padding: '10px 14px',
        pointerEvents: 'auto',
      }}>
        {[
          { color: '#22C55E', label: 'Nuovo annuncio' },
          { color: '#F59E0B', label: 'Già visto' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{ width: 10, height: 10, borderRadius: '3px', background: color, flexShrink: 0 }} />
            <span style={{ color: '#000000', fontSize: '11px' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── Scheda Dettaglio Annuncio Rimosso ── */}
      {dettaglioAperto && (
        <div
          onClick={() => setDettaglioAperto(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-end',
            padding: '80px 4% 0 0',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#000000',
              border: '1px solid rgba(2, 2, 2, 0.1)',
              borderRadius: '18px',
              width: '820px',
              maxWidth: '58vw',
              maxHeight: '80vh',
              display: 'flex',
              alignItems: 'stretch',
              overflow: 'hidden',
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            }}
          >
            {dettaglioStorico.length > 0 && dettaglioStorico[dettaglioStorico.length - 1].immagine_stanza && (
              <div style={{ width: '270px', flexShrink: 0 }}>
                <img
                  src={dettaglioStorico[dettaglioStorico.length - 1].immagine_stanza}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'grayscale(0.3)' }}
                />
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0, padding: '26px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, color: 'white', fontSize: '17px', fontWeight: '800' }}>
                    {dettaglioStorico[dettaglioStorico.length - 1]?.indirizzo || `Annuncio #${dettaglioAperto}`}
                  </h3>
                  <p style={{ margin: '5px 0 0 0', color: '#EF4444', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Non più disponibile
                  </p>
                </div>
                <button
                  onClick={() => setDettaglioAperto(null)}
                  style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '18px', flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>

              {dettaglioStorico.length === 0 ? (
                <p style={{ color: '#6B7280', fontSize: '12px', textAlign: 'center', padding: '24px 0' }}>
                  Caricamento storico…
                </p>
              ) : (() => {
                const ultimo = dettaglioStorico[dettaglioStorico.length - 1]
                return (
                  <>
                    <div style={{ display: 'flex', gap: '28px', margin: '18px 0' }}>
                      <div>
                        <span style={{ color: '#4B5563', fontSize: '10px', textTransform: 'uppercase', fontWeight: '700' }}>
                          Ultimo prezzo
                        </span>
                        <p style={{ margin: '3px 0 0 0', color: 'white', fontSize: '19px', fontWeight: '800' }}>
                          {Number(ultimo.prezzo_valore).toLocaleString('it-IT')} €
                        </p>
                        {ultimo.prezzo_mq != null && (
                          <p style={{ margin: '2px 0 0 0', color: '#9CA3AF', fontSize: '11px' }}>
                            {Number(ultimo.prezzo_mq).toLocaleString('it-IT')} €/m²
                          </p>
                        )}
                      </div>
                      <div>
                        <span style={{ color: '#4B5563', fontSize: '10px', textTransform: 'uppercase', fontWeight: '700' }}>
                          Ultimo avvistamento
                        </span>
                        <p style={{ margin: '3px 0 0 0', color: 'white', fontSize: '13px', fontWeight: '600' }}>
                          {new Date(ultimo.data_scraping).toLocaleDateString('it-IT')}
                        </p>
                        {ultimo.stato_immobile && (
                          <p style={{ margin: '2px 0 0 0', color: '#9CA3AF', fontSize: '11px' }}>
                            {ultimo.stato_immobile}
                          </p>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                      {[
                        { label: 'Sup.',       value: ultimo.superficie ? `${ultimo.superficie} m²` : '—' },
                        { label: 'Locali',     value: ultimo.locali ?? '—' },
                        { label: 'Piano',      value: ultimo.piano ?? '—' },
                        { label: 'Bagni',      value: ultimo.bagni ?? '—' },
                        { label: 'Ascensore',  value: ultimo.ascensore ? 'Sì' : 'No' },
                        { label: 'Tipo',       value: ultimo.tipologia ?? '—' },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p style={{ color: '#4B5563', fontSize: '9px', margin: '0 0 2px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                          <p style={{ color: 'white', fontSize: '12px', fontWeight: '600', margin: 0 }}>{value}</p>
                        </div>
                      ))}
                    </div>

                    {ultimo.url && (
                      <a
                        href={ultimo.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'block', color: '#60A5FA', fontSize: '12px', marginBottom: '16px' }}
                      >
                        Apri annuncio originale →
                      </a>
                    )}

                    <span style={{ color: '#4B5563', fontSize: '10px', textTransform: 'uppercase', fontWeight: '700' }}>
                      Andamento prezzo
                    </span>
                    <div style={{ width: '100%', height: '130px', marginTop: '8px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dettaglioStorico.map(r => ({ data: r.data_scraping, prezzo: r.prezzo_valore }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                          <XAxis
                            dataKey="data"
                            tick={{ fill: '#6B7280', fontSize: 9 }}
                            tickFormatter={d => new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                          />
                          <YAxis
                            tick={{ fill: '#6B7280', fontSize: 9 }}
                            domain={['auto', 'auto']}
                            tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                            width={32}
                          />
                          <Tooltip
                            formatter={v => [`${Number(v).toLocaleString('it-IT')} €`, 'Prezzo']}
                            labelFormatter={d => new Date(d).toLocaleDateString('it-IT')}
                            contentStyle={{ background: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }}
                          />
                          <Line type="monotone" dataKey="prezzo" stroke="#FBBF24" strokeWidth={2} dot={{ r: 2 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
