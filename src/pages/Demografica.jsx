import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import MapView from '../components/map/MapView'
import { defaultSelected, demograficaData as d } from '../data/mockData'

export default function Demografica() {
  return (
    <div className="p-8 space-y-6">
      {/* Top row: map + legend + family status */}
      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3">
          <MapView
            center={[defaultSelected.lat, defaultSelected.lng]}
            zoom={15}
            selectedProperty={defaultSelected}
            markerType="green-dot"
            cantieri={d.cantieri}
            zoneRischio={d.zoneRischio}
            height="280px"
          />
        </div>

        <div className="col-span-2 flex flex-col justify-center gap-6">
          {/* Legend */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-3 h-3 rounded-full bg-gray-400 shrink-0" />
              Cantieri
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-3 h-3 rounded-full bg-red-300 shrink-0" />
              Zone a rischio criminalità
            </div>
          </div>

          {/* Family status */}
          <div className="space-y-2">
            {d.familyStatus.map((s) => (
              <div key={s.label} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0" />
                <span>{s.label}</span>
                <span className="text-gray-400">· {s.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row: chart + news */}
      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3">
          <h3 className="text-base font-bold text-gray-900 mb-4">
            Età cittadini su Corso Giulio Cesare
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.ageDistribution} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis
                dataKey="eta"
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: '#111827',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '12px',
                }}
                cursor={{ fill: '#F3F4F6' }}
              />
              <Bar dataKey="count" fill="#93C5FD" radius={[3, 3, 0, 0]} />
              <ReferenceLine
                y={d.target}
                stroke="#6B7280"
                strokeDasharray="4 4"
                label={{
                  value: `Target ${d.target}`,
                  position: 'insideTopRight',
                  fontSize: 11,
                  fill: '#374151',
                  dy: -6,
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-2">
          <div className="bg-gray-50 rounded-xl p-4 h-full">
            <h4 className="font-bold text-gray-900 mb-3">Notizie</h4>
            <ol className="space-y-2">
              {d.notizie.map((news, i) => (
                <li key={i} className="text-sm text-gray-500 flex gap-2">
                  <span className="text-gray-400 shrink-0">{i + 1}.</span>
                  {news}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}