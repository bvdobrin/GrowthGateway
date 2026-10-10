import type { AssetFormat } from '@/types';

export interface FormatDefinition {
  id: AssetFormat;
  icon: string;
  mimes: string[];
  extensions: string[];
}

export const FORMATS: Record<AssetFormat, FormatDefinition> = {
  image: {
    id: 'image',
    icon: 'Image',
    mimes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif', 'image/tiff'],
    extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'avif', 'tif', 'tiff', 'heic'],
  },
  video: {
    id: 'video',
    icon: 'Video',
    mimes: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'],
    extensions: ['mp4', 'mov', 'webm', 'm4v'],
  },
  audio: {
    id: 'audio',
    icon: 'Music',
    mimes: ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/ogg', 'audio/x-m4a'],
    extensions: ['mp3', 'wav', 'm4a', 'ogg', 'aac'],
  },
  document: {
    id: 'document',
    icon: 'FileText',
    mimes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/rtf',
    ],
    extensions: ['pdf', 'doc', 'docx', 'rtf', 'odt'],
  },
  presentation: {
    id: 'presentation',
    icon: 'Presentation',
    mimes: [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.apple.keynote',
    ],
    extensions: ['ppt', 'pptx', 'key', 'odp'],
  },
  spreadsheet: {
    id: 'spreadsheet',
    icon: 'FileSpreadsheet',
    mimes: [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    extensions: ['csv', 'xls', 'xlsx', 'ods'],
  },
  design: {
    id: 'design',
    icon: 'PenTool',
    mimes: [
      'application/postscript',
      'application/illustrator',
      'image/vnd.adobe.photoshop',
      'application/x-indesign',
      'application/x-figma',
    ],
    extensions: ['ai', 'psd', 'indd', 'eps', 'fig', 'sketch', 'xd'],
  },
  text: {
    id: 'text',
    icon: 'FileType',
    mimes: ['text/plain', 'text/markdown', 'text/vtt'],
    extensions: ['txt', 'md', 'markdown', 'vtt', 'srt'],
  },
  html: {
    id: 'html',
    icon: 'Code2',
    mimes: ['text/html'],
    extensions: ['html', 'htm'],
  },
  archive: {
    id: 'archive',
    icon: 'Archive',
    mimes: ['application/zip', 'application/x-zip-compressed', 'application/x-7z-compressed', 'application/gzip'],
    extensions: ['zip', '7z', 'tar', 'gz'],
  },
  bundle: {
    id: 'bundle',
    icon: 'Layers',
    mimes: [],
    extensions: [],
  },
};

export const FORMAT_IDS = Object.keys(FORMATS) as AssetFormat[];

const extensionOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';

/** Detects the single-file format from extension first (design files rarely carry a useful MIME type). */
export function detectFormat(mime: string, name: string): AssetFormat | undefined {
  const ext = extensionOf(name);
  const byExt = FORMAT_IDS.find((id) => FORMATS[id].extensions.includes(ext));
  if (byExt) return byExt;
  const byMime = FORMAT_IDS.find((id) => FORMATS[id].mimes.includes(mime));
  if (byMime) return byMime;
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('text/')) return 'text';
  return undefined;
}

export function fileMatchesFormat(mime: string, name: string, format: AssetFormat): boolean {
  if (format === 'bundle') return true;
  return detectFormat(mime, name) === format;
}

const MIME_BY_EXT: Record<string, string> = {
  md: 'text/markdown',
  txt: 'text/plain',
  vtt: 'text/vtt',
  html: 'text/html',
  svg: 'image/svg+xml',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  ai: 'application/illustrator',
  psd: 'image/vnd.adobe.photoshop',
  indd: 'application/x-indesign',
  eps: 'application/postscript',
  zip: 'application/zip',
};

export const mimeForName = (name: string) => MIME_BY_EXT[extensionOf(name)] ?? 'application/octet-stream';

/** Files whose content can be held inline (and edited) instead of as a binary. */
export const isTextMime = (mime: string) =>
  mime.startsWith('text/') || mime === 'image/svg+xml' || mime === 'application/json';
