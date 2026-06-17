import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Acquirente from './pages/Acquirente'
import AuthCallback from './pages/AuthCallback'

export default function App() {
  const { user } = useAuth()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="auth/callback" element={<AuthCallback />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard key={user?.id ?? 'guest'} />} />
          <Route path="acquirente" element={<Acquirente />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}