import { SOURCES, SOURCES_BY_ID, REMOTE_ITEMS } from '@/mocks/sources';
import type { Asset, AssetFile, RemoteItem, SourceSystem, User } from '@/types';
import { ServiceError } from './errors';
import { hasPermission } from './iamService';
import { delay } from './latency';
import { getDb } from './mockDb';

/**
 * Mock connectors for the legacy systems. A real implementation would call the
 * SharePoint, Box, Dropbox, Brandfolder and Google Drive APIs server-side.
 */
export async function listSources(): Promise<SourceSystem[]> {
  await delay(40, 60);
  return SOURCES;
}

export async function listRemoteItems(user: User, sourceId: string): Promise<RemoteItem[]> {
  await delay(250, 300);
  if (!hasPermission(user, 'asset:upload')) throw new ServiceError('forbidden', 'Linking assets requires asset:upload');
  if (!SOURCES_BY_ID[sourceId] || SOURCES_BY_ID[sourceId].native) throw new ServiceError('not_found', 'Unknown source');
  const db = await getDb();
  const linkedPaths = new Set(db.assets.map((a) => a.sourcePath).filter(Boolean));
  return REMOTE_ITEMS.filter((item) => item.sourceId === sourceId && !linkedPaths.has(item.path));
}

/** Pulls the original out of the legacy system. The mock returns a placeholder body. */
export async function fetchOriginal(asset: Asset, file: AssetFile): Promise<Blob> {
  await delay(300, 400);
  const source = SOURCES_BY_ID[asset.sourceSystem];
  return new Blob(
    [`Placeholder for "${file.name}" fetched from ${source?.name ?? asset.sourceSystem}.\nPath: ${asset.sourcePath ?? 'n/a'}\n`],
    { type: 'text/plain' },
  );
}
