import { defineConfig } from 'vite';

// Konfigurasi minimal. Tambahkan proxy ke backend di sini nanti, contoh:
// server: { proxy: { '/api': 'http://localhost:3000' } }
export default defineConfig({
  server: { port: 5173, open: true },
});
