import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const frappeUrl = env.VITE_FRAPPE_URL || 'http://localhost:8001'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5177,
      proxy: {
        // Proxy API requests to Frappe backend
        // This enables cookie-based authentication in development:
        // - Cookies from backend are automatically forwarded to/from the browser
        // - cookieDomainRewrite ensures cookies work across different ports on localhost
        // - changeOrigin ensures the Origin header matches the backend URL
        '/api': {
          target: frappeUrl,
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: 'localhost',
        },
      },
    },
  }
})
