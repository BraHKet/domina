import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Acquirente from './pages/Acquirente'

export default function App() {
  useEffect(() => {
    // Gestisce il token OAuth nell'hash URL dopo il redirect
    if (window.location.hash.includes('access_token')) {
      supabase.auth.getSession()
    }
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="acquirente" element={<Acquirente />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}