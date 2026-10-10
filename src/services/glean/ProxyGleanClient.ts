import { canView } from '@/lib/accessPolicy';
import { ServiceError } from '../errors';
import { getDb } from '../mockDb';
import type { GleanChatRequest, GleanChatResponse, GleanClient } from './GleanClient';

/**
 * Forwards chat to a server-side proxy (for example `/api/glean/chat`) that calls
 * Glean MCP with the user's delegated identity. Citations are re-checked against
 * the local access policy as defence in depth.
 */
export class ProxyGleanClient implements GleanClient {
  readonly mode = 'proxy' as const;

  constructor(private readonly url: string) {}

  async chat({ messages, user, locale, accessToken }: GleanChatRequest): Promise<GleanChatResponse> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        locale,
        messages: messages.slice(-10).map(({ role, content }) => ({ role, content })),
      }),
    });
    if (!response.ok) throw new ServiceError('upstream', `Assistant proxy returned ${response.status}`);
    const body = (await response.json()) as GleanChatResponse;
    const db = await getDb();
    const citations = (body.citations ?? []).filter((ref) => {
      const asset = db.assets.find((a) => a.id === ref.id);
      return asset ? canView(user, asset) : false;
    });
    return { answer: body.answer, citations };
  }
}
