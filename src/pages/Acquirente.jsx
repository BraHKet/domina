import { BarChart2, TrendingUp, TrendingDown } from 'lucide-react'
import MapView from '../components/map/MapView'
import { defaultSelected, acquirenteData as a } from '../data/mockData'

export default function Acquirente() {
  return (
    <div className="p-8 space-y-6">
      {/* Top row: map + profile */}
      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3">
          <MapView
            center={[defaultSelected.lat, defaultSelected.lng]}
            zoom={15}
            selectedProperty={defaultSelected}
            markerType="green-dot"
            height="280px"
          />
        </div>

        <div className="col-span-2 flex flex-col justify-center gap-4">
          <div className="flex justify-center">
            <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-200">
              <img
                src="https://i.pravatar.cc/112?img=67"
                alt="Acquirente tipo"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <ul className="space-y-2">
            {[a.eta, a.professione, a.salario].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom row: stat cards + description */}
      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-2 space-y-3">
          <div className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
              <BarChart2 size={18} className="text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Budget medio</p>
              <p className="text-sm font-bold text-gray-900">
                €{a.budgetMin.toLocaleString('it-IT')} · €{a.budgetMax.toLocaleString('it-IT')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <TrendingUp size={18} className="text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400">In cerca di</p>
              <p className="text-sm font-bold text-gray-900">{a.cercano}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
              <TrendingDown size={18} className="text-green-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Priorità</p>
              <p className="text-sm font-bold text-gray-900">{a.priorita}</p>
            </div>
          </div>
        </div>

        <div className="col-span-3 bg-gray-50 rounded-xl p-5">
          <h4 className="font-bold text-gray-900 mb-3">
            Perchè comprano in Barriera di Milano
          </h4>
          <p className="text-sm text-gray-500 leading-relaxed">{a.descrizione}</p>
        </div>
      </div>
    </div>
  )
}