import { Compass, ShieldX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ButtonLink } from '@/components/Button/Button';
import { EmptyState } from '@/components/PageHeader/PageHeader';
import { useDocumentTitle } from '@/hooks/useAppHelpers';
import type { Permission } from '@/types';

export function NotFoundPage() {
  const { t } = useTranslation('common');
  useDocumentTitle(t('notFound.title'));
  return (
    <div className="l-page">
      <EmptyState
        icon={<Compass />}
        title={t('notFound.title')}
        body={t('notFound.body')}
        action={<ButtonLink to="/" variant="primary">{t('notFound.home')}</ButtonLink>}
      />
    </div>
  );
}

export function ForbiddenPage({ permission }: { permission: Permission }) {
  const { t } = useTranslation('common');
  useDocumentTitle(t('forbidden.title'));
  return (
    <div className="l-page">
      <EmptyState
        icon={<ShieldX />}
        title={t('forbidden.title')}
        body={
          <>
            {t('forbidden.body')} {t('errors.forbiddenHint', { permission })}
          </>
        }
        action={<ButtonLink to="/">{t('notFound.home')}</ButtonLink>}
      />
    </div>
  );
}
