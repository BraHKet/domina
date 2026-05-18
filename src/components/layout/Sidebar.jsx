import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  User,
  Users,
  HardHat,
  Building2,
  Settings,
  LogOut,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/acquirente', icon: User, label: 'Acquirente' },
  { to: '/demografica', icon: Users, label: 'Demografica' },
  { to: '/non-ristrutturati', icon: HardHat, label: 'Non Ristruttt.' },
  { to: '/ristrutturato', icon: Building2, label: 'Ristrutturato' },
]

function NavItem({ to, icon: Icon, label }) {
  const { pathname } = useLocation()
  const isActive = pathname === to

  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
        isActive
          ? 'bg-gray-900 text-white'
          : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
      }`}
    >
      <Icon size={17} className={isActive ? 'text-amber-400' : ''} />
      {label}
    </Link>
  )
}

export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-100 flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-6 py-6">
        <span className="text-2xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            D
          </span>
          <span className="text-gray-900">omina</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      {/* User */}
      <div className="px-4 pb-6 flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-200">
          <img
            src="https://i.pravatar.cc/56?img=11"
            alt="Lorenzo"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-900">Lorenzo</p>
          <p className="text-xs text-gray-400">Investitore immobiliare</p>
        </div>
        <div className="flex gap-2">
          <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-400 hover:text-gray-700 transition-colors">
            <Settings size={15} />
          </button>
          <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-400 hover:text-gray-700 transition-colors">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}