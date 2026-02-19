import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerServiceWorker } from './utils/pwa.js'

// Register service worker for PWA functionality
if (import.meta.env.PROD) {
  registerServiceWorker().catch(console.error);
}

// Log app initialization
console.log('🦡 HoneyBadger initialized');
console.log('Environment:', import.meta.env.MODE);
console.log('Device:', /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
