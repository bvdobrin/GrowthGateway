import { Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ApprovalActions } from '@/components/ApprovalActions/ApprovalActions';
import { AssetThumbnail } from '@/components/AssetThumbnail/AssetThumbnail';
import { CategoryBadge, ClassificationBadge } from '@/components/Badge/Badge';
import { EmptyState, PageHeader, Spinner } from '@/components/PageHeader/PageHeader';
import { ValidationReport } from '@/components/ValidationReport/ValidationReport';
import { useDocumentTitle } from '@/hooks/useAppHelpers';
import { useFormatters } from '@/hooks/useFormatters';
import { canApprove } from '@/lib/accessPolicy';
import { directoryName } from '@/mocks/users';
import { useListAssetsQuery } from '@/store/damApi';
import { useAppSelector } from '@/store/hooks';
import { selectCurrentUser } from '@/store/sessionSlice';
import styles from './ApprovalsPage.module.css';

export function ApprovalsPage() {
  const { t } = useTranslation(['asset', 'common', 'validation']);
  const user = useAppSelector(selectCurrentUser);
  const { data: assets = [], isLoading } = useListAssetsQuery();
  const { formatDate } = useFormatters();
  useDocumentTitle(t('approvals.title'));

  const queue = user
    ? assets.filter((a) => canApprove(user, a)).sort((a, b) => (a.submittedAt ?? '').localeCompare(b.submittedAt ?? ''))
    : [];

  return (
    <div className="l-page">
      <PageHeader title={t('approvals.title')} subtitle={t('approvals.subtitle')} eyebrow={<span className={styles.count}>{t('approvals.count', { count: queue.length })}</span>} />
      {isLoading ? (
        <Spinner label={t('common:actions.loading')} />
      ) : queue.length === 0 ? (
        <EmptyState icon={<Inbox />} title={t('approvals.empty')} />
      ) : (
        <ul role="list" className={styles.queue}>
          {queue.map((asset) => (
            <li key={asset.id} className={styles.item}>
              <AssetThumbnail asset={asset} className={styles.thumb} />
              <div className={styles.body}>
                <div className={styles.badges}>
                  <CategoryBadge categoryId={asset.category} />
                  <ClassificationBadge classification={asset.classification} />
                  <span className={styles.region}>{t(`common:region.${asset.region}`)}</span>
                </div>
                <h2 className={styles.title}>
                  <Link to={`/assets/${asset.id}`}>{asset.title}</Link>
                </h2>
                <p className={styles.meta}>
                  {t('approvals.submitted', {
                    date: formatDate(asset.submittedAt ?? asset.updatedAt),
                    name: directoryName(asset.submittedBy ?? asset.ownerId),
                  })}
                </p>
                <details className={styles.checks}>
                  <summary>
                    {t('approvals.checks')}: {t(`validation:overall.${asset.validation?.overall ?? 'pass'}`)}
                  </summary>
                  <ValidationReport report={asset.validation} onlyIssues />
                </details>
              </div>
              <div className={styles.actions}>
                <ApprovalActions asset={asset} size="sm" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
