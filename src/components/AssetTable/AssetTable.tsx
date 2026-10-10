import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFormatters } from '@/hooks/useFormatters';
import { SOURCES_BY_ID } from '@/mocks/sources';
import type { Asset } from '@/types';
import { CategoryBadge, StatusBadge } from '../Badge/Badge';
import styles from './AssetTable.module.css';

export function AssetTable({ assets }: { assets: Asset[] }) {
  const { t } = useTranslation(['library', 'common']);
  const { formatDate } = useFormatters();
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">{t('columns.title')}</th>
            <th scope="col">{t('columns.category')}</th>
            <th scope="col" className="u-hide-below-md">
              {t('columns.region')}
            </th>
            <th scope="col">{t('columns.status')}</th>
            <th scope="col" className="u-hide-below-md">
              {t('columns.source')}
            </th>
            <th scope="col" className="u-hide-below-md">
              {t('columns.created')}
            </th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr key={asset.id}>
              <td className={styles.title}>
                <Link to={`/assets/${asset.id}`}>{asset.title}</Link>
              </td>
              <td>
                <CategoryBadge categoryId={asset.category} />
              </td>
              <td className="u-hide-below-md">{t(`common:region.${asset.region}`)}</td>
              <td>
                <StatusBadge status={asset.status} />
              </td>
              <td className="u-hide-below-md">
                <span className={styles.muted}>{SOURCES_BY_ID[asset.sourceSystem]?.name ?? asset.sourceSystem}</span>
              </td>
              <td className="u-hide-below-md u-tabular">
                <time dateTime={asset.createdAt}>{formatDate(asset.createdAt)}</time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
