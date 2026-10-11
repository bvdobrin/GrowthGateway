import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { gleanClient } from '@/services/glean';
import type { GleanChatResponse } from '@/services/glean';
import type { ChatMessage } from '@/types';
import type { SessionState } from './sessionSlice';
import { selectCurrentUser } from './sessionSlice';
import type { UiState } from './uiSlice';

export interface ChatState {
  open: boolean;
  messages: ChatMessage[];
  pending: boolean;
}

const initialState: ChatState = { open: false, messages: [], pending: false };

type ChatRoot = { chat: ChatState; session: SessionState; ui: UiState };

export const askAssistant = createAsyncThunk<GleanChatResponse, string, { state: ChatRoot }>(
  'chat/ask',
  async (text, { getState, requestId, signal }) => {
    const state = getState();
    const user = selectCurrentUser(state);
    if (!user) throw new Error('Not signed in');
    const question: ChatMessage = { id: requestId, role: 'user', content: text, createdAt: new Date().toISOString() };
    return gleanClient.chat({
      messages: [...state.chat.messages, question],
      user,
      locale: state.ui.locale,
      accessToken: state.session.session?.accessToken,
      signal,
    });
  },
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    openChat(state) {
      state.open = true;
    },
    closeChat(state) {
      state.open = false;
    },
    toggleChat(state) {
      state.open = !state.open;
    },
    clearChat(state) {
      state.messages = [];
      state.pending = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(askAssistant.pending, (state, action) => {
        state.pending = true;
        state.messages.push({ id: action.meta.requestId, role: 'user', content: action.meta.arg, createdAt: new Date().toISOString() });
      })
      .addCase(askAssistant.fulfilled, (state, action) => {
        state.pending = false;
        state.messages.push({
          id: `${action.meta.requestId}-a`,
          role: 'assistant',
          content: action.payload.answer,
          citations: action.payload.citations,
          createdAt: new Date().toISOString(),
        });
      })
      .addCase(askAssistant.rejected, (state, action) => {
        state.pending = false;
        if (action.meta.aborted) return;
        state.messages.push({
          id: `${action.meta.requestId}-a`,
          role: 'assistant',
          content: action.error.message ?? 'The assistant is unavailable.',
          createdAt: new Date().toISOString(),
          error: true,
        });
      });
  },
});

export const { openChat, closeChat, toggleChat, clearChat } = chatSlice.actions;
export default chatSlice.reducer;

export const selectChat = (state: { chat: ChatState }) => state.chat;
