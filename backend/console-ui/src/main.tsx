import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './styles/admin.css';
import './styles/console-topbar.css';
import './styles/console-overrides.css';
import './styles/telecaller-crm.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
