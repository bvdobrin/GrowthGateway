import { useState } from 'react';
import { LayoutGrid, List, SearchX, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AssetCard } from '@/components/AssetCard/AssetCard';
import { AssetTable } from '@/components/AssetTable/AssetTable';
import { Button } from '@/components/Button/Button';
import { Dialog } from '@/components/Dialog/Dialog';
import { EmptyState, PageHeader, Spinner } from '@/components/PageHeader/PageHeader';
import { useDocumentTitle, useToast } from '@/hooks/useAppHelpers';
import { useFiltersUrlSync } from '@/hooks/useFiltersUrlSync';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import { activeFilterCount, FACET_KEYS, type SortKey } from '@/lib/search';
import { SOURCES_BY_ID } from '@/mocks/sources';
import { useListAssetsQuery, useDeleteAssetsMutation } from '@/store/damApi';
import { clearFilters, selectFilters, setQuery, setSort, setView, toggleFacetValue } from '@/store/filtersSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectLibraryResults } from '@/store/selectors';
import { FilterPanel } from './FilterPanel';
import styles from './LibraryPage.module.css';

const PAGE_SIZE = 48;

export function LibraryPage() {
  const { t } = useTranslation(['library', 'common']);
  const dispatch = useAppDispatch();
  useFiltersUrlSync();
  const { isLoading, isError, refetch } = useListAssetsQuery();
  const filters = useAppSelector(selectFilters);
  const results = useAppSelector(selectLibraryResults);
  const { categoryLabel, formatLabel } = useTaxonomy();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [removeMany, { isLoading: deleting }] = useDeleteAssetsMutation();
  const toast = useToast();
  const active = activeFilterCount(filters);
  useDocumentTitle(t('title'));

  const toggleSelected = (id: string, selected: boolean) => {
    setSelectedIds((current) => (selected ? [...new Set([...current, id])] : current.filter((item) => item !== id)));
  };

  const runBulkDelete = async () => {
    try {
      const { deleted } = await removeMany(selectedIds).unwrap();
      toast.success(t('common:toast.deletedMany', { count: deleted.length }));
      setSelectedIds([]);
      setConfirmBulk(false);
    } catch (error) {
      toast.error(error);
    }
  };

  const chipLabel = (facet: (typeof FACET_KEYS)[number], value: string) => {
    switch (facet) {
      case 'categories':
        return categoryLabel(value);
      case 'formats':
        return formatLabel(value);
      case 'regions':
        return t(`common:region.${value}`);
      case 'statuses':
        return t(`common:status.${value}`);
      case 'classifications':
        return t(`common:classification.${value}`);
      case 'sources':
        return SOURCES_BY_ID[value]?.name ?? value;
      default:
        return value;
    }
  };

  return (
    <div className="l-page">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <div className={styles.toolbar}>
        <div className={styles.search} role="search">
          <label htmlFor="library-search" className="u-visually-hidden">
            {t('searchLabel')}
          </label>
          <input
            id="library-search"
            type="search"
            placeholder={t('searchPlaceholder')}
            value={filters.query}
            onChange={(e) => {
              dispatch(setQuery(e.target.value));
              setLimit(PAGE_SIZE);
            }}
            autoComplete="off"
          />
        </div>
        <div className={styles.controls}>
          <Button className="u-hide-from-lg" icon={<SlidersHorizontal />} onClick={() => setSheetOpen(true)}>
            {t('filters.open')}
            {active > 0 && <span className={styles.badge}>{active}</span>}
          </Button>
          <label className={styles.sort}>
            <span className="u-visually-hidden">{t('sort.label')}</span>
            <select value={filters.sort} onChange={(e) => dispatch(setSort(e.target.value as SortKey))}>
              {(['relevance', 'newest', 'oldest', 'title'] as const).map((key) => (
                <option key={key} value={key}>
                  {t(`sort.${key}`)}
                </option>
              ))}
            </select>
          </label>
          <div className={styles.viewToggle} role="group" aria-label={t('view.label')}>
            <Button variant="ghost" iconOnly icon={<LayoutGrid />} aria-pressed={filters.view === 'grid'} onClick={() => dispatch(setView('grid'))}>
              {t('view.grid')}
            </Button>
            <Button variant="ghost" iconOnly icon={<List />} aria-pressed={filters.view === 'list'} onClick={() => dispatch(setView('list'))}>
              {t('view.list')}
            </Button>
          </div>
        </div>
      </div>

      <div className={styles.layout}>
        <aside className={`${styles.sidebar} u-hide-below-lg`} aria-label={t('filters.title')}>
          <div className={styles.sidebarHead}>
            <h2 className={styles.sidebarTitle}>{t('filters.title')}</h2>
            {active > 0 && (
              <button type="button" className={styles.clear} onClick={() => dispatch(clearFilters())}>
                {t('filters.clear')}
              </button>
            )}
          </div>
          <FilterPanel />
        </aside>

        <section className={styles.results} aria-labelledby="results-count">
          <div className={styles.resultsHead}>
            <p id="results-count" className={styles.count} aria-live="polite">
              {t('results', { count: results.length })}
            </p>
            {active > 0 && (
              <ul role="list" className={styles.chips} aria-label={t('filters.active', { count: active })}>
                {FACET_KEYS.flatMap((facet) =>
                  filters[facet].map((value) => (
                    <li key={`${facet}-${value}`}>
                      <button type="button" className={styles.chip} onClick={() => dispatch(toggleFacetValue({ facet, value }))}>
                        {chipLabel(facet, value)}
                        <X aria-hidden="true" />
                        <span className="u-visually-hidden">{t('common:actions.remove')}</span>
                      </button>
                    </li>
                  )),
                )}
                <li>
                  <button type="button" className={styles.clear} onClick={() => dispatch(clearFilters())}>
                    {t('filters.clear')}
                  </button>
                </li>
              </ul>
            )}
          </div>

          {isLoading ? (
            <Spinner label={t('common:actions.loading')} />
          ) : isError ? (
            <EmptyState
              title={t('common:errors.generic')}
              action={<Button onClick={() => refetch()}>{t('common:actions.retry')}</Button>}
            />
          ) : results.length === 0 ? (
            <EmptyState icon={<SearchX />} title={t('empty.title')} body={t('empty.body')} />
          ) : filters.view === 'list' ? (
            <AssetTable assets={results.slice(0, limit)} />
          ) : (
            <>
              {selectedIds.length > 0 && (
                <div className={styles.selection} role="status">
                  <span>{t('selection.count', { count: selectedIds.length })}</span>
                  <Button onClick={() => setSelectedIds([])}>{t('selection.clear')}</Button>
                  <Button variant="danger" icon={<Trash2 />} onClick={() => setConfirmBulk(true)}>
                    {t('selection.delete')}
                  </Button>
                </div>
              )}
              <div className="l-auto-grid">
                {results.slice(0, limit).map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    selected={selectedIds.includes(asset.id)}
                    onSelectedChange={(selected) => toggleSelected(asset.id, selected)}
                  />
                ))}
              </div>
            </>
          )}
          {results.length > limit && (
            <div className={styles.loadMore}>
              <Button onClick={() => setLimit((l) => l + PAGE_SIZE)}>{t('filters.showMore', { count: Math.min(PAGE_SIZE, results.length - limit) })}</Button>
            </div>
          )}
        </section>
      </div>

      <Dialog
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t('filters.title')}
        variant="sheetEnd"
        footer={
          <>
            {active > 0 && <Button onClick={() => dispatch(clearFilters())}>{t('filters.clear')}</Button>}
            <Button variant="primary" onClick={() => setSheetOpen(false)}>
              {t('filters.showResults', { count: results.length })}
            </Button>
          </>
        }
      >
        <FilterPanel />
      </Dialog>
      <Dialog
        open={confirmBulk}
        onClose={() => {
          if (!deleting) setConfirmBulk(false);
        }}
        title={t('selection.confirmTitle')}
        footer={
          <>
            <Button onClick={() => setConfirmBulk(false)} disabled={deleting}>
              {t('common:actions.cancel')}
            </Button>
            <Button variant="danger" icon={<Trash2 />} onClick={runBulkDelete} loading={deleting}>
              {t('selection.confirm')}
            </Button>
          </>
        }
      >
        <p>{t('selection.confirmBody', { count: selectedIds.length })}</p>
      </Dialog>
    </div>
  );
}
