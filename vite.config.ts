import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/pokemon-autochess/', // 請將此改為您的 GitHub 倉庫名稱
})
