import { createSelector } from '@reduxjs/toolkit';
import { SEEDED_CATEGORIES } from '@/config/taxonomy/categories';
import { applyFilters, buildFuse, facetCounts, searchAssets } from '@/lib/search';
import type { Asset, CategoryDefinition } from '@/types';
import { damApi } from './damApi';
import { selectFilters } from './filtersSlice';
import type { RootState } from './index';

const EMPTY: Asset[] = [];

const selectAssetsResult = damApi.endpoints.listAssets.select(undefined);
const selectCategoriesResult = damApi.endpoints.listCategories.select(undefined);

export const selectAssets = createSelector([(state: RootState) => selectAssetsResult(state)], (result) => result.data ?? EMPTY);

export const selectCategories = createSelector(
  [(state: RootState) => selectCategoriesResult(state)],
  (result): CategoryDefinition[] => result.data ?? SEEDED_CATEGORIES,
);

export const selectCategoryMap = createSelector([selectCategories], (categories) =>
  Object.fromEntries(categories.map((c) => [c.id, c])) as Record<string, CategoryDefinition>,
);

/** The Fuse index is rebuilt only when the visible asset list changes. */
const selectFuse = createSelector([selectAssets], (assets) => buildFuse(assets));

const selectQueryMatches = createSelector(
  [selectFuse, selectAssets, (state: RootState) => state.filters.query],
  (fuse, assets, query) => searchAssets(fuse, assets, query),
);

export const selectLibraryResults = createSelector(
  [selectQueryMatches, selectFilters, selectCategories],
  (matches, filters, categories) => applyFilters(matches, filters, categories),
);

export const selectFacetCounts = createSelector(
  [selectQueryMatches, selectFilters, selectCategories],
  (matches, filters, categories) => facetCounts(matches, filters, categories),
);

/** Distinct values present in the visible library, for building facet option lists. */
export const selectFacetOptions = createSelector([selectAssets], (assets) => ({
  locales: [...new Set(assets.map((a) => a.locale))].sort(),
  campaigns: [...new Set(assets.map((a) => a.campaign).filter((c): c is string => !!c))].sort(),
  businessUnits: [...new Set(assets.map((a) => a.businessUnit))].sort(),
}));
