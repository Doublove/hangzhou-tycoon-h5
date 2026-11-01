import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
  build: {
    // 首屏资源 ≤ 3MB 是硬指标（10.5）：按层拆包，图表与 UI 组件按需加载
    target: 'es2020',
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-')) return 'charts'
            if (id.includes('@radix-ui')) return 'ui'
            if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'react'
            return 'vendor'
          }
          if (id.includes('/src/engine/') || id.includes('/src/sim/')) return 'engine'
          if (id.includes('/src/config/')) return 'config'
          if (id.includes('/src/render/')) return 'render'
          return undefined
        },
      },
    },
  },
})
