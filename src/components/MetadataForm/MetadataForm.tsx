import { useTranslation } from 'react-i18next';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import type { MetadataField, MetadataValue } from '@/types';
import { Checkbox, Field, Fieldset } from '../Field/Field';
import styles from './MetadataForm.module.css';

const toList = (value: string) =>
  value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

interface MetadataFormProps {
  fields: MetadataField[];
  values: Record<string, MetadataValue>;
  onChange: (key: string, value: MetadataValue) => void;
}

/** Renders a category's `metadataSchema` as form controls. */
export function MetadataForm({ fields, values, onChange }: MetadataFormProps) {
  const { t } = useTranslation('common');
  const { fieldLabel, optionLabel } = useTaxonomy();

  if (fields.length === 0) return null;

  return (
    <div className="l-form-grid">
      {fields.map((field) => {
        const value = values[field.key];
        const label = fieldLabel(field);
        const wide = field.kind === 'longtext' || field.kind === 'multiselect';

        if (field.kind === 'boolean') {
          return (
            <div key={field.key} className={styles.boolean}>
              <Checkbox label={label} checked={value === true} onChange={(e) => onChange(field.key, e.target.checked)} />
            </div>
          );
        }

        if (field.kind === 'multiselect') {
          const selected = Array.isArray(value) ? value : [];
          return (
            <Fieldset key={field.key} legend={label} className="l-span-full">
              <div className={styles.options}>
                {(field.options ?? []).map((option) => (
                  <Checkbox
                    key={option}
                    label={optionLabel(option)}
                    checked={selected.includes(option)}
                    onChange={() =>
                      onChange(field.key, selected.includes(option) ? selected.filter((v) => v !== option) : [...selected, option])
                    }
                  />
                ))}
              </div>
            </Fieldset>
          );
        }

        return (
          <Field
            key={field.key}
            label={label}
            required={field.required}
            hint={field.kind === 'people' ? t('peopleHint') : field.hint}
            className={wide ? 'l-span-full' : undefined}
          >
            {(props) => {
              switch (field.kind) {
                case 'longtext':
                  return <textarea {...props} rows={3} value={String(value ?? '')} onChange={(e) => onChange(field.key, e.target.value)} />;
                case 'select':
                  return (
                    <select {...props} value={String(value ?? '')} onChange={(e) => onChange(field.key, e.target.value || null)}>
                      <option value="">{t('notSet')}</option>
                      {(field.options ?? []).map((option) => (
                        <option key={option} value={option}>
                          {optionLabel(option)}
                        </option>
                      ))}
                    </select>
                  );
                case 'people':
                  return (
                    <input
                      {...props}
                      type="text"
                      value={Array.isArray(value) ? value.join(', ') : String(value ?? '')}
                      onChange={(e) => onChange(field.key, toList(e.target.value))}
                    />
                  );
                case 'number':
                  return (
                    <input
                      {...props}
                      type="number"
                      inputMode="decimal"
                      value={value === null || value === undefined ? '' : String(value)}
                      onChange={(e) => onChange(field.key, e.target.value === '' ? null : Number(e.target.value))}
                    />
                  );
                case 'date':
                  return <input {...props} type="date" value={String(value ?? '')} onChange={(e) => onChange(field.key, e.target.value)} />;
                case 'datetime':
                  return (
                    <input {...props} type="datetime-local" value={String(value ?? '')} onChange={(e) => onChange(field.key, e.target.value)} />
                  );
                case 'url':
                  return (
                    <input {...props} type="url" inputMode="url" dir="ltr" value={String(value ?? '')} onChange={(e) => onChange(field.key, e.target.value)} />
                  );
                default:
                  return <input {...props} type="text" value={String(value ?? '')} onChange={(e) => onChange(field.key, e.target.value)} />;
              }
            }}
          </Field>
        );
      })}
    </div>
  );
}
