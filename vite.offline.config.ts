import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"

/**
 * 离线单文件构建：产物 dist-offline/index.html 双击即可游玩（file:// 协议）。
 *
 * 为什么需要单独一份配置：线上构建用 <script type="module" src="..."> 拆包，
 * 而 file:// 下浏览器会以 CORS 策略拦截外部 module 脚本（origin 为 null），
 * 页面只能保持空白。单文件构建把 JS / CSS 全部内联，绕开这个限制。
 * 线上仍使用 vite.config.ts 的多文件产物（带 hash 指纹，可上 CDN）。
 */
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile({ removeViteModuleLoader: true })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist-offline',
    emptyOutDir: true,
    target: 'es2020',
    cssCodeSplit: false,
    modulePreload: false,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        // 动态 import（结算页 / 模拟报告页）必须内联，否则 file:// 下同样取不到
        inlineDynamicImports: true,
      },
    },
  },
})
