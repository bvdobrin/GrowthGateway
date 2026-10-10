import { useEffect } from 'react';
import { CircleCheck, CircleX, Info, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { dismissToast, selectToasts, type Toast } from '@/store/uiSlice';
import styles from './Toaster.module.css';

const ICONS = { success: CircleCheck, error: CircleX, info: Info };

function ToastItem({ toast }: { toast: Toast }) {
  const dispatch = useAppDispatch();
  const { t } = useTranslation('common');
  const Glyph = ICONS[toast.kind];
  useEffect(() => {
    const timer = window.setTimeout(() => dispatch(dismissToast(toast.id)), toast.kind === 'error' ? 7000 : 4000);
    return () => window.clearTimeout(timer);
  }, [dispatch, toast.id, toast.kind]);
  return (
    <li className={`${styles.toast} ${styles[toast.kind]}`} role={toast.kind === 'error' ? 'alert' : 'status'}>
      <Glyph aria-hidden="true" className={styles.icon} />
      <p className={styles.message}>{toast.message}</p>
      <button type="button" className={styles.close} onClick={() => dispatch(dismissToast(toast.id))}>
        <X aria-hidden="true" />
        <span className="u-visually-hidden">{t('actions.close')}</span>
      </button>
    </li>
  );
}

export function Toaster() {
  const toasts = useAppSelector(selectToasts);
  return (
    <ol className={styles.region} aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </ol>
  );
}
