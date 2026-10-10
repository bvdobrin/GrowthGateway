import Fuse from 'fuse.js';
import type { Asset, CategoryDefinition, MetadataValue } from '@/types';

export type FacetKey =
  | 'categories'
  | 'formats'
  | 'regions'
  | 'locales'
  | 'campaigns'
  | 'sources'
  | 'statuses'
  | 'classifications'
  | 'businessUnits';

export const FACET_KEYS: FacetKey[] = [
  'categories',
  'formats',
  'regions',
  'locales',
  'campaigns',
  'sources',
  'statuses',
  'classifications',
  'businessUnits',
];

export type SortKey = 'relevance' | 'newest' | 'oldest' | 'title';

export interface LibraryFilters extends Record<FacetKey, string[]> {
  query: string;
  dateFrom: string;
  dateTo: string;
  /** Dynamic facets from category metadata, keyed by field key. */
  metadata: Record<string, string[]>;
  sort: SortKey;
  view: 'grid' | 'list';
}

export const EMPTY_FILTERS: LibraryFilters = {
  query: '',
  categories: [],
  formats: [],
  regions: [],
  locales: [],
  campaigns: [],
  sources: [],
  statuses: [],
  classifications: [],
  businessUnits: [],
  dateFrom: '',
  dateTo: '',
  metadata: {},
  sort: 'relevance',
  view: 'grid',
};

export const facetValue = (asset: Asset, facet: FacetKey): string | undefined => {
  switch (facet) {
    case 'categories':
      return asset.category;
    case 'formats':
      return asset.format;
    case 'regions':
      return asset.region;
    case 'locales':
      return asset.locale;
    case 'campaigns':
      return asset.campaign;
    case 'sources':
      return asset.sourceSystem;
    case 'statuses':
      return asset.status;
    case 'classifications':
      return asset.classification;
    case 'businessUnits':
      return asset.businessUnit;
  }
};

const metaToStrings = (value: MetadataValue | undefined): string[] => {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) return value;
  return [String(value)];
};

