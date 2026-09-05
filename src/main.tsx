import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

const rootEl = document.getElementById('root')
if (!rootEl) {
  // Fails loudly rather than silently rendering nothing — an empty white
  // screen with no error is exactly the kind of failure Master Prompt §23
  // forbids hiding.
  throw new Error('Root element #root not found — index.html is misconfigured.')
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
