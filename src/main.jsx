import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import App from './App';
import './styles/draft-actions.css';
import './styles/player-connection.css';
import './styles/layout-fixes.css';
import './styles/gameplan-v2.css';
import './styles/viewport-resilience.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
);
