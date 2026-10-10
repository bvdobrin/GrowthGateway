import { SEEDED_CATEGORIES } from '@/config/taxonomy/categories';
import { getItem, removeItem, setItem } from '@/lib/storage';
import { runValidation } from '@/lib/validation/registry';
import { createSeedAssets } from '@/mocks/assets';
import type { Asset, AuditEvent, CategoryDefinition } from '@/types';

/** Bump when the seed or schema changes so stale IndexedDB data is replaced. */
const DB_VERSION = 3;
const DB_KEY = 'growthgateway:db';

export interface DbState {
  version: number;
  assets: Asset[];
  customCategories: CategoryDefinition[];
  audit: AuditEvent[];
}

let state: DbState | null = null;
let loading: Promise<DbState> | null = null;

export const allCategories = (db: DbState) => [...SEEDED_CATEGORIES, ...db.customCategories];

export const categoryById = (db: DbState, id: string) => allCategories(db).find((c) => c.id === id);

/** Expired rights override any workflow status. */
export function withEffectiveStatus(asset: Asset, now = new Date()): Asset {
  if (asset.rightsExpiry && new Date(asset.rightsExpiry).getTime() < now.getTime() && asset.status !== 'expired') {
    return { ...asset, status: 'expired' };
  }
  return asset;
}

function seed(): DbState {
  const now = new Date();
  const assets = createSeedAssets().map((asset) => {
    const category = SEEDED_CATEGORIES.find((c) => c.id === asset.category)!;
    const effective = withEffectiveStatus(asset, now);
    return effective.status === 'pending_validation' ? effective : { ...effective, validation: runValidation(effective, category, { now }) };
  });
  return {
    version: DB_VERSION,
    assets,
    customCategories: [],
    audit: [
      {
        id: 'evt-seed-1',
        at: '2026-10-05T08:00:00.000Z',
        actorId: 'system',
        actorName: 'Migration service',
        action: 'asset.link',
        details: 'Initial catalogue sync from 6 legacy sources (90 assets).',
      },
    ],
  };
}

export async function getDb(): Promise<DbState> {
  if (state) return state;
  loading ??= (async () => {
    const stored = await getItem<DbState>(DB_KEY);
    state = stored && stored.version === DB_VERSION ? stored : seed();
    if (!stored || stored.version !== DB_VERSION) await setItem(DB_KEY, state);
    return state;
  })();
  return loading;
}

export async function saveDb(): Promise<void> {
  if (state) await setItem(DB_KEY, state);
}

export async function resetDb(): Promise<void> {
  await removeItem(DB_KEY);
  state = seed();
  loading = Promise.resolve(state);
  await setItem(DB_KEY, state);
}

/** Test helper: drop the in-memory copy so the next call reseeds. */
export function __resetDbForTests() {
  state = null;
  loading = null;
}
