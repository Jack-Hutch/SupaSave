import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker — enables offline support and install prompt
registerSW({
  onNeedRefresh() {
    // New content available; auto-update in background
  },
  onOfflineReady() {
    // App is ready to work offline
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
