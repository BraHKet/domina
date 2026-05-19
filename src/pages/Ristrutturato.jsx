import { useState, useMemo } from 'react'
import { ShoppingBag } from 'lucide-react'
import MapView from '../components/map/MapView'
import PropertyCard from '../components/ui/PropertyCard'
import { useProperties } from '../hooks/useProperties'
import { ristrutturazione } from '../data/mockData'

export default function Ristrutturato() {
  const { properties, loading } = useProperties()
  const list = useMemo(
    () => properties.filter((p) => p.type === 'ristrutturato'),
    [properties]
  )
  const [selected, setSelected] = useState(null)
  useMemo(() => {
    if (list.length > 0 && !selected) setSelected(list[0])
  }, [list])

  const r = ristrutturazione

  if (loading) return <div className="p-8 text-gray-400">Caricamento...</div>

  return (
    <div className="p-8 space-y-6">
      <MapView
        center={[45.093, 7.685]}
        zoom={15}
        markers={list.filter((p) => p.id !== selected?.id)}
        selectedProperty={selected}
        markerType="green-dot"
        height="250px"
      />

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {list.map((p) => (
            <PropertyCard
              key={p.id}
              property={p}
              selected={selected?.id === p.id}
              onClick={() => setSelected(p)}
            />
          ))}
        </div>

        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Costi di ristrutturazione</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1.5">Costi stimati</p>
              <p className="text-xl font-bold text-red-500">
                €{r.costiStimati.toLocaleString('it-IT')}
              </p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col items-center justify-center row-span-2">
              <p className="text-xs font-semibold text-gray-400 tracking-widest mb-1">PROFITTO STIMATO</p>
              <p className="text-5xl font-bold text-green-500">+{r.profittoStimato / 1000}K</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1.5">Tasse</p>
              <p className="text-xl font-bold text-red-500">€{r.tasse.toLocaleString('it-IT')}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1.5">Prezzo di rivendita</p>
              <p className="text-xl font-bold text-red-500">€{r.prezzoRivendita.toLocaleString('it-IT')}</p>
            </div>
          </div>
          <button className="mt-4 w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 rounded-xl transition-colors">
            <ShoppingBag size={18} className="text-amber-400" />
            COMPRA
          </button>
        </div>
      </div>
    </div>
  )
}