/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: base must match the GitHub repo name for GitHub Pages project
// pages (https://<user>.github.io/owner-portfolio/). If the repo is ever
// renamed, this must change too (Master Prompt §8 — HashRouter is used
// specifically so this is the *only* GitHub-Pages-specific setting needed).
export default defineConfig({
  base: '/owner-portfolio/',
  plugins: [react()],
  test: {
    environment: 'node',
    globals: false,
  },
})
