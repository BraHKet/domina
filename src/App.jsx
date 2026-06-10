import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Acquirente from './pages/Acquirente'
import AuthCallback from './pages/AuthCallback'

export default function App() {
  useEffect(() => {
    supabase.auth.getSession()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="auth/callback" element={<AuthCallback />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="acquirente" element={<Acquirente />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}