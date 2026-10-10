import { FORMAT_IDS } from '@/config/taxonomy/formats';
import { slugify } from '@/lib/ids';
import type { CategoryDefinition, CategoryGroup, Classification, MetadataField, User } from '@/types';
import { CATEGORY_GROUPS, CLASSIFICATIONS } from '@/types';
import { logEvent } from './auditService';
import { ServiceError } from './errors';
import { hasPermission } from './iamService';
import { delay } from './latency';
import { allCategories, getDb, saveDb } from './mockDb';

export async function listCategories(): Promise<CategoryDefinition[]> {
  await delay(40, 80);
  return allCategories(await getDb());
}

export interface NewCategoryInput {
  label: string;
  group: CategoryGroup;
  icon: string;
  allowedFormats: CategoryDefinition['allowedFormats'];
  metadataSchema: MetadataField[];
  defaultClassification?: Classification;
  authorable?: boolean;
}

export async function createCategory(user: User, input: NewCategoryInput): Promise<CategoryDefinition> {
  await delay();
  if (!hasPermission(user, 'admin:taxonomy')) throw new ServiceError('forbidden', 'Creating categories requires admin:taxonomy');
  const label = input.label.trim();
  if (label.length < 3) throw new ServiceError('invalid', 'Label must be at least 3 characters');
  if (!CATEGORY_GROUPS.includes(input.group)) throw new ServiceError('invalid', 'Unknown group');
  if (input.allowedFormats.length === 0 || input.allowedFormats.some((f) => !FORMAT_IDS.includes(f))) {
    throw new ServiceError('invalid', 'Pick at least one valid format');
  }
  if (input.defaultClassification && !CLASSIFICATIONS.includes(input.defaultClassification)) {
    throw new ServiceError('invalid', 'Unknown classification');
  }

  const db = await getDb();
  const existing = new Set(allCategories(db).map((c) => c.id));
  let id = slugify(label);
  for (let n = 2; existing.has(id); n += 1) id = `${slugify(label)}-${n}`;

  const keys = new Set<string>();
  const metadataSchema = input.metadataSchema
    .filter((f) => f.label.trim())
    .map((field) => {
      let key = field.key || slugify(field.label).replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
      while (keys.has(key)) key = `${key}2`;
      keys.add(key);
      return { ...field, key, label: field.label.trim() };
    });

  const category: CategoryDefinition = {
    id,
    label,
    group: input.group,
    icon: input.icon || 'Folder',
    colorToken: input.group === 'Custom' ? 'color-group-custom' : `color-group-${input.group.toLowerCase()}`,
    allowedFormats: input.allowedFormats,
    metadataSchema,
    validationRuleIds: [],
    generatorIds: [],
    defaultClassification: input.defaultClassification,
    authorable: input.authorable && input.allowedFormats.some((f) => f === 'text' || f === 'html'),
    custom: true,
    createdBy: user.id,
  };
  db.customCategories.push(category);
  await saveDb();
  await logEvent(user, 'taxonomy.create', undefined, `Created category "${label}" (${id})`);
  return category;
}
