import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {registerSW} from 'virtual:pwa-register';

// Suppress unhandled service worker abort rejections that can occur when preview iframe reloads
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason?.message || String(reason || '');
    if (
      reason?.name === 'AbortError' ||
      msg.includes('ServiceWorker') ||
      msg.includes('dev-sw.js') ||
      msg.includes('Operation has been aborted')
    ) {
      event.preventDefault();
    }
  });

  // Safely clean up any stuck or aborted dev service workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        for (const reg of registrations) {
          if (
            reg.active?.scriptURL.includes('dev-sw.js') ||
            reg.installing?.scriptURL.includes('dev-sw.js') ||
            reg.waiting?.scriptURL.includes('dev-sw.js')
          ) {
            reg.unregister().catch(() => {});
          }
        }
      })
      .catch(() => {});

    // Safe production registration with explicit error catching
    try {
      registerSW({
        immediate: true,
        onRegisterError(error: unknown) {
          // Gracefully handle iframe or aborted registrations without throwing unhandled exceptions
          console.info('PWA registration notice:', error);
        },
      });
    } catch {
      // Ignore registration errors
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