const searchableText = (asset: Asset) =>
  asset.files
    .map((f) => (f.mime === 'image/svg+xml' ? '' : (f.text ?? '')))
    .join(' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 6000);

export interface SearchDoc {
  asset: Asset;
  title: string;
  description: string;
  tags: string;
  metadata: string;
  text: string;
}

export const buildFuse = (assets: Asset[]) =>
  new Fuse<SearchDoc>(
    assets.map((asset) => ({
      asset,
      title: asset.title,
      description: asset.description,
      tags: asset.tags.join(' '),
      metadata: Object.values(asset.categoryMetadata).flatMap(metaToStrings).join(' '),
      text: searchableText(asset),
    })),
    {
      keys: [
        { name: 'title', weight: 3 },
        { name: 'tags', weight: 2 },
        { name: 'description', weight: 1.5 },
        { name: 'metadata', weight: 1 },
        { name: 'text', weight: 0.8 },
      ],
      threshold: 0.35,
      ignoreLocation: true,
      includeScore: true,
      minMatchCharLength: 2,
    },
  );

export interface SearchMatch {
  asset: Asset;
  score: number;
}

export function searchAssets(fuse: Fuse<SearchDoc>, assets: Asset[], query: string): SearchMatch[] {
  const q = query.trim();
  if (!q) return assets.map((asset) => ({ asset, score: 0 }));
  return fuse.search(q).map((r) => ({ asset: r.item.asset, score: r.score ?? 0 }));
}

/** Metadata facets only apply while their category is selected. */
export function activeMetadataFacets(filters: LibraryFilters, categories: CategoryDefinition[]) {
  const selected = categories.filter((c) => filters.categories.includes(c.id));
  const fields = selected.flatMap((c) => c.metadataSchema.filter((f) => f.facet).map((f) => ({ category: c, field: f })));
  const seen = new Set<string>();
  return fields.filter(({ field }) => (seen.has(field.key) ? false : (seen.add(field.key), true)));
}

export function matchesFilters(asset: Asset, filters: LibraryFilters, categories: CategoryDefinition[], skip?: FacetKey) {
  for (const facet of FACET_KEYS) {
    if (facet === skip) continue;
    const selected = filters[facet];
    if (selected.length && !selected.includes(facetValue(asset, facet) ?? '')) return false;
  }
  const day = asset.createdAt.slice(0, 10);
  if (filters.dateFrom && day < filters.dateFrom) return false;
  if (filters.dateTo && day > filters.dateTo) return false;
  const activeKeys = new Set(activeMetadataFacets(filters, categories).map(({ field }) => field.key));
  for (const [key, values] of Object.entries(filters.metadata)) {
    if (!values.length || !activeKeys.has(key)) continue;
    const assetValues = metaToStrings(asset.categoryMetadata[key]);
    if (!values.some((v) => assetValues.includes(v))) return false;
  }
  return true;
}

export function applyFilters(matches: SearchMatch[], filters: LibraryFilters, categories: CategoryDefinition[]): Asset[] {
  const filtered = matches.filter((m) => matchesFilters(m.asset, filters, categories));
  const sort = filters.sort === 'relevance' && !filters.query.trim() ? 'newest' : filters.sort;
  const sorted = [...filtered];
  if (sort === 'newest') sorted.sort((a, b) => b.asset.createdAt.localeCompare(a.asset.createdAt));
  if (sort === 'oldest') sorted.sort((a, b) => a.asset.createdAt.localeCompare(b.asset.createdAt));
  if (sort === 'title') sorted.sort((a, b) => a.asset.title.localeCompare(b.asset.title));
  if (sort === 'relevance') sorted.sort((a, b) => a.score - b.score);
  return sorted.map((m) => m.asset);
}

/** Counts per facet value, computed with every other filter applied (classic faceting). */
export function facetCounts(matches: SearchMatch[], filters: LibraryFilters, categories: CategoryDefinition[]) {
  const counts = {} as Record<FacetKey, Record<string, number>>;
  for (const facet of FACET_KEYS) {
    counts[facet] = {};
    for (const { asset } of matches) {
      if (!matchesFilters(asset, filters, categories, facet)) continue;
      const value = facetValue(asset, facet);
      if (value) counts[facet][value] = (counts[facet][value] ?? 0) + 1;
    }
  }
  const metadata: Record<string, Record<string, number>> = {};
  for (const { field } of activeMetadataFacets(filters, categories)) {
    metadata[field.key] = {};
    const others = { ...filters, metadata: { ...filters.metadata, [field.key]: [] } };
    for (const { asset } of matches) {
      if (!matchesFilters(asset, others, categories)) continue;
      for (const v of metaToStrings(asset.categoryMetadata[field.key])) {
        metadata[field.key][v] = (metadata[field.key][v] ?? 0) + 1;
      }
    }
  }
  return { ...counts, metadata };
}

// URL sync

const LIST_PARAMS: Record<FacetKey, string> = {
  categories: 'category',
  formats: 'format',
  regions: 'region',
  locales: 'locale',
  campaigns: 'campaign',
  sources: 'source',
  statuses: 'status',
  classifications: 'classification',
  businessUnits: 'bu',
};

export function filtersToParams(filters: LibraryFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query) params.set('q', filters.query);
  for (const facet of FACET_KEYS) filters[facet].forEach((v) => params.append(LIST_PARAMS[facet], v));
  for (const [key, values] of Object.entries(filters.metadata)) values.forEach((v) => params.append(`m.${key}`, v));
  if (filters.dateFrom) params.set('from', filters.dateFrom);
  if (filters.dateTo) params.set('to', filters.dateTo);
  if (filters.sort !== 'relevance') params.set('sort', filters.sort);
  if (filters.view !== 'grid') params.set('view', filters.view);
  return params;
}

export function paramsToFilters(params: URLSearchParams): LibraryFilters {
  const filters: LibraryFilters = { ...EMPTY_FILTERS, metadata: {} };
  filters.query = params.get('q') ?? '';
  for (const facet of FACET_KEYS) filters[facet] = params.getAll(LIST_PARAMS[facet]);
  params.forEach((value, key) => {
    if (key.startsWith('m.')) {
      const field = key.slice(2);
      filters.metadata[field] = [...(filters.metadata[field] ?? []), value];
    }
  });
  filters.dateFrom = params.get('from') ?? '';
  filters.dateTo = params.get('to') ?? '';
  const sort = params.get('sort');
  filters.sort = sort === 'newest' || sort === 'oldest' || sort === 'title' ? sort : 'relevance';
  filters.view = params.get('view') === 'list' ? 'list' : 'grid';
  return filters;
}

export const activeFilterCount = (filters: LibraryFilters) =>
  FACET_KEYS.reduce((n, f) => n + filters[f].length, 0) +
  Object.values(filters.metadata).reduce((n, v) => n + v.length, 0) +
  (filters.dateFrom ? 1 : 0) +
  (filters.dateTo ? 1 : 0);
