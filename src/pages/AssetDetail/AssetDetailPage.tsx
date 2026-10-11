import { useMemo, useState } from 'react';
import { ArrowLeft, CloudDownload, Download, FileSearch, GitBranch, Link2, Pencil, Send, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApprovalActions } from '@/components/ApprovalActions/ApprovalActions';
import { CategoryBadge, ClassificationBadge, StatusBadge, Tag } from '@/components/Badge/Badge';
import { Button, ButtonLink } from '@/components/Button/Button';
import { Dialog } from '@/components/Dialog/Dialog';
import { DetailList, MetadataView } from '@/components/MetadataForm/MetadataView';
import { Card, EmptyState, Spinner } from '@/components/PageHeader/PageHeader';
import { Popover } from '@/components/Popover/Popover';
import { AssetPreview } from '@/components/Previewer/AssetPreview';
import { ValidationReport } from '@/components/ValidationReport/ValidationReport';
import { libraryReturnTo } from '@/app/ScrollManager';
import { useDocumentTitle, useToast } from '@/hooks/useAppHelpers';
import { useFormatters } from '@/hooks/useFormatters';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import {
  canApprove,
  canDownload,
  canEdit,
  canGenerate,
  canMigrate,
  canSubmit,
  canValidate,
  explainAccess,
} from '@/lib/accessPolicy';
import { directoryName } from '@/mocks/users';
import { SOURCES_BY_ID } from '@/mocks/sources';
import { groupName } from '@/services/iamService';
import {
  useDownloadAssetMutation,
  useDeleteAssetMutation,
  useGetAssetQuery,
  useListAssetsQuery,
  useMigrateAssetMutation,
  useSubmitForApprovalMutation,
  useValidateAssetMutation,
} from '@/store/damApi';
import { useAppSelector } from '@/store/hooks';
import { selectCurrentUser } from '@/store/sessionSlice';
import { EditAssetDialog } from './EditAssetDialog';
import styles from './AssetDetailPage.module.css';

