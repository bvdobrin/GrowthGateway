import { useMemo } from 'react';
import { useFileContent } from '@/hooks/useFileContent';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import { svgArtwork, svgToDataUrl } from '@/lib/svgThumbnail';
import type { Asset, AssetFile } from '@/types';
import styles from './AssetThumbnail.module.css';

/** The file that best represents the asset visually, when it has real image content. */
const visualFile = (asset: Asset): AssetFile | undefined =>
  asset.files.find((f) => f.role === 'thumbnail' && (f.text || f.blobKey)) ??
  asset.files.find((f) => f.role === 'primary' && f.mime.startsWith('image/') && (f.text || f.blobKey));

export function AssetThumbnail({ asset, className }: { asset: Asset; className?: string }) {
  const { byId, categoryLabel } = useTaxonomy();
  const category = byId[asset.category];
  const file = visualFile(asset);
  const loaded = useFileContent(file ? asset : undefined, file);

  const artwork = useMemo(
    () =>
      svgToDataUrl(
        svgArtwork({
          title: asset.title,
          subtitle: category ? categoryLabel(category) : undefined,
          format: asset.format,
          colorToken: category?.colorToken ?? 'color-group-custom',
          width: 480,
          height: 300,
        }),
      ),
    [asset.title, asset.format, category, categoryLabel],
  );

  return (
    <img
      className={[styles.thumbnail, className].filter(Boolean).join(' ')}
      src={loaded.url ?? artwork}
      alt=""
      loading="lazy"
      decoding="async"
      width={480}
      height={300}
    />
  );
}
