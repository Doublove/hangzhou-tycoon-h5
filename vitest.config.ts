import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest 配置：逻辑层测试与批量模拟（?sim=1）共用一套 resolver。
 * 强制 environment=node 以保证逻辑层零 DOM 依赖的约束可被自动验证（10.2）。
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    reporters: ['default'],
  },
});
