import { detectFormat, mimeForName } from '@/config/taxonomy/formats';
import {
  canApprove,
  canDownload,
  canEdit,
  canMigrate,
  canSubmit,
  canValidate,
  canView,
  filterVisible,
  hasClearance,
} from '@/lib/accessPolicy';
import { slugify, uid } from '@/lib/ids';
import { getBlob, type UploadFileInput } from '@/lib/storage';
import { svgArtwork } from '@/lib/svgThumbnail';
import { runValidation } from '@/lib/validation/registry';
import { createZip } from '@/lib/zip';
import { SOURCES, SOURCES_BY_ID, NATIVE_SOURCE } from '@/mocks/sources';
import type {
  Asset,
  AssetFile,
  AssetFormat,
  AssetStatus,
  CategoryDefinition,
  Classification,
  DashboardStats,
  MetadataValue,
  Region,
  User,
} from '@/types';
import { ASSET_STATUSES } from '@/types';
import { logEvent } from './auditService';
import { fetchOriginal } from './connectorService';
import { ServiceError } from './errors';
import { assignableGroups, canUploadCategory } from './iamService';
import { delay } from './latency';
import { categoryById, getDb, saveDb, withEffectiveStatus, type DbState } from './mockDb';

export interface CommonFields {
  region: Region;
  locale: string;
  businessUnit: string;
  campaign?: string;
  tags: string[];
  classification: Classification;
  accessGroups: string[];
  /** The system the asset is migrating from (or GrowthGateway for new content). */
  sourceSystem: string;
  rightsExpiry?: string;
}

interface BaseCreateInput {
  category: string;
  title?: string;
  description?: string;
  common: CommonFields;
  categoryMetadata: Record<string, MetadataValue>;
}

export interface UploadInput extends BaseCreateInput {
  files: UploadFileInput[];
  /** Keep all files together as one asset instead of one asset per file. */
  bundle: boolean;
}

export interface AuthorInput extends BaseCreateInput {
  title: string;
  body: string;
  bodyFormat: 'text' | 'html';
}

export interface LinkInput extends BaseCreateInput {
  sourceId: string;
  path: string;
  name: string;
  mime?: string;
  sizeBytes?: number;
}

export type UpdateInput = Partial<
  Pick<Asset, 'title' | 'description' | 'categoryMetadata' | 'region' | 'locale' | 'businessUnit' | 'campaign' | 'tags' | 'classification' | 'accessGroups' | 'rightsExpiry'>
>;

export interface FileContent {
  kind: 'text' | 'blob' | 'svg' | 'none';
  mime: string;
  text?: string;
  blob?: Blob;
}

const now = () => new Date();

const visibleAssets = (db: DbState, user: User) =>
  filterVisible(user, db.assets.map((a) => withEffectiveStatus(a))).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

function requireCategory(db: DbState, id: string): CategoryDefinition {
  const category = categoryById(db, id);
  if (!category) throw new ServiceError('invalid', `Unknown category "${id}"`);
  return category;
}

/** Hides existence: assets the user cannot see are reported as not found. */
async function requireVisible(db: DbState, user: User, id: string): Promise<Asset> {
  const stored = db.assets.find((a) => a.id === id);
  const asset = stored && withEffectiveStatus(stored);
  if (!asset) throw new ServiceError('not_found', 'Asset not found');
  if (!canView(user, asset)) {
    await logEvent(user, 'asset.access_denied', { id: asset.id, title: '(hidden)' });
    throw new ServiceError('not_found', 'Asset not found');
  }
  return asset;
}

function replace(db: DbState, asset: Asset) {
  const index = db.assets.findIndex((a) => a.id === asset.id);
  if (index >= 0) db.assets[index] = asset;
}

function checkCreate(user: User, category: CategoryDefinition, common: CommonFields) {
  if (!canUploadCategory(user, category)) {
    throw new ServiceError('forbidden', `You cannot create "${category.label}" assets`);
  }
  if (common.accessGroups.length === 0) throw new ServiceError('invalid', 'Choose at least one access group');
  const allowed = new Set(assignableGroups(user).map((g) => g.id));
  const outside = common.accessGroups.filter((g) => !allowed.has(g));
  if (outside.length) throw new ServiceError('forbidden', `You can only grant access to your own groups (${outside.join(', ')})`);
  if (!hasClearance(user, common.classification)) {
    throw new ServiceError('forbidden', 'Classification is above your clearance');
  }
}

