import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const BACKEND_ORIGIN = 'http://127.0.0.1:8120'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash]-v2.js`,
        chunkFileNames: `assets/[name]-[hash]-v2.js`,
        assetFileNames: `assets/[name]-[hash]-v2.[ext]`,
      },
    },
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5120,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      // API 호출
      '/api': {
        target: BACKEND_ORIGIN,
        changeOrigin: true,
      },
      // 레거시 보고서 정적 자원
      '/static': {
        target: BACKEND_ORIGIN,
        changeOrigin: true,
      },
      // 아티팩트 파일
      '/artifacts': {
        target: BACKEND_ORIGIN,
        changeOrigin: true,
      },
    },
  },
})
