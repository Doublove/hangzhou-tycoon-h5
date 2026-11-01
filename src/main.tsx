import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { assertConfig } from './config'

// 启动自检：配置缺参或 NaN 直接失败，不静默算出错误数值（A18 / 10.3）。
assertConfig()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
