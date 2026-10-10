import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import { detectInitialLocale, type UiLocale } from '@/i18n';

export type Theme = 'light' | 'dark';
export type Palette = 'blue' | 'light-modern';
const THEME_KEY = 'gg:theme';
const PALETTE_KEY = 'gg:palette';

export interface Toast {
  id: string;
  kind: 'success' | 'error' | 'info';
  message: string;
}

export interface UiState {
  theme: Theme;
  palette: Palette;
  locale: UiLocale;
  toasts: Toast[];
}

export function detectInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* storage unavailable */
  }
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyPalette(palette: Palette) {
  if (palette === 'light-modern') document.documentElement.dataset.palette = 'light-modern';
  else delete document.documentElement.dataset.palette;
  try {
    localStorage.setItem(PALETTE_KEY, palette);
  } catch {
    /* storage unavailable */
  }
}

function detectInitialPalette(): Palette {
  try {
    return localStorage.getItem(PALETTE_KEY) === 'light-modern' ? 'light-modern' : 'blue';
  } catch {
    return 'blue';
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage unavailable */
  }
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: (): UiState => ({ theme: detectInitialTheme(), palette: detectInitialPalette(), locale: detectInitialLocale(), toasts: [] }),
  reducers: {
    setTheme(state, action: PayloadAction<Theme>) {
      state.theme = action.payload;
    },
    toggleTheme(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
    },
    setPalette(state, action: PayloadAction<Palette>) {
      state.palette = action.payload;
    },
    setLocale(state, action: PayloadAction<UiLocale>) {
      state.locale = action.payload;
    },
    pushToast: {
      reducer(state, action: PayloadAction<Toast>) {
        state.toasts.push(action.payload);
        if (state.toasts.length > 4) state.toasts.shift();
      },
      prepare(toast: Omit<Toast, 'id'>) {
        return { payload: { ...toast, id: nanoid() } };
      },
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const { setTheme, toggleTheme, setPalette, setLocale, pushToast, dismissToast } = uiSlice.actions;
export default uiSlice.reducer;

export const selectTheme = (state: { ui: UiState }) => state.ui.theme;
export const selectPalette = (state: { ui: UiState }) => state.ui.palette;
export const selectLocale = (state: { ui: UiState }) => state.ui.locale;
export const selectToasts = (state: { ui: UiState }) => state.ui.toasts;
