import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CommonFields } from '@/components/AssetForm/CommonFields';
import { Button } from '@/components/Button/Button';
import { Dialog } from '@/components/Dialog/Dialog';
import { Field } from '@/components/Field/Field';
import { MetadataForm } from '@/components/MetadataForm/MetadataForm';
import { useToast } from '@/hooks/useAppHelpers';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import type { CommonFields as CommonFieldsValue } from '@/services/assetService';
import { useUpdateAssetMutation } from '@/store/damApi';
import type { Asset, MetadataValue, User } from '@/types';
import styles from './AssetDetailPage.module.css';

export function EditAssetDialog({ asset, user, open, onClose }: { asset: Asset; user: User; open: boolean; onClose: () => void }) {
  const { t } = useTranslation(['asset', 'common']);
  const toast = useToast();
  const { byId, categoryLabel } = useTaxonomy();
  const category = byId[asset.category];
  const [update, { isLoading }] = useUpdateAssetMutation();
  const [title, setTitle] = useState(asset.title);
  const [description, setDescription] = useState(asset.description);
  const [metadata, setMetadata] = useState<Record<string, MetadataValue>>(asset.categoryMetadata);
  const [common, setCommon] = useState<CommonFieldsValue>({
    region: asset.region,
    locale: asset.locale,
    businessUnit: asset.businessUnit,
    campaign: asset.campaign ?? '',
    tags: asset.tags,
    classification: asset.classification,
    accessGroups: asset.accessGroups,
    sourceSystem: asset.sourceSystem,
    rightsExpiry: asset.rightsExpiry ?? '',
  });

  const save = async () => {
    try {
      await update({
        id: asset.id,
        patch: {
          title,
          description,
          categoryMetadata: metadata,
          region: common.region,
          locale: common.locale,
          businessUnit: common.businessUnit,
          campaign: common.campaign?.trim() || undefined,
          tags: common.tags.map((tag) => tag.trim()).filter(Boolean),
          classification: common.classification,
          accessGroups: common.accessGroups,
          rightsExpiry: common.rightsExpiry || undefined,
        },
      }).unwrap();
      toast.success(t('common:toast.saved'));
      onClose();
    } catch (error) {
      toast.error(error);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('edit.title')}
      description={asset.status === 'approved' || asset.status === 'pending_approval' ? t('edit.reapprovalNote') : undefined}
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>{t('common:actions.cancel')}</Button>
          <Button variant="primary" onClick={save} loading={isLoading} disabled={!title.trim() || common.accessGroups.length === 0}>
            {t('common:actions.save')}
          </Button>
        </>
      }
    >
      <div className={styles.editForm}>
        <div className="l-form-grid">
          <Field label={t('add.assetTitle')} required className="l-span-full">
            {(props) => <input {...props} value={title} onChange={(e) => setTitle(e.target.value)} />}
          </Field>
          <Field label={t('add.description')} className="l-span-full">
            {(props) => <textarea {...props} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />}
          </Field>
        </div>
        {category && category.metadataSchema.length > 0 && (
          <section>
            <h3 className={styles.editHeading}>{t('add.categoryFields', { category: categoryLabel(category) })}</h3>
            <MetadataForm fields={category.metadataSchema} values={metadata} onChange={(key, value) => setMetadata((m) => ({ ...m, [key]: value }))} />
          </section>
        )}
        <section>
          <h3 className={styles.editHeading}>{t('add.common')}</h3>
          <CommonFields
            user={user}
            value={common}
            onChange={(patch) => setCommon((c) => ({ ...c, ...patch }))}
            showSource={false}
            existingGroups={asset.accessGroups}
          />
        </section>
      </div>
    </Dialog>
  );
}
