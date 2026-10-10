import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { PERSONAS_BY_ID } from '@/mocks/users';
import { logEvent } from '@/services/auditService';
import { IDP_NAME, isSessionValid, signIn, signOut } from '@/services/authService';
import { fetchEntitlements, resolvePermissions } from '@/services/iamService';
import type { Permission, Session, User } from '@/types';

export const SESSION_STORAGE_KEY = 'gg:session';

export interface SessionState {
  session: Session | null;
  /** Demo impersonation: the persona whose entitlements are applied. */
  viewAsId: string | null;
  /** Permissions of the effective user (signed-in or viewed-as). */
  permissions: Permission[];
  status: 'idle' | 'signing_in' | 'authenticated';
  pendingPersonaId: string | null;
  error: string | null;
}

interface PersistedSession {
  session: Session;
  viewAsId: string | null;
}

export function loadPersistedSession(): Pick<SessionState, 'session' | 'viewAsId' | 'permissions' | 'status'> {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as PersistedSession) : null;
    if (parsed && isSessionValid(parsed.session)) {
      const effective = (parsed.viewAsId && PERSONAS_BY_ID[parsed.viewAsId]) || parsed.session.user;
      return { session: parsed.session, viewAsId: parsed.viewAsId, permissions: resolvePermissions(effective), status: 'authenticated' };
    }
  } catch {
    /* ignore malformed storage */
  }
  return { session: null, viewAsId: null, permissions: [], status: 'idle' };
}

export function persistSession(state: SessionState) {
  try {
    if (state.session) {
      const value: PersistedSession = { session: state.session, viewAsId: state.viewAsId };
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(value));
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    /* storage unavailable */
  }
}

const initialState = (): SessionState => ({ ...loadPersistedSession(), pendingPersonaId: null, error: null });

export const login = createAsyncThunk('session/login', async (personaId: string) => {
  const session = await signIn(personaId);
  const { permissions } = await fetchEntitlements(session.user);
  await logEvent(session.user, 'auth.sign_in', undefined, IDP_NAME);
  return { session, permissions };
});

export const logout = createAsyncThunk<void, void, { state: { session: SessionState } }>('session/logout', async (_, { getState }) => {
  const user = getState().session.session?.user;
  await signOut();
  if (user) await logEvent(user, 'auth.sign_out');
});

export const viewAs = createAsyncThunk<string | null, string | null, { state: { session: SessionState } }>(
  'session/viewAs',
  async (personaId, { getState }) => {
    const user = getState().session.session?.user;
    if (user) await logEvent(user, 'auth.view_as', undefined, personaId ? `Viewing as ${PERSONAS_BY_ID[personaId]?.name}` : 'Stopped viewing as');
    return personaId && personaId !== user?.id ? personaId : null;
  },
);

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state, action) => {
        state.status = 'signing_in';
        state.pendingPersonaId = action.meta.arg;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.session = action.payload.session;
        state.permissions = action.payload.permissions;
        state.viewAsId = null;
        state.status = 'authenticated';
        state.pendingPersonaId = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.pendingPersonaId = null;
        state.error = action.error.message ?? 'Sign-in failed';
        state.status = state.session ? 'authenticated' : 'idle';
      })
      .addCase(logout.fulfilled, (state) => {
        state.session = null;
        state.viewAsId = null;
        state.permissions = [];
        state.status = 'idle';
      })
      .addCase(viewAs.fulfilled, (state, action) => {
        if (!state.session) return;
        state.viewAsId = action.payload;
        const effective = (action.payload && PERSONAS_BY_ID[action.payload]) || state.session.user;
        state.permissions = resolvePermissions(effective);
      });
  },
});

export default sessionSlice.reducer;

type WithSession = { session: SessionState };

export const selectSession = (state: WithSession) => state.session.session;
export const selectSignedInUser = (state: WithSession): User | null => state.session.session?.user ?? null;
export const selectViewAsId = (state: WithSession) => state.session.viewAsId;
export const selectCurrentUser = createSelector(
  [selectSignedInUser, selectViewAsId],
  (user, viewAsId): User | null => (user && viewAsId && PERSONAS_BY_ID[viewAsId]) || user,
);
export const selectPermissions = (state: WithSession) => state.session.permissions;
export const selectHasPermission = (permission: Permission) => (state: WithSession) =>
  state.session.permissions.includes(permission);
export const selectIsAuthenticated = (state: WithSession) => state.session.status === 'authenticated' && !!state.session.session;
