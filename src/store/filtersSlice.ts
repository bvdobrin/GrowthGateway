import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { EMPTY_FILTERS, type FacetKey, type LibraryFilters, type SortKey } from '@/lib/search';

const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

const filtersSlice = createSlice({
  name: 'filters',
  initialState: EMPTY_FILTERS,
  reducers: {
    setQuery(state, action: PayloadAction<string>) {
      state.query = action.payload;
    },
    toggleFacetValue(state, action: PayloadAction<{ facet: FacetKey; value: string }>) {
      const { facet, value } = action.payload;
      state[facet] = toggle(state[facet], value);
    },
    setFacet(state, action: PayloadAction<{ facet: FacetKey; values: string[] }>) {
      state[action.payload.facet] = action.payload.values;
    },
    toggleMetadataValue(state, action: PayloadAction<{ key: string; value: string }>) {
      const { key, value } = action.payload;
      state.metadata[key] = toggle(state.metadata[key] ?? [], value);
    },
    setDateRange(state, action: PayloadAction<{ from?: string; to?: string }>) {
      if (action.payload.from !== undefined) state.dateFrom = action.payload.from;
      if (action.payload.to !== undefined) state.dateTo = action.payload.to;
    },
    setSort(state, action: PayloadAction<SortKey>) {
      state.sort = action.payload;
    },
    setView(state, action: PayloadAction<'grid' | 'list'>) {
      state.view = action.payload;
    },
    clearFilters(state) {
      return { ...EMPTY_FILTERS, metadata: {}, query: state.query, sort: state.sort, view: state.view };
    },
    hydrateFilters(_state, action: PayloadAction<LibraryFilters>) {
      return action.payload;
    },
  },
});

export const {
  setQuery,
  toggleFacetValue,
  setFacet,
  toggleMetadataValue,
  setDateRange,
  setSort,
  setView,
  clearFilters,
  hydrateFilters,
} = filtersSlice.actions;

export default filtersSlice.reducer;

export const selectFilters = (state: { filters: LibraryFilters }) => state.filters;
