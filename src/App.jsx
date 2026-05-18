import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Acquirente from './pages/Acquirente'
import Demografica from './pages/Demografica'
import NonRistrutturati from './pages/NonRistrutturati'
import Ristrutturato from './pages/Ristrutturato'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="acquirente" element={<Acquirente />} />
          <Route path="demografica" element={<Demografica />} />
          <Route path="non-ristrutturati" element={<NonRistrutturati />} />
          <Route path="ristrutturato" element={<Ristrutturato />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}