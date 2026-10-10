import { GENERATORS_BY_ID, generatorsFor } from '@/config/taxonomy/generators';
import { canGenerate, canView } from '@/lib/accessPolicy';
import { uid } from '@/lib/ids';
import { runValidation } from '@/lib/validation/registry';
import { NATIVE_SOURCE } from '@/mocks/sources';
import type { Asset, User } from '@/types';
import { insertAsset } from './assetService';
import { logEvent } from './auditService';
import { ServiceError } from './errors';
import { delay } from './latency';
import { categoryById, getDb, withEffectiveStatus } from './mockDb';

export interface GenerateInput {
  assetId: string;
  generatorId: string;
  params?: Record<string, string>;
}

/** Runs a mocked AI generator and stores the result as a draft variant of the source asset. */
export async function generateVariant(user: User, { assetId, generatorId, params = {} }: GenerateInput): Promise<Asset> {
  await delay(700, 700);
  const db = await getDb();
  const stored = db.assets.find((a) => a.id === assetId);
  const parent = stored && withEffectiveStatus(stored);
  if (!parent || !canView(user, parent)) throw new ServiceError('not_found', 'Asset not found');
  if (!canGenerate(user, parent)) throw new ServiceError('forbidden', 'You cannot generate from this asset');
  const category = categoryById(db, parent.category);
  if (!category) throw new ServiceError('invalid', 'Unknown category');
  const generator = GENERATORS_BY_ID[generatorId];
  if (!generator || !generatorsFor(parent, category).includes(generator)) {
    throw new ServiceError('invalid', `Generator "${generatorId}" does not apply to this asset`);
  }

  const output = generator.run(parent, category, params);
  const outputCategory = output.categoryId ? categoryById(db, output.categoryId) ?? category : category;
  const id = uid('ast');
  const timestamp = new Date().toISOString();
  const draft: Asset = {
    ...parent,
    id,
    title: output.title,
    description: output.description,
    category: outputCategory.id,
    format: output.format,
    files: output.files.map((file, i) => ({ ...file, id: `${id}-f${i + 1}` })),
    categoryMetadata: output.categoryId ? { ...output.categoryMetadata } : { ...parent.categoryMetadata, ...output.categoryMetadata },
    locale: output.locale ?? parent.locale,
    sourceSystem: NATIVE_SOURCE,
    migrationStatus: 'migrated',
    sourcePath: undefined,
    status: 'draft',
    ownerId: user.id,
    parentId: parent.id,
    generatorId,
    validation: undefined,
    approval: undefined,
    submittedAt: undefined,
    submittedBy: undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const asset = { ...draft, validation: runValidation(draft, outputCategory) };
  await insertAsset(asset);
  await logEvent(user, 'asset.generate', asset, `${generatorId} from ${parent.id}`);
  return asset;
}
