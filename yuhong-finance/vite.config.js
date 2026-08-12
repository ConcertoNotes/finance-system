import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/zrender/')) return 'zrender'
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: ['.trycloudflare.com'],
  },
})