function buildAsset(
  user: User,
  category: CategoryDefinition,
  input: BaseCreateInput,
  parts: { title: string; format: AssetFormat; files: Omit<AssetFile, 'id'>[]; migrationStatus: Asset['migrationStatus']; sourcePath?: string; sourceSystem?: string },
): Asset {
  const id = uid('ast');
  const timestamp = now().toISOString();
  const asset: Asset = {
    id,
    title: parts.title.trim(),
    description: input.description?.trim() ?? '',
    category: category.id,
    format: parts.format,
    files: parts.files.map((file, i) => ({ ...file, id: `${id}-f${i + 1}` })),
    categoryMetadata: { ...input.categoryMetadata },
    region: input.common.region,
    locale: input.common.locale,
    businessUnit: input.common.businessUnit,
    campaign: input.common.campaign?.trim() || undefined,
    tags: input.common.tags.map((tag) => tag.trim()).filter(Boolean),
    sourceSystem: parts.sourceSystem ?? input.common.sourceSystem ?? NATIVE_SOURCE,
    migrationStatus: parts.migrationStatus,
    sourcePath: parts.sourcePath,
    classification: input.common.classification,
    accessGroups: input.common.accessGroups,
    status: 'draft',
    rightsExpiry: input.common.rightsExpiry || undefined,
    ownerId: user.id,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  return { ...asset, validation: runValidation(asset, category, { now: now() }) };
}

const titleFromFile = (name: string) =>
  name
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());

const toFile = (input: UploadFileInput): Omit<AssetFile, 'id'> => {
  const { role, ...rest } = input;
  return { ...rest, role };
};

// Queries

export async function listAssets(user: User): Promise<Asset[]> {
  await delay();
  return visibleAssets(await getDb(), user);
}

export async function getAsset(user: User, id: string): Promise<Asset> {
  await delay(60, 120);
  const db = await getDb();
  const asset = await requireVisible(db, user, id);
  await logEvent(user, 'asset.view', asset);
  return asset;
}

export async function getDashboardStats(user: User): Promise<DashboardStats> {
  await delay();
  const assets = visibleAssets(await getDb(), user);
  const byStatus = Object.fromEntries(ASSET_STATUSES.map((s) => [s, 0])) as Record<AssetStatus, number>;
  const byCategory: Record<string, number> = {};
  for (const asset of assets) {
    byStatus[asset.status] += 1;
    byCategory[asset.category] = (byCategory[asset.category] ?? 0) + 1;
  }
  const horizon = Date.now() + 45 * 86_400_000;
  return {
    totalVisible: assets.length,
    bySource: SOURCES.map((source) => ({
      sourceId: source.id,
      linked: assets.filter((a) => a.sourceSystem === source.id && a.migrationStatus === 'linked').length,
      migrated: assets.filter((a) => a.sourceSystem === source.id && a.migrationStatus === 'migrated').length,
    })),
    byCategory,
    byStatus,
    pendingApprovalForMe: assets.filter((a) => canApprove(user, a)).length,
    expiringSoon: assets
      .filter((a) => a.rightsExpiry && a.status !== 'expired' && new Date(a.rightsExpiry).getTime() < horizon)
      .sort((a, b) => a.rightsExpiry!.localeCompare(b.rightsExpiry!))
      .map((a) => ({ id: a.id, title: a.title, rightsExpiry: a.rightsExpiry! })),
    migratedShare: assets.length ? assets.filter((a) => a.migrationStatus === 'migrated').length / assets.length : 0,
  };
}

// Creation

