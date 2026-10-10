import type { AssetRef, ChatMessage, User } from '@/types';

export interface GleanChatRequest {
  messages: ChatMessage[];
  user: User;
  /** UI locale for the answer's template text. Asset content is never translated. */
  locale: string;
  accessToken?: string;
}

export interface GleanChatResponse {
  answer: string;
  citations: AssetRef[];
}

/**
 * The assistant contract. `MockGleanClient` answers in the browser; `ProxyGleanClient`
 * forwards to a server that holds the Glean MCP credentials.
 */
export interface GleanClient {
  readonly mode: 'mock' | 'proxy';
  chat(request: GleanChatRequest): Promise<GleanChatResponse>;
}
