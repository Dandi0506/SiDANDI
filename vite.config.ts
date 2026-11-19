import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Tambahkan proxy ke backend di sini nanti, contoh:
// server: { proxy: { '/api': 'http://localhost:3000' } }
export default defineConfig({
  plugins: [react()],
})
