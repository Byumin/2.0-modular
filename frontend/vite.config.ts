import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // API 호출
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // 레거시 보고서 정적 자원
      '/static': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // 아티팩트 파일
      '/artifacts': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
