import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      // In locale fa le veci di api/catasto-wfs.js, che online gira su Vercel
      '/api/catasto-wfs': {
        target: 'https://wfs.cartografia.agenziaentrate.gov.it',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/catasto-wfs/, '/inspire/wfs/owfs01.php'),
        configure: (proxy) => {
          // Il servizio rifiuta le intestazioni del browser: si inoltra una richiesta semplice
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.getHeaderNames().forEach((name) => {
              if (name !== 'host') proxyReq.removeHeader(name)
            })
            proxyReq.setHeader('user-agent', 'Domina/0.1 (consultazione particelle catastali)')
          })
        },
      },
    },
  },
})
