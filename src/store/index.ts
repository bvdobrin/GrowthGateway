import { combineReducers, configureStore } from '@reduxjs/toolkit';
import chat from './chatSlice';
import { damApi } from './damApi';
import filters from './filtersSlice';
import { listenerMiddleware } from './listeners';
import session from './sessionSlice';
import ui from './uiSlice';

const rootReducer = combineReducers({
  session,
  filters,
  chat,
  ui,
  [damApi.reducerPath]: damApi.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export function makeStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefault) => getDefault().prepend(listenerMiddleware.middleware).concat(damApi.middleware),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];

export const store = makeStore();
