import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
  build: {
    // Keep the POS screen's initial bundle small; reports/settings are lazy-loaded (Section 2).
    target: 'es2020',
  },
});
