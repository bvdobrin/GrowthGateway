import { EMPTY_FILTERS } from '@/lib/search';
import { clearStorage } from '@/lib/storage';
import { __resetDbForTests } from '@/services/mockDb';
import { damApi } from './damApi';
import filtersReducer, { clearFilters, setQuery, toggleFacetValue } from './filtersSlice';
import { makeStore } from './index';
import { login, viewAs } from './sessionSlice';
import { selectAssets } from './selectors';

describe('filtersSlice', () => {
  it('toggles a facet and keeps the query when filters are cleared', () => {
    let state = filtersReducer(EMPTY_FILTERS, toggleFacetValue({ facet: 'regions', value: 'NA' }));
    expect(state.regions).toEqual(['NA']);
    state = filtersReducer(state, toggleFacetValue({ facet: 'regions', value: 'EMEA' }));
    state = filtersReducer(state, toggleFacetValue({ facet: 'regions', value: 'NA' }));
    expect(state.regions).toEqual(['EMEA']);
    state = filtersReducer(state, setQuery('hydrogen'));
    state = filtersReducer(state, clearFilters());
    expect(state.query).toBe('hydrogen');
    expect(state.regions).toEqual([]);
    expect(state.view).toBe('grid');
  });
});

describe('session and cache', () => {
  beforeEach(async () => {
    __resetDbForTests();
    await clearStorage();
  });

  it('signs in, rejects an unknown persona, and applies view-as permissions', async () => {
    const store = makeStore();
    await store.dispatch(login('u-amelia'));
    expect(store.getState().session.status).toBe('authenticated');
    expect(store.getState().session.permissions).toContain('admin:taxonomy');
    expect(store.getState().session.permissions).toContain('asset:approve');

    const rejected = await store.dispatch(login('nobody'));
    expect(rejected.meta.requestStatus).toBe('rejected');
    expect(store.getState().session.status).toBe('authenticated');
    expect(store.getState().session.session?.user.id).toBe('u-amelia');

    await store.dispatch(viewAs('u-jordan'));
    expect(store.getState().session.viewAsId).toBe('u-jordan');
    expect(store.getState().session.permissions).not.toContain('asset:approve');
    expect(store.getState().session.permissions).toContain('asset:upload');

    await store.dispatch(viewAs(null));
    expect(store.getState().session.viewAsId).toBeNull();
    expect(store.getState().session.permissions).toContain('admin:audit');
  });

  it('drops the asset cache when the persona changes', async () => {
    const store = makeStore();
    await store.dispatch(login('u-amelia'));
    const before = await store.dispatch(damApi.endpoints.listAssets.initiate(undefined, { subscribe: false })).unwrap();
    expect(before.some((asset) => asset.id === 'ast-002')).toBe(true);

    await store.dispatch(viewAs('u-jordan'));
    const after = await store.dispatch(damApi.endpoints.listAssets.initiate(undefined, { subscribe: false })).unwrap();

    expect(after.length).toBeLessThan(before.length);
    expect(after.some((asset) => asset.id === 'ast-002')).toBe(false);
    expect(after.every((asset) => asset.classification === 'public')).toBe(true);
    expect(selectAssets(store.getState()).every((asset) => asset.classification === 'public')).toBe(true);
  });
});
