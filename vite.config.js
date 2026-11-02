import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Content-Security-Policy for the published build. GitHub Pages can't send response
// headers, so it goes in a <meta> tag. The only cross-origin request the page may
// make is to the read-only API; everything else must come from the site itself.
// Build-only: Vite's dev server relies on inline scripts and a websocket.
function contentSecurityPolicy() {
  let api = ''
  return {
    name: 'content-security-policy',
    apply: 'build',
    configResolved(config) {
      api = (config.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
    },
    transformIndexHtml() {
      const csp = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "font-src 'self' data:",
        `connect-src 'self'${api ? ` ${api}` : ''}`,
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'none'",
      ].join('; ')
      return [
        { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: csp }, injectTo: 'head-prepend' },
        { tag: 'meta', attrs: { name: 'referrer', content: 'no-referrer' }, injectTo: 'head-prepend' },
      ]
    },
  }
}

// https://vite.dev/config/
// base is the GitHub Pages project-site subpath: https://avixd.github.io/retail-inventory-app/
export default defineConfig({
  base: '/retail-inventory-app/',
  plugins: [react(), contentSecurityPolicy()],
})
