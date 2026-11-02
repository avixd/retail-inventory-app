/**
 * React entry point. Loads the static snapshot first (so the first paint shows
 * last night's real numbers, not the built-in demo data), renders, then starts
 * waking the live API in the background.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import './index.css'
import App from './App.jsx'
import { goLive, loadSnapshot } from './data/dataSource'

loadSnapshot().finally(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  goLive()
})