export async function uploadAssets(user: User, input: UploadInput): Promise<Asset[]> {
  await delay(300, 400);
  if (input.files.length === 0) throw new ServiceError('invalid', 'Add at least one file');
  const db = await getDb();
  const category = requireCategory(db, input.category);
  checkCreate(user, category, input.common);

  const groups: UploadFileInput[][] = input.bundle || input.files.length === 1 ? [input.files] : input.files.map((f) => [f]);
  const created = groups.map((files) => {
    const ordered = [...files].sort((a, b) => Number(b.role === 'primary') - Number(a.role === 'primary'));
    if (!ordered.some((f) => f.role === 'primary')) ordered[0] = { ...ordered[0], role: 'primary' };
    const primary = ordered[0];
    const detected = detectFormat(primary.mime, primary.name);
    if (!detected) throw new ServiceError('invalid', `Unsupported file type: ${primary.name}`);
    const format: AssetFormat = ordered.length > 1 && category.allowedFormats.includes('bundle') ? 'bundle' : detected;
    const title = groups.length === 1 && input.title?.trim() ? input.title : titleFromFile(primary.name);
    return buildAsset(user, category, input, {
      title,
      format,
      files: ordered.map(toFile),
      migrationStatus: 'migrated',
    });
  });

  db.assets.push(...created);
  await saveDb();
  for (const asset of created) {
    await logEvent(user, 'asset.upload', asset, `${asset.files.length} file(s), ${category.id}`);
  }
  return created;
}

export async function authorAsset(user: User, input: AuthorInput): Promise<Asset> {
  await delay(200, 300);
  const db = await getDb();
  const category = requireCategory(db, input.category);
  if (!category.authorable) throw new ServiceError('invalid', `"${category.label}" cannot be authored in GrowthGateway`);
  checkCreate(user, category, input.common);
  if (!input.title.trim()) throw new ServiceError('invalid', 'Title is required');
  const ext = input.bodyFormat === 'html' ? 'html' : 'md';
  const mime = input.bodyFormat === 'html' ? 'text/html' : 'text/markdown';
  const asset = buildAsset(user, category, { ...input, common: { ...input.common, sourceSystem: NATIVE_SOURCE } }, {
    title: input.title,
    format: input.bodyFormat === 'html' ? 'html' : 'text',
    files: [{ role: 'primary', name: `${slugify(input.title)}.${ext}`, mime, sizeBytes: new Blob([input.body]).size, text: input.body }],
    migrationStatus: 'migrated',
    sourceSystem: NATIVE_SOURCE,
  });
  db.assets.push(asset);
  await saveDb();
  await logEvent(user, 'asset.author', asset);
  return asset;
}

export async function linkLegacyAsset(user: User, input: LinkInput): Promise<Asset> {
  await delay(300, 300);
  const db = await getDb();
  const category = requireCategory(db, input.category);
  const source = SOURCES_BY_ID[input.sourceId];
  if (!source || source.native) throw new ServiceError('invalid', 'Choose a legacy source');
  checkCreate(user, category, input.common);
  if (db.assets.some((a) => a.sourcePath === input.path)) throw new ServiceError('conflict', 'This item is already linked');
  const mime = input.mime ?? mimeForName(input.name);
  const format = detectFormat(mime, input.name);
  if (!format) throw new ServiceError('invalid', `Unsupported file type: ${input.name}`);
  const fileName = input.name.split(/[\\/]/).pop() ?? input.name;
  const asset = buildAsset(user, category, input, {
    title: input.title?.trim() || titleFromFile(fileName),
    format,
    files: [{ role: 'primary', name: fileName, mime, sizeBytes: input.sizeBytes ?? 0 }],
    migrationStatus: 'linked',
    sourcePath: input.path,
    sourceSystem: source.id,
  });
  db.assets.push(asset);
  await saveDb();
  await logEvent(user, 'asset.link', asset, source.name);
  return asset;
}

/** Inserts an asset produced elsewhere in the backend (generation). */
export async function insertAsset(asset: Asset) {
  const db = await getDb();
  db.assets.push(asset);
  await saveDb();
}

// Updates and workflow

