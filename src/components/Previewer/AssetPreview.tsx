import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PREVIEWERS } from '@/config/taxonomy/previewers';
import { detectFormat } from '@/config/taxonomy/formats';
import type { Asset, AssetFile } from '@/types';
import { Tabs } from '../Tabs/Tabs';
import styles from './Previewer.module.css';

function FilePreview({ asset, file }: { asset: Asset; file: AssetFile }) {
  const format = detectFormat(file.mime, file.name) ?? 'document';
  const Preview = PREVIEWERS[format === 'bundle' ? 'document' : format];
  return <Preview asset={asset} file={file} />;
}

/** Picks the previewer for the asset's format; bundles get one tab per file. */
export function AssetPreview({ asset }: { asset: Asset }) {
  const { t } = useTranslation('asset');
  const primary = asset.files.find((f) => f.role === 'primary') ?? asset.files[0];
  const [active, setActive] = useState(primary?.id ?? '');

  if (!primary) return null;

  if (asset.format !== 'bundle') {
    const Preview = PREVIEWERS[asset.format];
    return (
      <div className={styles.preview}>
        <Preview asset={asset} file={primary} />
      </div>
    );
  }

  return (
    <div className={styles.preview}>
      <Tabs
        label={t('detail.files')}
        value={active}
        onChange={setActive}
        items={asset.files.map((file) => ({
          id: file.id,
          label: (
            <span className={styles.tabLabel}>
              <span>{t(`detail.role.${file.role}`)}</span>
              <span className={styles.tabFile} dir="ltr">
                {file.name}
              </span>
            </span>
          ),
          panel: <FilePreview asset={asset} file={file} />,
        }))}
      />
    </div>
  );
}
