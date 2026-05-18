import { useState } from 'react'
import MapView from '../components/map/MapView'
import PropertyCard from '../components/ui/PropertyCard'
import { properties, comparabili, defaultSelected } from '../data/mockData'

const list = properties.filter((p) => p.type === 'non-ristrutturato')

export default function NonRistrutturati() {
  const [selected, setSelected] = useState(defaultSelected)

  return (
    <div className="p-8 space-y-6">
      {/* Map */}
      <MapView
        center={[45.093, 7.685]}
        zoom={15}
        markers={list.filter((p) => p.id !== selected?.id)}
        selectedProperty={selected}
        markerType="orange-dot"
        height="250px"
      />

      {/* Bottom section */}
      <div className="grid grid-cols-2 gap-6">
        {/* Property list */}
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

        {/* Comparabili di vendita */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Comparabili di vendita</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1.5">Prezzo al metro quadro</p>
              <p className="text-xl font-bold text-gray-900">{comparabili.prezzoMq} €/mq</p>
            </div>

            {/* Score — spans 2 rows visually */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col items-center justify-center row-span-2">
              <p className="text-xs font-semibold text-gray-400 tracking-widest mb-1">SCORE</p>
              <p className="text-5xl font-bold text-green-500">{comparabili.score}/10</p>
            </div>

            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1.5">Tempo sul mercato</p>
              <p className="text-xl font-bold text-gray-900">{comparabili.tempoMercato} giorni</p>
            </div>

            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1.5">Anno di costruzione medio</p>
              <p className="text-xl font-bold text-gray-900">{comparabili.annoCostruzione}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}