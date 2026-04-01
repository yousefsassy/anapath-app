import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { InlineConfig as VitestInlineConfig } from 'vitest/node'

// https://vite.dev/config/
const config = {
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  } satisfies VitestInlineConfig,
}

export default defineConfig(config)
