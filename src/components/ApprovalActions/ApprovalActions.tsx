import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/useAppHelpers';
import { useDecideApprovalMutation } from '@/store/damApi';
import type { Asset } from '@/types';
import { Button } from '../Button/Button';
import { Dialog } from '../Dialog/Dialog';
import { Field } from '../Field/Field';

export function ApprovalActions({ asset, size = 'md' }: { asset: Asset; size?: 'md' | 'sm' }) {
  const { t } = useTranslation(['asset', 'common']);
  const toast = useToast();
  const [decide, { isLoading }] = useDecideApprovalMutation();
  const [rejecting, setRejecting] = useState(false);
  const [comment, setComment] = useState('');

  const run = async (decision: 'approved' | 'rejected') => {
    try {
      await decide({ id: asset.id, decision, comment: decision === 'rejected' ? comment : undefined }).unwrap();
      toast.success(t(`common:toast.${decision}`, { title: asset.title }));
      setRejecting(false);
      setComment('');
    } catch (error) {
      toast.error(error);
    }
  };

  return (
    <>
      <Button variant="primary" size={size} icon={<Check />} onClick={() => run('approved')} loading={isLoading && !rejecting}>
        {t('actions.approve')}
      </Button>
      <Button variant="danger" size={size} icon={<X />} onClick={() => setRejecting(true)}>
        {t('actions.reject')}
      </Button>
      <Dialog
        open={rejecting}
        onClose={() => setRejecting(false)}
        title={t('approvals.rejectTitle', { title: asset.title })}
        footer={
          <>
            <Button onClick={() => setRejecting(false)}>{t('common:actions.cancel')}</Button>
            <Button variant="danger" onClick={() => run('rejected')} disabled={!comment.trim()} loading={isLoading}>
              {t('actions.reject')}
            </Button>
          </>
        }
      >
        <Field label={t('approvals.rejectReason')} required>
          {(props) => <textarea {...props} rows={4} value={comment} onChange={(e) => setComment(e.target.value)} autoFocus />}
        </Field>
      </Dialog>
    </>
  );
}
