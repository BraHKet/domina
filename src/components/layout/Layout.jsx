import { Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div style={{ height: '100vh', overflow: 'hidden', background: '#0D1117' }}>
      <Outlet />
    </div>
  )
}