export function AssetDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation(['asset', 'common', 'validation']);
  const toast = useToast();
  const user = useAppSelector(selectCurrentUser);
  const { data: asset, isLoading, isError } = useGetAssetQuery(id);
  const { data: assets = [] } = useListAssetsQuery();
  const { byId, categoryLabel, formatLabel } = useTaxonomy();
  const { formatDate, formatDateTime, locale } = useFormatters();
  const [download, { isLoading: downloading }] = useDownloadAssetMutation();
  const [validate, { isLoading: validating }] = useValidateAssetMutation();
  const [submit, { isLoading: submitting }] = useSubmitForApprovalMutation();
  const [migrate, { isLoading: migrating }] = useMigrateAssetMutation();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [remove, { isLoading: deleting }] = useDeleteAssetMutation();
  const languageNames = useMemo(() => new Intl.DisplayNames([locale], { type: 'language' }), [locale]);
  useDocumentTitle(asset?.title);

  if (isLoading) return <Spinner label={t('common:actions.loading')} />;
  if (isError || !asset || !user) {
    return (
      <div className="l-page">
        <EmptyState
          icon={<FileSearch />}
          title={t('common:errors.notFoundOrNoAccess')}
          action={<ButtonLink to={libraryReturnTo()} icon={<ArrowLeft className="u-flip-rtl" />}>{t('detail.back')}</ButtonLink>}
        />
      </div>
    );
  }

  const category = byId[asset.category];
  const source = SOURCES_BY_ID[asset.sourceSystem];
  const parent = asset.parentId ? assets.find((a) => a.id === asset.parentId) : undefined;
  const variants = assets.filter((a) => a.parentId === asset.id);
  const access = explainAccess(user, asset);

  const runDownload = async (fileId?: string) => {
    try {
      const { fileName } = await download({ id: asset.id, fileId }).unwrap();
      toast.info(t('common:toast.downloadStarted', { name: fileName }));
    } catch (error) {
      toast.error(error);
    }
  };

  const runValidate = async () => {
    try {
      const result = await validate(asset.id).unwrap();
      toast.info(t('common:toast.validated', { result: t(`validation:overall.${result.validation?.overall ?? 'pass'}`) }));
    } catch (error) {
      toast.error(error);
    }
  };

  const runSubmit = async () => {
    try {
      await submit(asset.id).unwrap();
      toast.success(t('common:toast.submitted'));
    } catch (error) {
      toast.error(error);
    }
  };

  const runMigrate = async () => {
    try {
      await migrate(asset.id).unwrap();
      toast.success(t('common:toast.migrated'));
    } catch (error) {
      toast.error(error);
    }
  };

  const runDelete = async () => {
    try {
      const removed = await remove(asset.id).unwrap();
      toast.success(t('common:toast.deleted', { title: removed.title }));
      navigate(libraryReturnTo());
    } catch (error) {
      toast.error(error);
    }
  };

  const downloadable = canDownload(user, asset);
  const submittable = canSubmit(user, asset);
  const editable = canEdit(user, asset);

  return (
    <div className="l-page">
      <header className={styles.header}>
        <div className={styles.badges}>
          <CategoryBadge categoryId={asset.category} />
          <StatusBadge status={asset.status} />
          <ClassificationBadge classification={asset.classification} />
        </div>
        <h1 className={styles.title} dir="auto">
          {asset.title}
        </h1>
        {asset.description && <p className={styles.description}>{asset.description}</p>}

        <div className={styles.actions}>
          {downloadable ? (
            asset.files.length > 1 ? (
              <Popover
                align="start"
                label={t('actions.download')}
                trigger={(props) => (
                  <Button {...props} variant="primary" icon={<Download />} loading={downloading}>
                    {t('actions.download')}
                  </Button>
                )}
              >
                {(close) => (
                  <ul role="list" className={styles.menu}>
                    <li>
                      <button type="button" className={styles.menuItem} onClick={() => (close(), runDownload())}>
                        <Download aria-hidden="true" />
                        {t('actions.downloadBundle')}
                      </button>
                    </li>
                    {asset.files.map((file) => (
                      <li key={file.id}>
                        <button type="button" className={styles.menuItem} onClick={() => (close(), runDownload(file.id))}>
                          <span className={styles.menuRole}>{t(`detail.role.${file.role}`)}</span>
                          <span className="u-truncate" dir="ltr">
                            {file.name}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Popover>
            ) : (
              <Button variant="primary" icon={<Download />} onClick={() => runDownload()} loading={downloading}>
                {t('actions.download')}
              </Button>
            )
          ) : (
            asset.status === 'expired' && <p className={styles.blocked}>{t('actions.downloadExpired')}</p>
          )}
          {canGenerate(user, asset) && (
            <ButtonLink to={`/generate?asset=${asset.id}`} icon={<Sparkles />}>
              {t('actions.generate')}
            </ButtonLink>
          )}
          {editable && (
            <Button icon={<Pencil />} onClick={() => setEditing(true)}>
              {t('actions.edit')}
            </Button>
          )}
          {canValidate(user, asset) && (
            <Button icon={<ShieldCheck />} onClick={runValidate} loading={validating}>
              {t('actions.validate')}
            </Button>
          )}
          {editable && (asset.status === 'draft' || asset.status === 'rejected') && (
            <Button icon={<Send className="u-flip-rtl" />} onClick={runSubmit} loading={submitting} disabled={!submittable} title={submittable ? undefined : t('actions.submitHint')}>
              {t('actions.submit')}
            </Button>
          )}
          {canMigrate(user, asset) && (
            <Button icon={<CloudDownload />} onClick={runMigrate} loading={migrating}>
              {t('actions.migrate')}
            </Button>
          )}
          {canApprove(user, asset) && <ApprovalActions asset={asset} />}
          {editable && (
            <Button className={styles.deleteAction} variant="danger" icon={<Trash2 />} onClick={() => setConfirmingDelete(true)}>
              {t('actions.delete')}
            </Button>
          )}
        </div>
      </header>

      {asset.migrationStatus === 'linked' && (
        <p className={styles.linked} role="note">
          <Link2 aria-hidden="true" />
          <span>
            {t('detail.linkedNotice', { source: source?.name ?? asset.sourceSystem })}
            {asset.sourcePath && (
              <code className={styles.path} dir="ltr">
                {asset.sourcePath}
              </code>
            )}
          </span>
        </p>
      )}

      <div className={styles.layout}>
        <div className={styles.main}>
          <Card title={t('detail.preview')}>
            <AssetPreview asset={asset} />
          </Card>
          <Card title={t('validation:title')}>
            <ValidationReport report={asset.validation} />
          </Card>
        </div>

        <div className={styles.side}>
          <Card title={t('detail.details')}>
            <DetailList
              rows={[
                { label: t('detail.category'), value: categoryLabel(asset.category) },
                { label: t('detail.format'), value: formatLabel(asset.format) },
                { label: t('detail.region'), value: t(`common:region.${asset.region}`) },
                { label: t('detail.locale'), value: `${languageNames.of(asset.locale) ?? asset.locale} (${asset.locale})` },
                { label: t('detail.businessUnit'), value: asset.businessUnit },
                ...(asset.campaign ? [{ label: t('detail.campaign'), value: asset.campaign }] : []),
                {
                  label: t('detail.tags'),
                  value: (
                    <span className={styles.tags}>
                      {asset.tags.map((tag) => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                    </span>
                  ),
                },
                { label: t('detail.source'), value: source?.name ?? asset.sourceSystem },
                { label: t('detail.migration'), value: t(`common:migration.${asset.migrationStatus}`) },
                ...(asset.rightsExpiry ? [{ label: t('detail.rightsExpiry'), value: formatDate(asset.rightsExpiry) }] : []),
                { label: t('detail.owner'), value: directoryName(asset.ownerId) },
                { label: t('detail.created'), value: formatDateTime(asset.createdAt) },
                { label: t('detail.updated'), value: formatDateTime(asset.updatedAt) },
              ]}
            />
            {category && category.metadataSchema.length > 0 && (
              <>
                <h3 className={styles.subheading}>{t('add.categoryFields', { category: categoryLabel(category) })}</h3>
                <MetadataView fields={category.metadataSchema} values={asset.categoryMetadata} />
              </>
            )}
          </Card>

          <Card title={t('detail.access')}>
            <DetailList
              rows={[
                { label: t('detail.classification'), value: <ClassificationBadge classification={asset.classification} /> },
                {
                  label: t('detail.sharedWith'),
                  value: (
                    <ul role="list" className={styles.groupList}>
                      {asset.accessGroups.map((g) => (
                        <li key={g} className={access.matchedGroups.includes(g) ? styles.groupMatched : undefined}>
                          {groupName(g)}
                        </li>
                      ))}
                    </ul>
                  ),
                },
              ]}
            />
            <p className={styles.accessNote}>{t('detail.youHaveAccess', { groups: access.matchedGroups.map(groupName).join(', ') })}</p>
          </Card>

          {(asset.approval || asset.submittedAt) && (
            <Card title={t('detail.approval')}>
              {asset.submittedAt && asset.status === 'pending_approval' && (
                <p className="u-small">{t('detail.submitted', { name: directoryName(asset.submittedBy ?? asset.ownerId), date: formatDate(asset.submittedAt) })}</p>
              )}
              {asset.approval && (
                <>
                  <p className="u-small">
                    {t('detail.decision', {
                      decision: t(`common:status.${asset.approval.decision}`),
                      name: asset.approval.byName,
                      date: formatDate(asset.approval.at),
                    })}
                  </p>
                  {asset.approval.comment && <blockquote className={styles.comment}>{asset.approval.comment}</blockquote>}
                </>
              )}
            </Card>
          )}

          <Card title={t('detail.lineage')}>
            {parent && (
              <p className={styles.lineageRow}>
                <GitBranch aria-hidden="true" />
                <span>
                  {t('detail.parent')}: <Link to={`/assets/${parent.id}`}>{parent.title}</Link>
                </span>
              </p>
            )}
            <h3 className={styles.subheading}>{t('detail.variants')}</h3>
            {variants.length === 0 ? (
              <p className="u-small u-muted">{t('detail.noVariants')}</p>
            ) : (
              <ul role="list" className={styles.variantList}>
                {variants.map((v) => (
                  <li key={v.id}>
                    <Link to={`/assets/${v.id}`}>{v.title}</Link>
                    <StatusBadge status={v.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {editing && <EditAssetDialog asset={asset} user={user} open={editing} onClose={() => setEditing(false)} />}
      <Dialog
        open={confirmingDelete}
        onClose={() => {
          if (!deleting) setConfirmingDelete(false);
        }}
        title={t('delete.title')}
        footer={
          <>
            <Button onClick={() => setConfirmingDelete(false)} disabled={deleting}>
              {t('common:actions.cancel')}
            </Button>
            <Button variant="danger" icon={<Trash2 />} onClick={runDelete} loading={deleting}>
              {t('delete.confirm')}
            </Button>
          </>
        }
      >
        <p>{t('delete.body', { title: asset.title })}</p>
      </Dialog>
    </div>
  );
}
