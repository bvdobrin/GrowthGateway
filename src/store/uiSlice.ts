import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import { detectInitialLocale, type UiLocale } from '@/i18n';

export type Theme = 'light' | 'dark';
export type Palette = 'blue' | 'modern';
export type Appearance = 'light-blue' | 'dark-blue' | 'light-modern' | 'dark-modern';

const APPEARANCES: readonly Appearance[] = ['light-blue', 'dark-blue', 'light-modern', 'dark-modern'];
const APPEARANCE_KEY = 'gg:appearance';
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

export function appearanceOf(theme: Theme, palette: Palette): Appearance {
  return `${theme}-${palette}`;
}

export function splitAppearance(appearance: Appearance): { theme: Theme; palette: Palette } {
  return {
    theme: appearance.startsWith('dark') ? 'dark' : 'light',
    palette: appearance.endsWith('modern') ? 'modern' : 'blue',
  };
}

function isAppearance(value: string | null): value is Appearance {
  return !!value && (APPEARANCES as readonly string[]).includes(value);
}

function preferredTheme(): Theme {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Restores the last choice, including the previous separate theme and palette keys. */
export function detectInitialAppearance(): { theme: Theme; palette: Palette } {
  try {
    const stored = localStorage.getItem(APPEARANCE_KEY);
    if (isAppearance(stored)) return splitAppearance(stored);

    const themeStored = localStorage.getItem(THEME_KEY);
    const paletteStored = localStorage.getItem(PALETTE_KEY);
    const theme: Theme = themeStored === 'light' || themeStored === 'dark' ? themeStored : preferredTheme();
    const palette: Palette = paletteStored === 'modern' || paletteStored === 'light-modern' ? 'modern' : 'blue';
    return { theme, palette };
  } catch {
    return { theme: 'light', palette: 'blue' };
  }
}

export function applyAppearance(theme: Theme, palette: Palette) {
  document.documentElement.dataset.theme = theme;
  if (palette === 'modern') document.documentElement.dataset.palette = 'modern';
  else delete document.documentElement.dataset.palette;
  try {
    localStorage.setItem(APPEARANCE_KEY, appearanceOf(theme, palette));
  } catch {
    /* storage unavailable */
  }
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: (): UiState => ({ ...detectInitialAppearance(), locale: detectInitialLocale(), toasts: [] }),
  reducers: {
    setAppearance(state, action: PayloadAction<Appearance>) {
      const next = splitAppearance(action.payload);
      state.theme = next.theme;
      state.palette = next.palette;
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

export const { setAppearance, setLocale, pushToast, dismissToast } = uiSlice.actions;
export default uiSlice.reducer;

export const selectAppearance = (state: { ui: UiState }) => appearanceOf(state.ui.theme, state.ui.palette);
export const selectLocale = (state: { ui: UiState }) => state.ui.locale;
export const selectToasts = (state: { ui: UiState }) => state.ui.toasts;
