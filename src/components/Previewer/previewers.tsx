import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MarkdownView } from '@/components/MarkdownView/MarkdownView';
import { useFileContent } from '@/hooks/useFileContent';
import { useFormatters } from '@/hooks/useFormatters';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import { svgArtwork, svgToDataUrl } from '@/lib/svgThumbnail';
import type { Asset, AssetFile, AssetFormat } from '@/types';
import styles from './Previewer.module.css';

export interface PreviewProps {
  asset: Asset;
  file: AssetFile;
}

function useArtwork(asset: Asset, file: AssetFile, format: AssetFormat) {
  const { byId, categoryLabel } = useTaxonomy();
  const category = byId[asset.category];
  return useMemo(() => {
    const ratio = file.width && file.height ? file.height / file.width : 9 / 16;
    const width = 960;
    return svgToDataUrl(
      svgArtwork({
        title: asset.title,
        subtitle: category ? categoryLabel(category) : undefined,
        format,
        colorToken: category?.colorToken ?? 'color-group-custom',
        width,
        height: Math.round(Math.min(Math.max(width * ratio, 320), 1280)),
      }),
    );
  }, [asset.title, category, categoryLabel, file.width, file.height, format]);
}

function MockNote({ children }: { children: string }) {
  return <p className={styles.note}>{children}</p>;
}

function FileFacts({ file }: { file: AssetFile }) {
  const { formatBytes, formatDuration, formatNumber } = useFormatters();
  return (
    <p className={styles.facts}>
      <span className={styles.fileName} dir="ltr">
        {file.name}
      </span>
      <span>{formatBytes(file.sizeBytes)}</span>
      {file.width && file.height && (
        <span>
          {formatNumber(file.width)} × {formatNumber(file.height)}
        </span>
      )}
      {file.durationSec !== undefined && <span>{formatDuration(file.durationSec)}</span>}
    </p>
  );
}

export function ImagePreview({ asset, file }: PreviewProps) {
  const loaded = useFileContent(asset, file);
  const artwork = useArtwork(asset, file, 'image');
  const alt = typeof asset.categoryMetadata.altText === 'string' ? asset.categoryMetadata.altText : asset.title;
  return (
    <figure className={styles.figure}>
      <img className={styles.image} src={loaded.url ?? artwork} alt={alt} />
      <figcaption>
        <FileFacts file={file} />
      </figcaption>
    </figure>
  );
}

export function VideoPreview({ asset, file }: PreviewProps) {
  const { t } = useTranslation('asset');
  const loaded = useFileContent(asset, file);
  const captionsFile = asset.files.find((f) => f.role === 'captions');
  const captions = useFileContent(captionsFile ? asset : undefined, captionsFile);
  const posterFile = asset.files.find((f) => f.role === 'thumbnail');
  const poster = useFileContent(posterFile ? asset : undefined, posterFile);
  const artwork = useArtwork(asset, file, 'video');

  if (loaded.url) {
    return (
      <figure className={styles.figure}>
        <video className={styles.media} controls preload="metadata" src={loaded.url} poster={poster.url}>
          {captions.url && <track kind="captions" src={captions.url} srcLang={asset.locale.slice(0, 2)} label={asset.locale} default />}
        </video>
        <figcaption>
          <FileFacts file={file} />
        </figcaption>
      </figure>
    );
  }
  return (
    <figure className={styles.figure}>
      <img className={styles.image} src={poster.url ?? artwork} alt="" />
      <figcaption>
        <FileFacts file={file} />
        <MockNote>{t('detail.mockMedia')}</MockNote>
        {captions.content?.text && <CaptionsList text={captions.content.text} />}
      </figcaption>
    </figure>
  );
}

function CaptionsList({ text }: { text: string }) {
  const cues = text
    .split(/\n\n+/)
    .map((block) => block.split('\n').filter((l) => l && !/^\d+$/.test(l) && !l.startsWith('WEBVTT')))
    .filter((lines) => lines.length >= 2)
    .map(([time, ...rest]) => ({ time: time.split(' --> ')[0].replace(/^00:/, '').replace(/\.000$/, ''), text: rest.join(' ') }));
  return (
    <ol className={styles.cues}>
      {cues.map((cue, i) => (
        <li key={i}>
          <span className={styles.cueTime}>{cue.time}</span>
          <span>{cue.text}</span>
        </li>
      ))}
    </ol>
  );
}

export function AudioPreview({ asset, file }: PreviewProps) {
  const { t } = useTranslation('asset');
  const loaded = useFileContent(asset, file);
  const artwork = useArtwork(asset, { ...file, width: 960, height: 320 }, 'audio');
  return (
    <figure className={styles.figure}>
      <img className={styles.image} src={artwork} alt="" />
      {loaded.url ? <audio className={styles.audio} controls src={loaded.url} /> : <MockNote>{t('detail.mockMedia')}</MockNote>}
      <figcaption>
        <FileFacts file={file} />
      </figcaption>
    </figure>
  );
}

export function TextPreview({ asset, file }: PreviewProps) {
  const loaded = useFileContent(asset, file);
  const text = loaded.content?.text;
  if (!text) return <OfficePreview asset={asset} file={file} />;
  return (
    <div className={styles.textFrame} dir="auto" lang={asset.locale}>
      {file.mime === 'text/vtt' ? (
        <CaptionsList text={text} />
      ) : file.mime === 'text/plain' ? (
        <pre className={styles.pre}>{text}</pre>
      ) : (
        <MarkdownView source={text} />
      )}
    </div>
  );
}

export function HtmlPreview({ asset, file }: PreviewProps) {
  const loaded = useFileContent(asset, file);
  const html = loaded.content?.text;
  if (!html) return <OfficePreview asset={asset} file={file} />;
  return (
    <iframe
      className={styles.htmlFrame}
      title={file.name}
      sandbox=""
      srcDoc={html.replace('<html>', `<html lang="${asset.locale}" dir="auto">`)}
      referrerPolicy="no-referrer"
    />
  );
}

export function PdfPreview({ asset, file }: PreviewProps) {
  const loaded = useFileContent(asset, file);
  if (loaded.url && file.mime === 'application/pdf') {
    return (
      <object className={styles.pdf} data={loaded.url} type="application/pdf" aria-label={file.name}>
        <OfficePreview asset={asset} file={file} />
      </object>
    );
  }
  return <OfficePreview asset={asset} file={file} />;
}

/** Office, design and archive files: no in-browser rendering in the MVP. */
export function OfficePreview({ asset, file }: PreviewProps) {
  const { t } = useTranslation('asset');
  const artwork = useArtwork(asset, { ...file, width: 960, height: 540 }, asset.format === 'bundle' ? 'document' : asset.format);
  return (
    <figure className={styles.figure}>
      <img className={styles.image} src={artwork} alt="" />
      <figcaption>
        <FileFacts file={file} />
        <MockNote>{t('detail.noPreview')}</MockNote>
      </figcaption>
    </figure>
  );
}
