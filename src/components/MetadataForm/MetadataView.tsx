import { Fragment, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormatters } from '@/hooks/useFormatters';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import type { MetadataField, MetadataValue } from '@/types';
import styles from './MetadataForm.module.css';

export interface DetailRow {
  label: ReactNode;
  value: ReactNode;
}

export function DetailList({ rows }: { rows: DetailRow[] }) {
  return (
    <dl className={styles.list}>
      {rows.map((row, i) => (
        <Fragment key={i}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

/** Read-only rendering of a category's metadata, with values formatted for the UI locale. */
export function MetadataView({ fields, values }: { fields: MetadataField[]; values: Record<string, MetadataValue> }) {
  const { t } = useTranslation('common');
  const { fieldLabel, optionLabel } = useTaxonomy();
  const { formatDate, formatDateTime, formatNumber } = useFormatters();

  const render = (field: MetadataField, value: MetadataValue | undefined): ReactNode => {
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
      return <span className={styles.empty}>{t('notSet')}</span>;
    }
    switch (field.kind) {
      case 'boolean':
        return value ? t('yes') : t('no');
      case 'date':
        return formatDate(String(value));
      case 'datetime':
        return formatDateTime(String(value));
      case 'number':
        return typeof value === 'number' ? formatNumber(value) : String(value);
      case 'select':
        return optionLabel(String(value));
      case 'multiselect':
        return (value as string[]).map(optionLabel).join(', ');
      case 'url':
        return (
          <a href={String(value)} target="_blank" rel="noreferrer noopener" dir="ltr">
            {String(value)}
          </a>
        );
      default:
        return Array.isArray(value) ? value.join(', ') : String(value);
    }
  };

  return <DetailList rows={fields.map((field) => ({ label: fieldLabel(field), value: render(field, values[field.key]) }))} />;
}
