import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/Field/Field';
import { useFormatters } from '@/hooks/useFormatters';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import { FORMAT_IDS } from '@/config/taxonomy/formats';
import { activeMetadataFacets, type FacetKey } from '@/lib/search';
import { SOURCES } from '@/mocks/sources';
import { selectFilters, setDateRange, toggleFacetValue, toggleMetadataValue } from '@/store/filtersSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectCategories, selectFacetCounts, selectFacetOptions } from '@/store/selectors';
import { ASSET_STATUSES, CATEGORY_GROUPS, CLASSIFICATIONS, REGIONS } from '@/types';
import styles from './LibraryPage.module.css';

const VISIBLE_OPTIONS = 6;

interface Option {
  value: string;
  label: string;
  count: number;
  checked: boolean;
}

function FacetGroup({
  title,
  options,
  onToggle,
  open = true,
  children,
}: {
  title: ReactNode;
  options: Option[];
  onToggle: (value: string) => void;
  open?: boolean;
  children?: ReactNode;
}) {
  const { t } = useTranslation('library');
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? options : options.slice(0, VISIBLE_OPTIONS);
  const selected = options.filter((o) => o.checked).length;
  if (!options.length && !children) return null;
  return (
    <details className={styles.facet} open={open || selected > 0}>
      <summary className={styles.facetSummary}>
        <span>{title}</span>
        {selected > 0 && <span className={styles.facetSelected}>{selected}</span>}
      </summary>
      <div className={styles.facetBody}>
        {children}
        {visible.map((option) => (
          <Checkbox
            key={option.value}
            checked={option.checked}
            disabled={!option.checked && option.count === 0}
            onChange={() => onToggle(option.value)}
            label={
              <span className={styles.option}>
                <span className={styles.optionLabel}>{option.label}</span>
                <span className={styles.optionCount}>{option.count}</span>
              </span>
            }
          />
        ))}
        {options.length > VISIBLE_OPTIONS && (
          <button type="button" className={styles.more} onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
            {expanded ? t('filters.showLess') : t('filters.showMore', { count: options.length - VISIBLE_OPTIONS })}
          </button>
        )}
      </div>
    </details>
  );
}

export function FilterPanel() {
  const { t } = useTranslation(['library', 'common']);
  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectFilters);
  const counts = useAppSelector(selectFacetCounts);
  const options = useAppSelector(selectFacetOptions);
  const categories = useAppSelector(selectCategories);
  const { categoryLabel, groupLabel, formatLabel, fieldLabel, optionLabel } = useTaxonomy();
  const { locale } = useFormatters();
  const languageNames = useMemo(() => new Intl.DisplayNames([locale], { type: 'language' }), [locale]);

  const build = (facet: FacetKey, values: string[], label: (v: string) => string): Option[] =>
    values.map((value) => ({
      value,
      label: label(value),
      count: counts[facet][value] ?? 0,
      checked: filters[facet].includes(value),
    }));

  const toggle = (facet: FacetKey) => (value: string) => dispatch(toggleFacetValue({ facet, value }));
  const metadataFacets = activeMetadataFacets(filters, categories);

  return (
    <div className={styles.facets}>
      <details className={styles.facet} open>
        <summary className={styles.facetSummary}>
          <span>{t('filters.categories')}</span>
          {filters.categories.length > 0 && <span className={styles.facetSelected}>{filters.categories.length}</span>}
        </summary>
        <div className={styles.facetBody}>
          {CATEGORY_GROUPS.map((group) => {
            const groupCategories = categories.filter((c) => c.group === group);
            if (!groupCategories.length) return null;
            return (
              <div key={group} className={styles.facetSubgroup} role="group" aria-label={groupLabel(group)}>
                <p className={styles.facetSubgroupTitle}>{groupLabel(group)}</p>
                {build('categories', groupCategories.map((c) => c.id), (id) => categoryLabel(id)).map((option) => (
                  <Checkbox
                    key={option.value}
                    checked={option.checked}
                    onChange={() => toggle('categories')(option.value)}
                    label={
                      <span className={styles.option}>
                        <span className={styles.optionLabel}>{option.label}</span>
                        <span className={styles.optionCount}>{option.count}</span>
                      </span>
                    }
                  />
                ))}
              </div>
            );
          })}
        </div>
      </details>

      {metadataFacets.map(({ category, field }) => {
        const values = Object.keys(counts.metadata[field.key] ?? {}).sort();
        return (
          <FacetGroup
            key={field.key}
            title={`${fieldLabel(field)} · ${categoryLabel(category)}`}
            options={values.map((value) => ({
              value,
              label: optionLabel(value),
              count: counts.metadata[field.key]?.[value] ?? 0,
              checked: (filters.metadata[field.key] ?? []).includes(value),
            }))}
            onToggle={(value) => dispatch(toggleMetadataValue({ key: field.key, value }))}
          />
        );
      })}

      <FacetGroup title={t('filters.regions')} options={build('regions', REGIONS, (r) => t(`common:region.${r}`))} onToggle={toggle('regions')} />
      <FacetGroup title={t('filters.statuses')} options={build('statuses', ASSET_STATUSES, (s) => t(`common:status.${s}`))} onToggle={toggle('statuses')} />
      <FacetGroup
        title={t('filters.formats')}
        options={build('formats', FORMAT_IDS.filter((f) => (counts.formats[f] ?? 0) > 0 || filters.formats.includes(f)), formatLabel)}
        onToggle={toggle('formats')}
        open={false}
      />
      <FacetGroup
        title={t('filters.sources')}
        options={build('sources', SOURCES.map((s) => s.id), (id) => SOURCES.find((s) => s.id === id)?.name ?? id)}
        onToggle={toggle('sources')}
        open={false}
      />
      <FacetGroup
        title={t('filters.classifications')}
        options={build('classifications', CLASSIFICATIONS, (c) => t(`common:classification.${c}`))}
        onToggle={toggle('classifications')}
        open={false}
      />
      <FacetGroup
        title={t('filters.locales')}
        options={build('locales', options.locales, (l) => {
          try {
            return languageNames.of(l) ?? l;
          } catch {
            return l;
          }
        })}
        onToggle={toggle('locales')}
        open={false}
      />
      <FacetGroup title={t('filters.campaigns')} options={build('campaigns', options.campaigns, (c) => c)} onToggle={toggle('campaigns')} open={false} />
      <FacetGroup
        title={t('filters.businessUnits')}
        options={build('businessUnits', options.businessUnits, (b) => b)}
        onToggle={toggle('businessUnits')}
        open={false}
      />
      <FacetGroup title={t('filters.date')} options={[]} onToggle={() => undefined} open={!!(filters.dateFrom || filters.dateTo)}>
        <div className={styles.dates}>
          <label>
            <span className="u-small">{t('filters.from')}</span>
            <input type="date" value={filters.dateFrom} onChange={(e) => dispatch(setDateRange({ from: e.target.value }))} />
          </label>
          <label>
            <span className="u-small">{t('filters.to')}</span>
            <input type="date" value={filters.dateTo} onChange={(e) => dispatch(setDateRange({ to: e.target.value }))} />
          </label>
        </div>
      </FacetGroup>
    </div>
  );
}