export async function updateAsset(user: User, id: string, patch: UpdateInput): Promise<Asset> {
  await delay();
  const db = await getDb();
  const current = await requireVisible(db, user, id);
  if (!canEdit(user, current)) throw new ServiceError('forbidden', 'You cannot edit this asset');
  if (patch.accessGroups) {
    if (patch.accessGroups.length === 0) throw new ServiceError('invalid', 'Choose at least one access group');
    const allowed = new Set([...assignableGroups(user).map((g) => g.id), ...current.accessGroups]);
    if (patch.accessGroups.some((g) => !allowed.has(g))) throw new ServiceError('forbidden', 'You can only grant access to your own groups');
  }
  if (patch.classification && !hasClearance(user, patch.classification)) {
    throw new ServiceError('forbidden', 'Classification is above your clearance');
  }
  const category = requireCategory(db, current.category);
  const status: AssetStatus = current.status === 'approved' || current.status === 'pending_approval' ? 'draft' : current.status === 'pending_validation' ? 'draft' : current.status;
  const next: Asset = { ...current, ...patch, status, updatedAt: now().toISOString(), approval: status === 'draft' ? undefined : current.approval };
  const validated = withEffectiveStatus({ ...next, validation: runValidation(next, category, { now: now() }) });
  replace(db, validated);
  await saveDb();
  await logEvent(user, 'asset.update', validated);
  return validated;
}

async function removeAsset(db: DbState, user: User, id: string): Promise<Asset | undefined> {
  const stored = db.assets.find((asset) => asset.id === id);
  if (!stored) return undefined;
  const current = withEffectiveStatus(stored);
  if (!canView(user, current) || !canEdit(user, current)) return undefined;
  db.assets = db.assets.filter((asset) => asset.id !== id);
  await logEvent(user, 'asset.delete', current);
  return current;
}

export async function deleteAsset(user: User, id: string): Promise<{ id: string; title: string }> {
  await delay();
  const db = await getDb();
  const removed = await removeAsset(db, user, id);
  if (!removed) {
    const exists = db.assets.some((asset) => asset.id === id);
    throw new ServiceError(exists ? 'forbidden' : 'not_found', exists ? 'You cannot delete this asset' : 'Asset not found');
  }
  await saveDb();
  return { id: removed.id, title: removed.title };
}

export async function deleteAssets(user: User, ids: string[]): Promise<{ deleted: { id: string; title: string }[]; skipped: number }> {
  await delay();
  const db = await getDb();
  const deleted: { id: string; title: string }[] = [];
  for (const id of ids) {
    const removed = await removeAsset(db, user, id);
    if (removed) deleted.push({ id: removed.id, title: removed.title });
  }
  if (deleted.length === 0) throw new ServiceError('forbidden', 'You cannot delete these assets');
  await saveDb();
  return { deleted, skipped: ids.length - deleted.length };
}

export async function validateAsset(user: User, id: string): Promise<Asset> {
  await delay(200, 300);
  const db = await getDb();
  const current = await requireVisible(db, user, id);
  if (!canValidate(user, current)) throw new ServiceError('forbidden', 'You cannot validate this asset');
  const category = requireCategory(db, current.category);
  const validation = runValidation(current, category, { now: now() });
  const next: Asset = {
    ...current,
    validation,
    status: current.status === 'pending_validation' ? 'draft' : current.status,
    updatedAt: now().toISOString(),
  };
  replace(db, next);
  await saveDb();
  await logEvent(user, 'asset.validate', next, `Result: ${validation.overall}`);
  return next;
}

export async function submitForApproval(user: User, id: string): Promise<Asset> {
  await delay();
  const db = await getDb();
  const current = await requireVisible(db, user, id);
  if (!canSubmit(user, current)) {
    throw new ServiceError('invalid', 'Only validated drafts without failures can be submitted');
  }
  const next: Asset = {
    ...current,
    status: 'pending_approval',
    submittedAt: now().toISOString(),
    submittedBy: user.id,
    approval: undefined,
    updatedAt: now().toISOString(),
  };
  replace(db, next);
  await saveDb();
  await logEvent(user, 'asset.submit', next);
  return next;
}

export async function decideApproval(user: User, id: string, decision: 'approved' | 'rejected', comment?: string): Promise<Asset> {
  await delay();
  const db = await getDb();
  const current = await requireVisible(db, user, id);
  if (!canApprove(user, current)) throw new ServiceError('forbidden', 'You cannot approve this asset');
  if (decision === 'rejected' && !comment?.trim()) throw new ServiceError('invalid', 'Add a comment when rejecting');
  const timestamp = now().toISOString();
  const next: Asset = {
    ...current,
    status: decision,
    approval: { decision, by: user.id, byName: user.name, at: timestamp, comment: comment?.trim() || undefined },
    updatedAt: timestamp,
  };
  replace(db, next);
  await saveDb();
  await logEvent(user, decision === 'approved' ? 'asset.approve' : 'asset.reject', next, comment);
  return next;
}

