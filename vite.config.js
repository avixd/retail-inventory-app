import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base is the GitHub Pages project-site subpath: https://avixd.github.io/retail-inventory-app/
export default defineConfig({
  base: '/retail-inventory-app/',
  plugins: [react()],
})
