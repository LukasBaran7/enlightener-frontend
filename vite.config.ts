import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { mergeConfig } from 'vite'
import { defineConfig as defineVitestConfig } from 'vitest/config'

const viteConfig = defineConfig({
  plugins: [vue()]
})

const vitestConfig = defineVitestConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    exclude: ['e2e/*'],
    include: ['./src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}']
  }
})

export default mergeConfig(viteConfig, vitestConfig)
