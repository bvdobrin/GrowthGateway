import type { Asset, AssetFile, MetadataValue } from '@/types';

export const meta = (asset: Asset, key: string): MetadataValue | undefined => asset.categoryMetadata[key];

export const isBlank = (value: MetadataValue | undefined) =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0);

export const metaString = (asset: Asset, key: string) => {
  const value = meta(asset, key);
  return typeof value === 'string' ? value.trim() : '';
};

export const primaryFile = (asset: Asset): AssetFile | undefined =>
  asset.files.find((f) => f.role === 'primary') ?? asset.files[0];

/** All inline text on the asset (copy, transcripts, minutes). */
export const assetText = (asset: Asset) =>
  asset.files
    .map((f) => f.text ?? '')
    .filter(Boolean)
    .join('\n');

export const parseDate = (value: MetadataValue | undefined) => {
  if (typeof value !== 'string' || !value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export const isoDay = (date: Date) => date.toISOString().slice(0, 10);

export const DAY_MS = 86_400_000;
