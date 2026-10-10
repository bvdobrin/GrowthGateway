import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import i18n, { applyDocumentLocale, persistLocale } from '@/i18n';
import { clearChat } from './chatSlice';
import { damApi } from './damApi';
import { login, logout, persistSession, viewAs, type SessionState } from './sessionSlice';
import { applyAppearance, setAppearance, setLocale, type UiState } from './uiSlice';

type ListenerRoot = { session: SessionState; ui: UiState };

export const listenerMiddleware = createListenerMiddleware();

/** Identity changes: persist the session, and drop anything cached for the previous identity. */
listenerMiddleware.startListening({
  matcher: isAnyOf(login.fulfilled, logout.fulfilled, viewAs.fulfilled),
  effect: (_action, api) => {
    persistSession((api.getState() as ListenerRoot).session);
    api.dispatch(damApi.util.resetApiState());
    api.dispatch(clearChat());
  },
});

/** UI language: translations, `lang`/`dir` on <html>, and persistence. Never touches the session or queries. */
listenerMiddleware.startListening({
  actionCreator: setLocale,
  effect: async (action) => {
    await i18n.changeLanguage(action.payload);
    applyDocumentLocale(action.payload);
    persistLocale(action.payload);
  },
});

listenerMiddleware.startListening({
  actionCreator: setAppearance,
  effect: (_action, api) => {
    const { theme, palette } = (api.getState() as ListenerRoot).ui;
    applyAppearance(theme, palette);
  },
});
