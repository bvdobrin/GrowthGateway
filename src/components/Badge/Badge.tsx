import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, LockOpen, ShieldAlert, Shield } from 'lucide-react';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import type { AssetStatus, Classification } from '@/types';
import { Icon } from '../Icon/Icon';
import styles from './Badge.module.css';

interface BadgeProps {
  /** A token name, e.g. 'color-status-approved'. */
  colorToken?: string;
  tone?: 'solid' | 'soft' | 'outline';
  icon?: ReactNode;
  children: ReactNode;
  title?: string;
}

export function Badge({ colorToken = 'color-text-muted', tone = 'soft', icon, children, title }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[tone]}`} style={{ '--badge-color': `var(--${colorToken})` } as CSSProperties} title={title}>
      {icon}
      <span className={styles.label}>{children}</span>
    </span>
  );
}

export function StatusBadge({ status }: { status: AssetStatus }) {
  const { t } = useTranslation('common');
  return <Badge colorToken={`color-status-${status.replace('_', '-')}`}>{t(`status.${status}`)}</Badge>;
}

const CLASSIFICATION_ICON: Record<Classification, ReactNode> = {
  public: <LockOpen aria-hidden="true" />,
  internal: <Shield aria-hidden="true" />,
  confidential: <Lock aria-hidden="true" />,
  restricted: <ShieldAlert aria-hidden="true" />,
};

export function ClassificationBadge({ classification }: { classification: Classification }) {
  const { t } = useTranslation('common');
  return (
    <Badge colorToken={`color-classification-${classification}`} tone="outline" icon={CLASSIFICATION_ICON[classification]}>
      {t(`classification.${classification}`)}
    </Badge>
  );
}

export function CategoryBadge({ categoryId }: { categoryId: string }) {
  const { byId, categoryLabel } = useTaxonomy();
  const category = byId[categoryId];
  return (
    <Badge colorToken={category?.colorToken ?? 'color-group-custom'} icon={<Icon name={category?.icon ?? 'Folder'} />}>
      {categoryLabel(categoryId)}
    </Badge>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className={styles.tag}>{children}</span>;
}
