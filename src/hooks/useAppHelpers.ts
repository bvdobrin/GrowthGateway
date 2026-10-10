import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '@/store/hooks';
import { pushToast } from '@/store/uiSlice';

export function useDocumentTitle(title: string | undefined) {
  const { t } = useTranslation('nav');
  useEffect(() => {
    document.title = title ? `${title} · ${t('appName')}` : t('appName');
  }, [title, t]);
}

/** Message from an RTK Query error (`ApiError`) or a thrown Error. */
export const errorMessage = (error: unknown, fallback: string) =>
  error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message
    ? error.message
    : fallback;

export function useToast() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation('common');
  return useMemo(
    () => ({
      success: (message: string) => dispatch(pushToast({ kind: 'success', message })),
      info: (message: string) => dispatch(pushToast({ kind: 'info', message })),
      error: (error: unknown) => dispatch(pushToast({ kind: 'error', message: errorMessage(error, t('errors.generic')) })),
    }),
    [dispatch, t],
  );
}
