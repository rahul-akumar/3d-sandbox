import { defineConfig } from 'vite'
import { templateCompilerOptions } from '@tresjs/core';
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue({
    ...templateCompilerOptions
  })],
  resolve: {
    dedupe: ['three']
  }
})
