import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StoreProvider } from '@app/providers';
import {App} from "@app/App.tsx";
import '@app/styles/index.scss';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <StoreProvider>
        <App />
      </StoreProvider>
    </StrictMode>
);