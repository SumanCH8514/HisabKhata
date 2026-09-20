import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function fontFallbackPlugin() {
  const fallbackFont = path.resolve(__dirname, 'src/assets/fonts/91145014c0350c248ed2.woff2')
  return {
    name: 'font-fallback-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const cleanUrl = (req.url || '').split('?')[0]
        if (/\.(woff2|woff|ttf|otf|eot)$/i.test(cleanUrl) || cleanUrl.includes('/fonts/')) {
          const relativePath = cleanUrl.replace(/^\/+/, '')
          const directPath = path.resolve(__dirname, relativePath)
          const publicPath = path.resolve(__dirname, 'public', relativePath)
          if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
            return next()
          }
          if (fs.existsSync(publicPath) && fs.statSync(publicPath).isFile()) {
            return next()
          }
          if (fs.existsSync(fallbackFont)) {
            res.setHeader('Content-Type', 'font/woff2')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.statusCode = 200
            return fs.createReadStream(fallbackFont).pipe(res)
          }
        }
        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), fontFallbackPlugin()],
  server: {
    host: true,
    port: 5173,
    hmr: {
      host: 'localhost',
      port: 5173,
      protocol: 'ws'
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/database'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
          'vendor-excel': ['xlsx']
        }
      }
    }
  }
})
