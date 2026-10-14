import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // questions.json is bundled into the main chunk on purpose (~370 kB, 80 kB gzipped)
    chunkSizeWarningLimit: 900,
  },
})
