import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { BuilderErrorBoundary } from './components/BuilderErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BuilderErrorBoundary>
      <App />
    </BuilderErrorBoundary>
  </StrictMode>,
);
