import type { CSSProperties } from 'react';
import { CalendarClock, Database, Layers, ShieldCheck, Sparkles, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AssetCard } from '@/components/AssetCard/AssetCard';
import { ButtonLink } from '@/components/Button/Button';
import { Icon } from '@/components/Icon/Icon';
import { Card, PageHeader, Spinner } from '@/components/PageHeader/PageHeader';
import { useDocumentTitle } from '@/hooks/useAppHelpers';
import { useFormatters } from '@/hooks/useFormatters';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import { SOURCES_BY_ID } from '@/mocks/sources';
import { useGetDashboardStatsQuery, useListAssetsQuery } from '@/store/damApi';
import { useAppSelector } from '@/store/hooks';
import { selectCurrentUser, selectPermissions } from '@/store/sessionSlice';
import { CATEGORY_GROUPS } from '@/types';
import styles from './DashboardPage.module.css';

export function DashboardPage() {
  const { t } = useTranslation(['library', 'nav']);
  const user = useAppSelector(selectCurrentUser);
  const permissions = useAppSelector(selectPermissions);
  const { data: stats, isLoading } = useGetDashboardStatsQuery();
  const { data: assets } = useListAssetsQuery();
  const { categories, categoryLabel, groupLabel } = useTaxonomy();
  const { formatNumber, formatPercent, formatDate } = useFormatters();
  useDocumentTitle(t('nav:dashboard'));

  if (isLoading || !stats || !user) return <Spinner label={t('common:actions.loading')} />;

  const connected = stats.bySource.filter((s) => s.linked + s.migrated > 0);
  const maxSource = Math.max(1, ...connected.map((s) => s.linked + s.migrated));

  return (
    <div className="l-page">
      <PageHeader
        title={t('dashboard.title', { name: user.name.split(' ')[0] })}
        subtitle={t('dashboard.subtitle', { count: connected.length })}
        actions={
          <>
            {permissions.includes('asset:upload') && (
              <ButtonLink to="/assets/new" variant="primary" icon={<Upload />}>
                {t('nav:addAsset')}
              </ButtonLink>
            )}
            {permissions.includes('asset:generate') && (
              <ButtonLink to="/generate" icon={<Sparkles />}>
                {t('nav:generate')}
              </ButtonLink>
            )}
          </>
        }
      />

      <ul role="list" className={styles.kpis}>
        <li className={styles.kpi}>
          <Layers aria-hidden="true" />
          <span className={styles.kpiValue}>{formatNumber(stats.totalVisible)}</span>
          <span className={styles.kpiLabel}>{t('dashboard.kpis.visible')}</span>
        </li>
        <li className={styles.kpi}>
          <Database aria-hidden="true" />
          <span className={styles.kpiValue}>{formatPercent(stats.migratedShare)}</span>
          <span className={styles.kpiLabel}>{t('dashboard.kpis.migrated')}</span>
        </li>
        {permissions.includes('asset:approve') && (
          <li className={styles.kpi}>
            <ShieldCheck aria-hidden="true" />
            <Link to="/approvals" className={styles.kpiValue}>
              {formatNumber(stats.pendingApprovalForMe)}
            </Link>
            <span className={styles.kpiLabel}>{t('dashboard.kpis.pendingMine')}</span>
          </li>
        )}
        <li className={styles.kpi}>
          <CalendarClock aria-hidden="true" />
          <span className={styles.kpiValue}>{formatNumber(stats.expiringSoon.length)}</span>
          <span className={styles.kpiLabel}>{t('dashboard.kpis.expiring')}</span>
        </li>
      </ul>

      <div className={styles.grid}>
        <Card title={t('dashboard.sources')} className={styles.sources}>
          <p className={styles.hint}>{t('dashboard.sourcesHint')}</p>
          <ul role="list" className={styles.sourceList}>
            {connected.map((s) => {
              const source = SOURCES_BY_ID[s.sourceId];
              const total = s.linked + s.migrated;
              return (
                <li key={s.sourceId} className={styles.source}>
                  <div className={styles.sourceHead}>
                    <Link to={`/assets?source=${s.sourceId}`} className={styles.sourceName}>
                      {source?.name ?? s.sourceId}
                    </Link>
                    <span className="u-tabular u-muted u-small">{formatNumber(total)}</span>
                  </div>
                  {source?.acquiredCompany && <p className={styles.acquired}>{t('dashboard.acquired', { company: source.acquiredCompany })}</p>}
                  <div
                    className={styles.bar}
                    style={{ '--total': total / maxSource, '--migrated': s.migrated / Math.max(1, total) } as CSSProperties}
                    role="img"
                    aria-label={`${t('dashboard.migrated')}: ${formatNumber(s.migrated)}, ${t('dashboard.linked')}: ${formatNumber(s.linked)}`}
                  >
                    <span className={styles.barMigrated} />
                    <span className={styles.barLinked} />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className={styles.legend}>
            <span className={styles.legendMigrated}>{t('dashboard.migrated')}</span>
            <span className={styles.legendLinked}>{t('dashboard.linked')}</span>
          </p>
        </Card>

        <Card title={t('dashboard.expiringSoon')} className={styles.expiring}>
          {stats.expiringSoon.length === 0 ? (
            <p className={styles.hint}>{t('dashboard.noneExpiring')}</p>
          ) : (
            <ul role="list" className={styles.expiringList}>
              {stats.expiringSoon.slice(0, 6).map((a) => (
                <li key={a.id}>
                  <Link to={`/assets/${a.id}`}>{a.title}</Link>
                  <time dateTime={a.rightsExpiry} className="u-small u-muted">
                    {formatDate(a.rightsExpiry)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section className={styles.section} aria-labelledby="types-heading">
        <h2 id="types-heading">{t('dashboard.categories')}</h2>
        {CATEGORY_GROUPS.map((group) => {
          const groupCategories = categories.filter((c) => c.group === group);
          if (!groupCategories.length) return null;
          return (
            <div key={group} className={styles.group}>
              <h3 className={styles.groupTitle}>{groupLabel(group)}</h3>
              <ul role="list" className={styles.tiles}>
                {groupCategories.map((category) => (
                  <li key={category.id}>
                    <Link
                      to={`/assets?category=${category.id}`}
                      className={styles.tile}
                      style={{ '--tile-color': `var(--${category.colorToken})` } as CSSProperties}
                    >
                      <Icon name={category.icon} />
                      <span className={styles.tileLabel}>{categoryLabel(category)}</span>
                      <span className={styles.tileCount}>{formatNumber(stats.byCategory[category.id] ?? 0)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      {assets && assets.length > 0 && (
        <section className={styles.section} aria-labelledby="recent-heading">
          <div className={styles.sectionHead}>
            <h2 id="recent-heading">{t('dashboard.recent')}</h2>
            <Link to="/assets?sort=newest">{t('common:actions.viewAll')}</Link>
          </div>
          <div className="l-auto-grid">
            {assets.slice(0, 4).map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
