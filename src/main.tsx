// Must load first: it declares the cascade-layer order that every CSS module relies on.
import './styles/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './app/AppRoutes';
import { applyDocumentLocale } from './i18n';
import { store } from './store';
import { applyPalette, applyTheme } from './store/uiSlice';

const { ui } = store.getState();
applyDocumentLocale(ui.locale);
applyTheme(ui.theme);
applyPalette(ui.palette);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppRoutes />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