/** Copies a linked asset's original out of the legacy system into GrowthGateway. */
export async function migrateAsset(user: User, id: string): Promise<Asset> {
  await delay(400, 500);
  const db = await getDb();
  const current = await requireVisible(db, user, id);
  if (!canMigrate(user, current)) throw new ServiceError('forbidden', 'You cannot migrate this asset');
  const category = requireCategory(db, current.category);
  const next: Asset = { ...current, migrationStatus: 'migrated', updatedAt: now().toISOString() };
  const validated = { ...next, validation: runValidation(next, category, { now: now() }) };
  replace(db, validated);
  await saveDb();
  await logEvent(user, 'asset.migrate', validated, SOURCES_BY_ID[current.sourceSystem]?.name);
  return validated;
}

// Content and download

async function resolveFile(asset: Asset, file: AssetFile, colorToken: string): Promise<{ name: string; blob: Blob }> {
  if (file.blobKey) {
    const blob = await getBlob(file.blobKey);
    if (blob) return { name: file.name, blob };
  }
  if (file.text !== undefined) return { name: file.name, blob: new Blob([file.text], { type: file.mime }) };
  if (file.mime.startsWith('image/')) {
    const scale = Math.min(1, 1600 / Math.max(file.width ?? 1600, file.height ?? 1000));
    const svg = svgArtwork({
      title: asset.title,
      subtitle: 'Preview (mock media)',
      format: asset.format === 'bundle' ? 'image' : asset.format,
      colorToken,
      width: Math.round((file.width ?? 1600) * scale),
      height: Math.round((file.height ?? 1000) * scale),
    });
    return { name: `${file.name.replace(/\.[^.]+$/, '')}.preview.svg`, blob: new Blob([svg], { type: 'image/svg+xml' }) };
  }
  if (asset.migrationStatus === 'linked') {
    return { name: `${file.name}.placeholder.txt`, blob: await fetchOriginal(asset, file) };
  }
  return {
    name: `${file.name}.placeholder.txt`,
    blob: new Blob([`Mock content for "${file.name}" (${file.mime}, ${file.sizeBytes} bytes).\n`], { type: 'text/plain' }),
  };
}

export async function getFileContent(user: User, assetId: string, fileId: string): Promise<FileContent> {
  const db = await getDb();
  const asset = await requireVisible(db, user, assetId);
  const file = asset.files.find((f) => f.id === fileId);
  if (!file) throw new ServiceError('not_found', 'File not found');
  if (file.text !== undefined) return { kind: file.mime === 'image/svg+xml' ? 'svg' : 'text', mime: file.mime, text: file.text };
  if (file.blobKey) {
    const blob = await getBlob(file.blobKey);
    if (blob) return { kind: 'blob', mime: file.mime, blob };
  }
  return { kind: 'none', mime: file.mime };
}

export async function downloadAsset(user: User, id: string, fileId?: string): Promise<{ fileName: string; blob: Blob }> {
  await delay(150, 250);
  const db = await getDb();
  const asset = await requireVisible(db, user, id);
  if (!canDownload(user, asset)) throw new ServiceError('forbidden', 'Download is not permitted for this asset');
  const category = requireCategory(db, asset.category);
  const files = fileId ? asset.files.filter((f) => f.id === fileId) : asset.files;
  if (files.length === 0) throw new ServiceError('not_found', 'File not found');

  let result: { fileName: string; blob: Blob };
  if (files.length === 1) {
    const { name, blob } = await resolveFile(asset, files[0], category.colorToken);
    result = { fileName: name, blob };
  } else {
    const resolved = await Promise.all(files.map((f) => resolveFile(asset, f, category.colorToken)));
    const entries = await Promise.all(
      resolved.map(async ({ name, blob }) => ({ name, data: new Uint8Array(await blob.arrayBuffer()) })),
    );
    result = { fileName: `${slugify(asset.title)}.zip`, blob: createZip(entries) };
  }
  await logEvent(user, 'asset.download', asset, result.fileName);
  return result;
}
