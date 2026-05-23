import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Search } from 'lucide-react'

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/acquirente': "Profilo dell'acquirente di zona",
}

export default function Layout() {
  const { pathname } = useLocation()
  const title = pageTitles[pathname] ?? 'Dashboard'

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-8 py-5 border-b border-gray-100 shrink-0">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 w-60">
              <Search size={15} className="text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Cerca..."
                className="bg-transparent text-sm outline-none text-gray-700 w-full placeholder:text-gray-400"
              />
            </div>
            <button className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-xl whitespace-nowrap">
              Barriera di Milano
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}