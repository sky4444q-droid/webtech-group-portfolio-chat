import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// @ts-ignore CSS is loaded by the bundler; TypeScript has no declaration for it.
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
