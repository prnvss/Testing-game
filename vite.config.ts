import react from '@vitejs/plugin-react'
import {defineConfig} from 'vite'

// `base: './'` keeps every asset path relative, so the built `dist/` folder
// works when uploaded to any Hostinger directory (public_html or a subfolder).
export default defineConfig({
  base: './',
  plugins: [react()],
})
