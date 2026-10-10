import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { FileUp, Link2, PenLine, Trash2, UploadCloud } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CommonFields, defaultCommonFields } from '@/components/AssetForm/CommonFields';
import { Button } from '@/components/Button/Button';
import { Checkbox, Field, Fieldset } from '@/components/Field/Field';
import { MarkdownView } from '@/components/MarkdownView/MarkdownView';
import { MetadataForm } from '@/components/MetadataForm/MetadataForm';
import { EmptyState, PageHeader, Spinner } from '@/components/PageHeader/PageHeader';
import { Tabs } from '@/components/Tabs/Tabs';
import { useDocumentTitle, useToast } from '@/hooks/useAppHelpers';
import { useFormatters } from '@/hooks/useFormatters';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import { prepareFile, type UploadFileInput } from '@/lib/storage';
import { SOURCES } from '@/mocks/sources';
import type { CommonFields as CommonFieldsValue } from '@/services/assetService';
import { uploadableCategories } from '@/services/iamService';
import { useAuthorAssetMutation, useLinkLegacyAssetMutation, useListRemoteItemsQuery, useUploadAssetsMutation } from '@/store/damApi';
import { useAppSelector } from '@/store/hooks';
import { selectCurrentUser } from '@/store/sessionSlice';
import type { CategoryDefinition, FileRole, MetadataValue, RemoteItem, User } from '@/types';
import { suggestCategory } from './suggestCategory';
import styles from './AddAssetPage.module.css';

type Mode = 'upload' | 'author' | 'link';
const ROLES: FileRole[] = ['primary', 'transcript', 'captions', 'source', 'attachment', 'thumbnail'];
const LEGACY_SOURCES = SOURCES.filter((s) => !s.native);

export function AddAssetPage() {
  const user = useAppSelector(selectCurrentUser);
  const { categories } = useTaxonomy();
  if (!user) return null;
  const allowed = uploadableCategories(user, categories);
  return <AddAssetForm user={user} allowed={allowed} />;
}

