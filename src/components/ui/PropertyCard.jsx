import { Home, Maximize2, Bath, Layers, ArrowUpDown } from 'lucide-react'

const badgeStyle = {
  SKY: 'bg-cyan-500',
  VETRINA: 'bg-cyan-500',
  HOMEPANDA: 'bg-yellow-500',
  NUOVO: 'bg-orange-500',
}

export default function PropertyCard({ property, selected = false, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`flex gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
        selected
          ? 'border-gray-800 bg-gray-50 shadow-sm'
          : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      {/* Thumbnail */}
      <div className="relative w-28 h-20 rounded-lg overflow-hidden shrink-0 bg-gray-200">
        <img
          src={`https://picsum.photos/seed/${property.id}card/112/80`}
          alt={property.address}
          className="w-full h-full object-cover"
          onError={(e) => { e.target.style.display = 'none' }}
        />
        {property.badge && (
          <span
            className={`absolute bottom-1 left-1 text-white text-[9px] font-bold px-1.5 py-0.5 rounded ${
              badgeStyle[property.badge] ?? 'bg-gray-600'
            }`}
          >
            {property.badge}
          </span>
        )}
        {property.imageCount && (
          <span className="absolute bottom-1 right-1 text-white text-[9px] bg-black/50 px-1.5 py-0.5 rounded">
            1/{property.imageCount}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-bold text-gray-900 mb-0.5">
          € {property.price.toLocaleString('it-IT')}
        </p>
        <p className="text-xs text-gray-500 mb-2 truncate">{property.fullAddress}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Home size={11} /> {property.rooms} locali
          </span>
          <span className="flex items-center gap-1">
            <Maximize2 size={11} /> {property.size} m²
          </span>
          <span className="flex items-center gap-1">
            <Bath size={11} /> {property.bathrooms} bagno
          </span>
          <span className="flex items-center gap-1">
            <Layers size={11} /> Piano {property.floor}
          </span>
          <span className="flex items-center gap-1">
            <ArrowUpDown size={11} /> {property.hasElevator ? 'Ascensore' : 'No Ascensore'}
          </span>
        </div>
      </div>
    </div>
  )
}