import { Link2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFormatters } from '@/hooks/useFormatters';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import { SOURCES_BY_ID } from '@/mocks/sources';
import type { Asset } from '@/types';
import { CategoryBadge, ClassificationBadge, StatusBadge } from '../Badge/Badge';
import { AssetThumbnail } from '../AssetThumbnail/AssetThumbnail';
import styles from './AssetCard.module.css';

export function AssetCard({
  asset,
  selected = false,
  onSelectedChange,
}: {
  asset: Asset;
  selected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
}) {
  const { t } = useTranslation(['common', 'library']);
  const { formatDate } = useFormatters();
  const { formatLabel } = useTaxonomy();
  const source = SOURCES_BY_ID[asset.sourceSystem];

  return (
    <article className={`${styles.card} ${selected ? styles.selected : ''}`}>
      {onSelectedChange && (
        <label className={styles.select}>
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onSelectedChange(event.target.checked)}
            onClick={(event) => event.stopPropagation()}
          />
          <span className="u-visually-hidden">{t('library:selection.select', { title: asset.title })}</span>
        </label>
      )}
      <div className={styles.media}>
        <AssetThumbnail asset={asset} />
        {asset.migrationStatus === 'linked' && (
          <span className={styles.linked} title={`${t('migration.linked')}: ${source?.name ?? asset.sourceSystem}`}>
            <Link2 aria-hidden="true" />
            <span className="u-visually-hidden">{t('migration.linked')}</span>
          </span>
        )}
      </div>
      <div className={styles.body}>
        <div className={styles.badges}>
          <CategoryBadge categoryId={asset.category} />
          <StatusBadge status={asset.status} />
        </div>
        <h3 className={styles.title}>
          <Link to={`/assets/${asset.id}`} className={styles.link}>
            <span className="u-clamp-2">{asset.title}</span>
          </Link>
        </h3>
        <p className={styles.meta}>
          <span>{t(`region.${asset.region}`)}</span>
          <span aria-hidden="true">·</span>
          <span>{formatLabel(asset.format)}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={asset.createdAt}>{formatDate(asset.createdAt)}</time>
        </p>
        <div className={styles.footer}>
          <ClassificationBadge classification={asset.classification} />
          <span className={`${styles.source} u-truncate`}>{source?.name ?? asset.sourceSystem}</span>
        </div>
      </div>
    </article>
  );
}
