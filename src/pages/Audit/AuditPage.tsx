import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/Button/Button';
import { Dialog } from '@/components/Dialog/Dialog';
import { PageHeader, Spinner } from '@/components/PageHeader/PageHeader';
import { useDocumentTitle, useToast } from '@/hooks/useAppHelpers';
import { useFormatters } from '@/hooks/useFormatters';
import { useListAuditQuery, useResetDemoDataMutation } from '@/store/damApi';
import type { AuditAction } from '@/types';
import styles from './AuditPage.module.css';

const ACTIONS: AuditAction[] = [
  'auth.sign_in',
  'auth.sign_out',
  'auth.view_as',
  'asset.view',
  'asset.download',
  'asset.upload',
  'asset.author',
  'asset.link',
  'asset.migrate',
  'asset.update',
  'asset.generate',
  'asset.validate',
  'asset.submit',
  'asset.approve',
  'asset.reject',
  'asset.access_denied',
  'taxonomy.create',
];

export function AuditPage() {
  const { t } = useTranslation(['asset', 'common']);
  const toast = useToast();
  const { data: events = [], isLoading } = useListAuditQuery();
  const [reset, { isLoading: resetting }] = useResetDemoDataMutation();
  const [action, setAction] = useState<'' | AuditAction>('');
  const [confirming, setConfirming] = useState(false);
  const { formatDateTime } = useFormatters();
  useDocumentTitle(t('audit.title'));

  const rows = action ? events.filter((e) => e.action === action) : events;

  return (
    <div className="l-page">
      <PageHeader
        title={t('audit.title')}
        subtitle={t('audit.subtitle')}
        actions={
          <Button variant="danger" icon={<RotateCcw />} onClick={() => setConfirming(true)}>
            {t('audit.reset')}
          </Button>
        }
      />
      <div className={styles.toolbar}>
        <label className={styles.filter}>
          <span>{t('audit.filter')}</span>
          <select value={action} onChange={(e) => setAction(e.target.value as AuditAction | '')}>
            <option value="">{t('audit.all')}</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {t(`audit.actions.${a}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {isLoading ? (
        <Spinner label={t('common:actions.loading')} />
      ) : (
        <div className="l-scroll-x">
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{t('audit.time')}</th>
                <th scope="col">{t('audit.actor')}</th>
                <th scope="col">{t('audit.action')}</th>
                <th scope="col">{t('audit.asset')}</th>
                <th scope="col">{t('audit.details')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((event) => (
                <tr key={event.id} data-action={event.action}>
                  <td className="u-tabular">{formatDateTime(event.at)}</td>
                  <td>{event.actorName}</td>
                  <td>
                    <span className={styles.action}>{t(`audit.actions.${event.action}`)}</span>
                  </td>
                  <td>{event.assetId && event.assetTitle !== '(hidden)' ? <Link to={`/assets/${event.assetId}`}>{event.assetTitle}</Link> : event.assetId}</td>
                  <td className={styles.details}>{event.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t('audit.reset')}
        footer={
          <>
            <Button onClick={() => setConfirming(false)}>{t('common:actions.cancel')}</Button>
            <Button
              variant="danger"
              loading={resetting}
              onClick={async () => {
                await reset().unwrap();
                toast.success(t('common:toast.demoReset'));
                setConfirming(false);
              }}
            >
              {t('audit.reset')}
            </Button>
          </>
        }
      >
        <p>{t('audit.resetConfirm')}</p>
      </Dialog>
    </div>
  );
}
