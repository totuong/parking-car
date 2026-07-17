import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  server: {
    allowedHosts: true,
    proxy: {
      // MJPEG must not be buffered or <img> only shows the first frame.
      '/api/stream': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        timeout: 0,
        proxyTimeout: 0,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['cache-control'] = 'no-cache, no-store, must-revalidate'
            proxyRes.headers['x-accel-buffering'] = 'no'
            delete proxyRes.headers['content-length']
          })
        },
      },
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
})
