import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import 'leaflet/dist/leaflet.css';
import './index.css';
import App from './App';
import { ColorModeProvider } from './theme/ColorModeProvider';
import { ToastProvider } from './components/ToastProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ColorModeProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ColorModeProvider>
  </React.StrictMode>,
);