function AddAssetForm({ user, allowed }: { user: User; allowed: CategoryDefinition[] }) {
  const { t } = useTranslation(['asset', 'common']);
  const toast = useToast();
  const navigate = useNavigate();
  const { categoryLabel } = useTaxonomy();
  const { formatBytes } = useFormatters();
  useDocumentTitle(t('add.title'));

  const [mode, setMode] = useState<Mode>('upload');
  const [categoryId, setCategoryId] = useState(allowed[0]?.id ?? '');
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [metadata, setMetadata] = useState<Record<string, MetadataValue>>({});
  const [common, setCommon] = useState<CommonFieldsValue>(() => defaultCommonFields(user));
  const [submitted, setSubmitted] = useState(false);

  const [files, setFiles] = useState<UploadFileInput[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [bundle, setBundle] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [body, setBody] = useState('');
  const [bodyFormat, setBodyFormat] = useState<'text' | 'html'>('text');

  const [sourceId, setSourceId] = useState(LEGACY_SOURCES[0].id);
  const [remote, setRemote] = useState<RemoteItem | null>(null);
  const [manualPath, setManualPath] = useState('');
  const [manualName, setManualName] = useState('');
  const remoteItems = useListRemoteItemsQuery(sourceId, { skip: mode !== 'link' });

  const [upload, uploadState] = useUploadAssetsMutation();
  const [author, authorState] = useAuthorAssetMutation();
  const [link, linkState] = useLinkLegacyAssetMutation();
  const saving = uploadState.isLoading || authorState.isLoading || linkState.isLoading;

  const options = useMemo(() => (mode === 'author' ? allowed.filter((c) => c.authorable) : allowed), [allowed, mode]);
  const category = options.find((c) => c.id === categoryId) ?? options[0];

  useEffect(() => {
    if (category && category.id !== categoryId) setCategoryId(category.id);
  }, [category, categoryId]);

  useEffect(() => {
    if (category?.defaultClassification) setCommon((c) => ({ ...c, classification: category.defaultClassification! }));
  }, [category?.id, category?.defaultClassification]);

  const chooseCategory = (id: string) => {
    setCategoryId(id);
    setCategoryTouched(true);
    setMetadata({});
  };

  const suggest = (names: { name: string; mime: string }[]) => {
    if (categoryTouched) return;
    const suggestion = suggestCategory(names, options.map((c) => c.id));
    if (suggestion) setCategoryId(suggestion);
  };

  const addFiles = async (list: FileList | File[]) => {
    const incoming = Array.from(list);
    if (!incoming.length) return;
    setPreparing(true);
    try {
      const prepared = await Promise.all(incoming.map((file) => prepareFile(file, 'attachment')));
      const next = [...files, ...prepared].map((f, i) => ({ ...f, role: i === 0 ? ('primary' as FileRole) : f.role }));
      setFiles(next);
      suggest(next);
      if (next.length > 1 && next.some((f) => /\.(mp4|mov|m4a|mp3|wav)$/i.test(f.name))) setBundle(true);
    } finally {
      setPreparing(false);
    }
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    void addFiles(event.dataTransfer.files);
  };

  if (allowed.length === 0) {
    return (
      <div className="l-page">
        <PageHeader title={t('add.title')} />
        <EmptyState title={t('add.noCategories')} />
      </div>
    );
  }

  const errors = {
    files: mode === 'upload' && files.length === 0 ? t('add.errors.noFiles') : undefined,
    groups: common.accessGroups.length === 0 ? t('add.errors.noGroups') : undefined,
    title: mode === 'author' && !title.trim() ? t('add.errors.noTitle') : undefined,
    body: mode === 'author' && !body.trim() ? t('add.errors.noBody') : undefined,
    link: mode === 'link' && !remote && !(manualPath.trim() && manualName.trim()) ? t('add.errors.noLink') : undefined,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const save = async () => {
    setSubmitted(true);
    if (hasErrors || !category) return;
    const base = { category: category.id, title, description, categoryMetadata: metadata, common };
    try {
      if (mode === 'upload') {
        const created = await upload({ ...base, files, bundle }).unwrap();
        toast.success(t('common:toast.uploaded', { count: created.length }));
        navigate(created.length === 1 ? `/assets/${created[0].id}` : '/assets?sort=newest');
      } else if (mode === 'author') {
        const created = await author({ ...base, title, body, bodyFormat }).unwrap();
        toast.success(t('common:toast.uploaded', { count: 1 }));
        navigate(`/assets/${created.id}`);
      } else {
        const item = remote ?? { sourceId, path: manualPath.trim(), name: manualName.trim(), mime: undefined, sizeBytes: 0 };
        const created = await link({ ...base, sourceId: item.sourceId, path: item.path, name: item.name, mime: item.mime, sizeBytes: item.sizeBytes }).unwrap();
        toast.success(t('common:toast.uploaded', { count: 1 }));
        navigate(`/assets/${created.id}`);
      }
    } catch (error) {
      toast.error(error);
    }
  };

  const show = (error?: string) => (submitted ? error : undefined);

  const uploadPanel = (
    <div className={styles.panel}>
      <div
        className={styles.dropzone}
        data-dragging={dragging || undefined}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <UploadCloud aria-hidden="true" />
        <p>
          {t('add.dropzone')}{' '}
          <button type="button" className={styles.browse} onClick={() => inputRef.current?.click()}>
            {t('add.browse')}
          </button>
        </p>
        <p className={styles.dropHint}>{t('add.dropHint')}</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="u-visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      {preparing && <Spinner label={t('common:actions.loading')} />}
      {show(errors.files) && (
        <p className={styles.error} role="alert">
          {errors.files}
        </p>
      )}
      {files.length > 0 && (
        <Fieldset legend={t('add.selectedFiles')}>
          <ul role="list" className={styles.files}>
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className={styles.file}>
                <FileUp aria-hidden="true" />
                <span className={styles.fileText}>
                  <span className={styles.fileName} dir="ltr">
                    {file.name}
                  </span>
                  <span className={styles.fileMeta}>
                    {formatBytes(file.sizeBytes)}
                    {file.width && file.height ? ` · ${file.width}×${file.height}` : ''}
                  </span>
                </span>
                {bundle && files.length > 1 && (
                  <label className={styles.role}>
                    <span className="u-visually-hidden">{t('add.role')}</span>
                    <select
                      value={file.role}
                      onChange={(e) => setFiles((list) => list.map((f, i) => (i === index ? { ...f, role: e.target.value as FileRole } : f)))}
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {t(`detail.role.${role}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  icon={<Trash2 />}
                  onClick={() => setFiles((list) => list.filter((_, i) => i !== index).map((f, i) => (i === 0 ? { ...f, role: 'primary' } : f)))}
                >
                  {t('common:actions.remove')}
                </Button>
              </li>
            ))}
          </ul>
          {files.length > 1 && <Checkbox label={t('add.bundle')} hint={t('add.bundleHint')} checked={bundle} onChange={(e) => setBundle(e.target.checked)} />}
        </Fieldset>
      )}
    </div>
  );

  const authorPanel =
    options.length === 0 ? (
      <EmptyState title={t('add.notAuthorable')} />
    ) : (
      <div className={styles.panel}>
        <Fieldset legend={t('add.bodyFormat')}>
          <div className={styles.inline}>
            <label className={styles.radio}>
              <input type="radio" name="body-format" checked={bodyFormat === 'text'} onChange={() => setBodyFormat('text')} />
              {t('add.markdown')}
            </label>
            <label className={styles.radio}>
              <input type="radio" name="body-format" checked={bodyFormat === 'html'} onChange={() => setBodyFormat('html')} />
              {t('add.html')}
            </label>
          </div>
        </Fieldset>
        <div className={styles.editor}>
          <Field label={t('add.body')} required error={show(errors.body)}>
            {(props) => (
              <textarea
                {...props}
                rows={14}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className={styles.code}
                dir="auto"
                lang={common.locale}
              />
            )}
          </Field>
          <div className={styles.livePreview}>
            <p className={styles.previewLabel}>{t('add.livePreview')}</p>
            {bodyFormat === 'html' ? (
              <iframe className={styles.previewFrame} title={t('add.livePreview')} sandbox="" srcDoc={body} />
            ) : (
              <div className={styles.previewBox} dir="auto" lang={common.locale}>
                <MarkdownView source={body} />
              </div>
            )}
          </div>
        </div>
      </div>
    );

  const linkPanel = (
    <div className={styles.panel}>
      <Field label={t('add.linkSource')}>
        {(props) => (
          <select
            {...props}
            value={sourceId}
            onChange={(e) => {
              setSourceId(e.target.value);
              setRemote(null);
            }}
          >
            {LEGACY_SOURCES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Fieldset legend={t('add.linkBrowse')} error={show(errors.link)}>
        {remoteItems.isFetching ? (
          <Spinner label={t('common:actions.loading')} />
        ) : (remoteItems.data ?? []).length === 0 ? (
          <p className="u-small u-muted">{t('add.linkEmpty')}</p>
        ) : (
          <ul role="list" className={styles.remoteList}>
            {(remoteItems.data ?? []).map((item) => (
              <li key={item.path}>
                <label className={styles.remote}>
                  <input
                    type="radio"
                    name="remote-item"
                    checked={remote?.path === item.path}
                    onChange={() => {
                      setRemote(item);
                      if (!categoryTouched && options.some((c) => c.id === item.suggestedCategory)) setCategoryId(item.suggestedCategory);
                    }}
                  />
                  <span className={styles.fileText}>
                    <span className={styles.fileName} dir="ltr">
                      {item.path}
                    </span>
                    <span className={styles.fileMeta}>{formatBytes(item.sizeBytes)}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </Fieldset>
      <details className={styles.manual}>
        <summary>{t('add.linkManual')}</summary>
        <div className="l-form-grid">
          <Field label={t('add.linkPath')}>
            {(props) => <input {...props} dir="ltr" value={manualPath} onChange={(e) => (setManualPath(e.target.value), setRemote(null))} />}
          </Field>
          <Field label={t('add.linkName')}>
            {(props) => <input {...props} dir="ltr" value={manualName} onChange={(e) => (setManualName(e.target.value), setRemote(null))} />}
          </Field>
        </div>
      </details>
    </div>
  );

  return (
    <div className="l-page">
      <PageHeader title={t('add.title')} subtitle={t('add.subtitle')} />

      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        noValidate
      >
        <Tabs
          label={t('add.title')}
          value={mode}
          onChange={(id) => setMode(id as Mode)}
          items={[
            { id: 'upload', label: t('add.tabs.upload'), icon: <UploadCloud aria-hidden="true" />, panel: uploadPanel },
            { id: 'author', label: t('add.tabs.author'), icon: <PenLine aria-hidden="true" />, panel: authorPanel },
            { id: 'link', label: t('add.tabs.link'), icon: <Link2 aria-hidden="true" />, panel: linkPanel },
          ]}
        />

        {category && (
          <>
            <section className={styles.section}>
              <div className="l-form-grid">
                <Field
                  label={t('add.category')}
                  hint={!categoryTouched && (files.length > 0 || remote) ? t('add.suggested') : t('add.categoryHint')}
                >
                  {(props) => (
                    <select {...props} value={category.id} onChange={(e) => chooseCategory(e.target.value)}>
                      {options.map((c) => (
                        <option key={c.id} value={c.id}>
                          {categoryLabel(c)}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <Field label={t('add.assetTitle')} hint={mode === 'author' ? undefined : t('add.titleHint')} required={mode === 'author'} error={show(errors.title)}>
                  {(props) => <input {...props} value={title} onChange={(e) => setTitle(e.target.value)} dir="auto" />}
                </Field>
                <Field label={t('add.description')} className="l-span-full">
                  {(props) => <textarea {...props} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} dir="auto" />}
                </Field>
              </div>
            </section>

            {category.metadataSchema.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{t('add.categoryFields', { category: categoryLabel(category) })}</h2>
                <MetadataForm fields={category.metadataSchema} values={metadata} onChange={(key, value) => setMetadata((m) => ({ ...m, [key]: value }))} />
              </section>
            )}

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t('add.common')}</h2>
              <CommonFields
                user={user}
                value={common}
                onChange={(patch) => setCommon((c) => ({ ...c, ...patch }))}
                showSource={mode === 'upload'}
                groupsError={show(errors.groups)}
              />
            </section>
          </>
        )}

        <div className={styles.footer}>
          <Button type="submit" variant="primary" loading={saving} disabled={preparing}>
            {saving ? t('add.saving') : t('add.save')}
          </Button>
        </div>
      </form>
    </div>
  );
}
