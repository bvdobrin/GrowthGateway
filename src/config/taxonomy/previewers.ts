import type { ComponentType } from 'react';
import {
  AudioPreview,
  HtmlPreview,
  ImagePreview,
  OfficePreview,
  PdfPreview,
  TextPreview,
  VideoPreview,
  type PreviewProps,
} from '@/components/Previewer/previewers';
import type { AssetFormat } from '@/types';

/** Format → previewer. Bundles render a tab per file, each using this map. */
export const PREVIEWERS: Record<Exclude<AssetFormat, 'bundle'>, ComponentType<PreviewProps>> = {
  image: ImagePreview,
  video: VideoPreview,
  audio: AudioPreview,
  document: PdfPreview,
  presentation: OfficePreview,
  spreadsheet: OfficePreview,
  design: OfficePreview,
  text: TextPreview,
  html: HtmlPreview,
  archive: OfficePreview,
};
