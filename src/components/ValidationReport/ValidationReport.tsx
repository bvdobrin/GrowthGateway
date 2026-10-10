import { CircleAlert, CircleCheck, CircleX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFormatters } from '@/hooks/useFormatters';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import type { ValidationReport as Report, ValidationResult, ValidationStatus } from '@/types';
import styles from './ValidationReport.module.css';

const ICONS: Record<ValidationStatus, typeof CircleCheck> = { pass: CircleCheck, warn: CircleAlert, fail: CircleX };

export function ValidationIcon({ status }: { status: ValidationStatus }) {
  const Glyph = ICONS[status];
  return <Glyph aria-hidden="true" className={`${styles.icon} ${styles[status]}`} />;
}

/** Translates rule params that are themselves taxonomy or enum values. */
function useMessage() {
  const { t } = useTranslation(['validation', 'common']);
  const { fieldLabel, formatLabel } = useTaxonomy();
  const { formatDate, formatDateTime } = useFormatters();
  return (result: ValidationResult) => {
    const params: Record<string, string | number> = { ...(result.message.params ?? {}) };
    if (typeof params.fields === 'string') params.fields = params.fields.split(',').map(fieldLabel).join(', ');
    if (typeof params.format === 'string') params.format = formatLabel(params.format);
    if (typeof params.classification === 'string') params.classification = t(`common:classification.${params.classification}`);
    if (typeof params.region === 'string') params.region = t(`common:region.${params.region}`);
    if (typeof params.date === 'string') params.date = params.date.includes('T') ? formatDateTime(params.date) : formatDate(params.date);
    return t(`validation:msg.${result.message.key}`, params);
  };
}

interface ValidationReportProps {
  report?: Report;
  /** Hide passing rules to keep queues compact. */
  onlyIssues?: boolean;
}

export function ValidationReport({ report, onlyIssues = false }: ValidationReportProps) {
  const { t } = useTranslation('validation');
  const { formatDateTime } = useFormatters();
  const message = useMessage();

  if (!report) return <p className={styles.notRun}>{t('notRun')}</p>;

  const counts = { pass: 0, warn: 0, fail: 0 };
  report.results.forEach((r) => (counts[r.status] += 1));
  const results = onlyIssues ? report.results.filter((r) => r.status !== 'pass') : report.results;
  const order: Record<ValidationStatus, number> = { fail: 0, warn: 1, pass: 2 };

  return (
    <div className={styles.report}>
      <div className={`${styles.summary} ${styles[report.overall]}`}>
        <ValidationIcon status={report.overall} />
        <div>
          <p className={styles.overall}>{t(`overall.${report.overall}`)}</p>
          <p className={styles.counts}>
            {t('summary', counts)} · {t('checkedAt', { date: formatDateTime(report.checkedAt) })}
          </p>
        </div>
      </div>
      {results.length > 0 && (
        <ul className={styles.list} role="list">
          {[...results]
            .sort((a, b) => order[a.status] - order[b.status])
            .map((result) => (
              <li key={result.ruleId} className={styles.item}>
                <ValidationIcon status={result.status} />
                <div className={styles.itemText}>
                  <p className={styles.rule}>
                    {t(`rules.${result.ruleId}`, { defaultValue: result.ruleId })}
                    <span className="u-visually-hidden">: {t(`status.${result.status}`)}</span>
                  </p>
                  <p className={styles.message}>{message(result)}</p>
                </div>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
