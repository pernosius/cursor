import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { applyTheme, useUi } from './store/ui';
import './styles/global.css';

applyTheme(useUi.getState().theme);
matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
  if (useUi.getState().theme === 'system') applyTheme('system');
});
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
