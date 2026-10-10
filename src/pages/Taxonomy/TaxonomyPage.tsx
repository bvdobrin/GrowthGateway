import { useState, type CSSProperties } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/Badge/Badge';
import { Button } from '@/components/Button/Button';
import { Checkbox, Field, Fieldset } from '@/components/Field/Field';
import { Icon } from '@/components/Icon/Icon';
import { Card, PageHeader } from '@/components/PageHeader/PageHeader';
import { CUSTOM_CATEGORY_ICONS } from '@/config/taxonomy/categories';
import { FORMAT_IDS } from '@/config/taxonomy/formats';
import { GENERATORS } from '@/config/taxonomy/generators';
import { useDocumentTitle, useToast } from '@/hooks/useAppHelpers';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import { GLOBAL_RULE_IDS } from '@/lib/validation/registry';
import { CATEGORY_UPLOAD_POLICY, EXTERNAL_UPLOAD_GROUPS, groupName } from '@/services/iamService';
import { useCreateCategoryMutation } from '@/store/damApi';
import {
  CATEGORY_GROUPS,
  CLASSIFICATIONS,
  type AssetFormat,
  type CategoryDefinition,
  type CategoryGroup,
  type Classification,
  type MetadataField,
  type MetadataFieldKind,
} from '@/types';
import styles from './TaxonomyPage.module.css';

const KINDS: MetadataFieldKind[] = ['text', 'longtext', 'date', 'datetime', 'select', 'multiselect', 'people', 'url', 'number', 'boolean'];
const GLOBAL_GENERATORS = GENERATORS.filter((g) => g.global).map((g) => g.id);

interface DraftField extends MetadataField {
  optionsText: string;
}

const emptyField = (): DraftField => ({ key: '', label: '', kind: 'text', optionsText: '' });

