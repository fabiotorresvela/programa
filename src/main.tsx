import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App.tsx';

registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    // Revisa actualizaciones al abrir la app
    void registration?.update();
    window.setInterval(() => {
      void registration?.update();
    }, 60_000);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
