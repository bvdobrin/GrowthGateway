import type { GleanClient } from './GleanClient';
import { MockGleanClient } from './MockGleanClient';
import { ProxyGleanClient } from './ProxyGleanClient';

export type { GleanClient, GleanChatRequest, GleanChatResponse } from './GleanClient';

export const createGleanClient = (env: ImportMetaEnv = import.meta.env): GleanClient =>
  env.VITE_GLEAN_MODE === 'proxy' ? new ProxyGleanClient(env.VITE_GLEAN_PROXY_URL ?? '/api/glean/chat') : new MockGleanClient();

export const gleanClient = createGleanClient();
