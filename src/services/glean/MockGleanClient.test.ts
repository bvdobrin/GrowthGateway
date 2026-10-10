import { PERSONAS } from '@/mocks/users';
import { canView, filterVisible } from '@/lib/accessPolicy';
import { getDb, __resetDbForTests } from '@/services/mockDb';
import { clearStorage } from '@/lib/storage';
import type { ChatMessage } from '@/types';
import { MockGleanClient, parseQuery } from './MockGleanClient';

const message = (content: string): ChatMessage => ({
  id: 'm1',
  role: 'user',
  content,
  createdAt: '2026-10-10T12:00:00.000Z',
});

describe('parseQuery', () => {
  it('reads category, region and recency from a question', async () => {
    const db = await getDb();
    const categories = (await import('@/config/taxonomy/categories')).SEEDED_CATEGORIES;
    const parsed = parseQuery('latest EMEA press releases about hydrogen', categories, 'en');
    expect(parsed.categoryIds).toContain('press-release');
    expect(parsed.regions).toEqual(['EMEA']);
    expect(parsed.recency).toBe(true);
    expect(parsed.keywords).toContain('hydrogen');
    expect(db.assets.length).toBeGreaterThan(0);
  });
});

describe('MockGleanClient', () => {
  const client = new MockGleanClient();

  beforeEach(async () => {
    __resetDbForTests();
    await clearStorage();
  });

  it('never cites an asset the asking user cannot access', async () => {
    const db = await getDb();
    const questions = [
      'latest EMEA press releases about hydrogen',
      'interview transcripts with the CEO',
      'APAC rail market outlook',
      'hydrogen programme board report',
      'show me the most recent assets',
    ];

    for (const persona of PERSONAS) {
      const visible = new Set(filterVisible(persona, db.assets).map((asset) => asset.id));
      for (const question of questions) {
        const response = await client.chat({ messages: [message(question)], user: persona, locale: 'en' });
        for (const citation of response.citations) {
          expect(visible.has(citation.id), `${persona.name} cited ${citation.title} for "${question}"`).toBe(true);
          expect(canView(persona, db.assets.find((asset) => asset.id === citation.id)!)).toBe(true);
        }
      }
    }
  });

  it('cites the restricted board report for an admin and withholds it from the agency', async () => {
    const admin = PERSONAS.find((persona) => persona.id === 'u-amelia')!;
    const agency = PERSONAS.find((persona) => persona.id === 'u-jordan')!;
    const question = 'hydrogen programme board report';

    const forAdmin = await client.chat({ messages: [message(question)], user: admin, locale: 'en' });
    const forAgency = await client.chat({ messages: [message(question)], user: agency, locale: 'en' });

    expect(forAdmin.citations.some((citation) => citation.id === 'ast-002')).toBe(true);
    expect(forAgency.citations.some((citation) => citation.id === 'ast-002')).toBe(false);
  });
});