function CategoryCard({ category }: { category: CategoryDefinition }) {
  const { t } = useTranslation(['taxonomy', 'validation', 'asset']);
  const { categoryLabel, groupLabel, formatLabel, fieldLabel } = useTaxonomy();
  const restrictedTo = CATEGORY_UPLOAD_POLICY[category.id];
  return (
    <details className={styles.category} style={{ '--category-color': `var(--${category.colorToken})` } as CSSProperties}>
      <summary className={styles.summary}>
        <span className={styles.icon} aria-hidden="true">
          <Icon name={category.icon} />
        </span>
        <span className={styles.summaryText}>
          <span className={styles.name}>{categoryLabel(category)}</span>
          <span className={styles.formats}>{category.allowedFormats.map(formatLabel).join(' · ')}</span>
        </span>
        <span className={styles.summaryBadges}>
          <Badge>{groupLabel(category.group)}</Badge>
          {category.custom && <Badge colorToken="color-accent-default">{t('page.custom')}</Badge>}
        </span>
      </summary>
      <div className={styles.details}>
        {category.authorable && <p className="u-small">{t('page.authorable')}</p>}
        {restrictedTo && <p className="u-small u-muted">{t('page.uploadRestricted', { groups: restrictedTo.map(groupName).join(', ') })}</p>}
        <div className={styles.columns}>
          <section>
            <h3 className={styles.heading}>{t('page.fields')}</h3>
            {category.metadataSchema.length === 0 ? (
              <p className="u-small u-muted">{t('page.noFields')}</p>
            ) : (
              <ul role="list" className={styles.list}>
                {category.metadataSchema.map((field) => (
                  <li key={field.key}>
                    <span>{fieldLabel(field)}</span>
                    <span className={styles.meta}>
                      {t(`kind.${field.kind}`)}
                      {field.required && ` · ${t('page.required')}`}
                      {field.facet && ` · ${t('page.facet')}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h3 className={styles.heading}>{t('page.rules')}</h3>
            {category.validationRuleIds.length === 0 ? (
              <p className="u-small u-muted">{t('page.noRules')}</p>
            ) : (
              <ul role="list" className={styles.list}>
                {category.validationRuleIds.map((id) => (
                  <li key={id}>{t(`validation:rules.${id}`)}</li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h3 className={styles.heading}>{t('page.generators')}</h3>
            {category.generatorIds.length === 0 ? (
              <p className="u-small u-muted">{t('page.noGenerators')}</p>
            ) : (
              <ul role="list" className={styles.list}>
                {category.generatorIds.map((id) => (
                  <li key={id}>{t(`asset:generators.${id}.label`)}</li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </details>
  );
}

function NewCategoryForm() {
  const { t } = useTranslation(['taxonomy', 'common']);
  const toast = useToast();
  const { groupLabel, formatLabel } = useTaxonomy();
  const [create, { isLoading }] = useCreateCategoryMutation();
  const [label, setLabel] = useState('');
  const [group, setGroup] = useState<CategoryGroup>('Custom');
  const [icon, setIcon] = useState(CUSTOM_CATEGORY_ICONS[0]);
  const [formats, setFormats] = useState<AssetFormat[]>(['document']);
  const [classification, setClassification] = useState<Classification | ''>('');
  const [authorable, setAuthorable] = useState(false);
  const [fields, setFields] = useState<DraftField[]>([emptyField()]);
  const [submitted, setSubmitted] = useState(false);

  const errors = {
    label: label.trim().length < 3 ? t('page.errors.label') : undefined,
    formats: formats.length === 0 ? t('page.errors.formats') : undefined,
  };

  const updateField = (index: number, patch: Partial<DraftField>) => setFields((list) => list.map((f, i) => (i === index ? { ...f, ...patch } : f)));

  const submit = async () => {
    setSubmitted(true);
    if (errors.label || errors.formats) return;
    try {
      const created = await create({
        label,
        group,
        icon,
        allowedFormats: formats,
        defaultClassification: classification || undefined,
        authorable,
        metadataSchema: fields
          .filter((f) => f.label.trim())
          .map(({ optionsText, ...field }) => ({
            ...field,
            options: field.kind === 'select' || field.kind === 'multiselect' ? optionsText.split(',').map((o) => o.trim()).filter(Boolean) : undefined,
          })),
      }).unwrap();
      toast.success(t('common:toast.categoryCreated', { label: created.label }));
      setLabel('');
      setFields([emptyField()]);
      setSubmitted(false);
    } catch (error) {
      toast.error(error);
    }
  };

  return (
    <Card title={t('page.addTitle')} className={styles.form}>
      <p className="u-small u-muted">{t('page.addHint')}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        noValidate
        className={styles.formBody}
      >
        <div className="l-form-grid">
          <Field label={t('page.label')} required error={submitted ? errors.label : undefined}>
            {(props) => <input {...props} value={label} onChange={(e) => setLabel(e.target.value)} />}
          </Field>
          <Field label={t('page.groupLabel')}>
            {(props) => (
              <select {...props} value={group} onChange={(e) => setGroup(e.target.value as CategoryGroup)}>
                {CATEGORY_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {groupLabel(g)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Fieldset legend={t('page.icon')} className="l-span-full">
            <div className={styles.icons} role="radiogroup">
              {CUSTOM_CATEGORY_ICONS.map((name) => (
                <label key={name} className={styles.iconOption} title={name}>
                  <input type="radio" name="category-icon" className="u-visually-hidden" checked={icon === name} onChange={() => setIcon(name)} />
                  <Icon name={name} />
                  <span className="u-visually-hidden">{name}</span>
                </label>
              ))}
            </div>
          </Fieldset>
          <Fieldset legend={t('page.allowedFormats')} error={submitted ? errors.formats : undefined} className="l-span-full">
            <div className={styles.checkGrid}>
              {FORMAT_IDS.map((format) => (
                <Checkbox
                  key={format}
                  label={formatLabel(format)}
                  checked={formats.includes(format)}
                  onChange={() => setFormats((list) => (list.includes(format) ? list.filter((f) => f !== format) : [...list, format]))}
                />
              ))}
            </div>
          </Fieldset>
          <Field label={t('page.defaultClassification')}>
            {(props) => (
              <select {...props} value={classification} onChange={(e) => setClassification(e.target.value as Classification | '')}>
                <option value="">{t('common:none')}</option>
                {CLASSIFICATIONS.map((c) => (
                  <option key={c} value={c}>
                    {t(`common:classification.${c}`)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <div className={styles.authorable}>
            <Checkbox
              label={t('page.authorableLabel')}
              checked={authorable}
              disabled={!formats.some((f) => f === 'text' || f === 'html')}
              onChange={(e) => setAuthorable(e.target.checked)}
            />
          </div>
        </div>

        <Fieldset legend={t('page.fieldsTitle')}>
          <ul role="list" className={styles.fieldRows}>
            {fields.map((field, index) => (
              <li key={index} className={styles.fieldRow}>
                <Field label={t('page.fieldLabel')}>
                  {(props) => <input {...props} value={field.label} onChange={(e) => updateField(index, { label: e.target.value })} />}
                </Field>
                <Field label={t('page.fieldKind')}>
                  {(props) => (
                    <select {...props} value={field.kind} onChange={(e) => updateField(index, { kind: e.target.value as MetadataFieldKind })}>
                      {KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {t(`kind.${kind}`)}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                {(field.kind === 'select' || field.kind === 'multiselect') && (
                  <Field label={t('page.fieldOptions')} className={styles.fieldOptions}>
                    {(props) => <input {...props} value={field.optionsText} onChange={(e) => updateField(index, { optionsText: e.target.value })} />}
                  </Field>
                )}
                <div className={styles.fieldFlags}>
                  <Checkbox label={t('page.fieldRequired')} checked={!!field.required} onChange={(e) => updateField(index, { required: e.target.checked })} />
                  <Checkbox label={t('page.fieldFacet')} checked={!!field.facet} onChange={(e) => updateField(index, { facet: e.target.checked })} />
                  <Button variant="ghost" size="sm" iconOnly icon={<Trash2 />} onClick={() => setFields((list) => list.filter((_, i) => i !== index))}>
                    {t('page.removeField')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <Button size="sm" icon={<Plus />} onClick={() => setFields((list) => [...list, emptyField()])}>
            {t('page.addField')}
          </Button>
        </Fieldset>

        <div className={styles.formFooter}>
          <Button type="submit" variant="primary" loading={isLoading}>
            {t('page.create')}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function TaxonomyPage() {
  const { t } = useTranslation(['taxonomy', 'validation', 'asset']);
  const { categories, groupLabel } = useTaxonomy();
  useDocumentTitle(t('title'));

  return (
    <div className="l-page">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <div className={styles.layout}>
        <div className={styles.groups}>
          <p className={styles.globals}>
            <strong className={styles.globalsTitle}>{t('page.globalTitle')}</strong>
            <br />
            <strong>{t('page.rules')}:</strong> {GLOBAL_RULE_IDS.map((id) => t(`validation:rules.${id}`)).join(', ')}
            <br />
            <strong>{t('page.generators')}:</strong> {GLOBAL_GENERATORS.map((id) => t(`asset:generators.${id}.label`)).join(', ')}
            <br />
            <span className="u-muted">
              {t('page.externalUploads', { group: groupName('CG-Agency-External'), groups: EXTERNAL_UPLOAD_GROUPS.map(groupLabel).join(', ') })}
            </span>
          </p>
          {CATEGORY_GROUPS.map((group) => {
            const groupCategories = categories.filter((c) => c.group === group);
            if (!groupCategories.length) return null;
            return (
              <section key={group} className={styles.group} aria-labelledby={`group-${group}`}>
                <h2 id={`group-${group}`} className={styles.groupTitle}>
                  {groupLabel(group)}
                </h2>
                <div className={styles.categoryList}>
                  {groupCategories.map((category) => (
                    <CategoryCard key={category.id} category={category} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
        <NewCategoryForm />
      </div>
    </div>
  );
}
