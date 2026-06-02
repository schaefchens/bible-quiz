import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n.js';
import './index.css';
import App from './App.jsx';
import { AudioProvider } from './context/AudioContext.jsx';

// Reload the page when a new service worker takes control so users
// always get fresh assets without having to manually clear the cache.
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AudioProvider>
      <App />
    </AudioProvider>
  </React.StrictMode>
);

