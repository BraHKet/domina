import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, User } from 'lucide-react'

export default function Sidebar() {
  const { pathname } = useLocation()

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
        {/* Dashboard */}
        <Link
          to="/dashboard"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            pathname === '/dashboard'
              ? 'bg-gray-900 text-white'
              : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
          }`}
        >
          <LayoutDashboard size={17} className={pathname === '/dashboard' ? 'text-amber-400' : ''} />
          Dashboard
        </Link>

        {/* Acquirente — disabilitato */}
        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-gray-300 cursor-not-allowed select-none">
          <div className="flex items-center gap-3">
            <User size={17} />
            Acquirente
          </div>
          <span className="text-[10px] font-semibold bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
            A breve
          </span>
        </div>
      </nav>
    </aside>
  )
}