import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // En desarrollo local (sin Docker) las llamadas /api van al backend
    proxy: { '/api': 'http://localhost:3000' },
  },
});
