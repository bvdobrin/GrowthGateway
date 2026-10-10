import { darkTokens, tokens, type TokenName } from '@/styles/generated/tokens';
import type { AssetFormat } from '@/types';
import { hashString } from './ids';

/** 48x48 glyphs, stroked in white, one per format. */
const GLYPHS: Record<AssetFormat, string> = {
  image: '<rect x="4" y="8" width="40" height="32" rx="4"/><circle cx="16" cy="18" r="4"/><path d="M4 34l12-10 10 8 6-5 12 9"/>',
  video: '<rect x="4" y="10" width="40" height="28" rx="5"/><path d="M20 17l11 7-11 7z"/>',
  audio: '<path d="M8 20v8M15 14v20M22 8v32M29 16v16M36 12v24M43 20v8"/>',
  document: '<path d="M12 4h17l9 9v31H12z"/><path d="M29 4v9h9M18 22h14M18 29h14M18 36h9"/>',
  presentation: '<rect x="4" y="6" width="40" height="28" rx="3"/><path d="M24 34v8M16 42h16M13 26l8-8 6 5 9-9"/>',
  spreadsheet: '<rect x="6" y="6" width="36" height="36" rx="3"/><path d="M6 18h36M6 30h36M18 6v36M30 6v36"/>',
  design: '<path d="M24 4l14 22-14 18L10 26z"/><circle cx="24" cy="26" r="4"/><path d="M24 4v18"/>',
  text: '<path d="M8 10h32M8 19h32M8 28h32M8 37h20"/>',
  html: '<path d="M16 14L6 24l10 10M32 14l10 10-10 10M27 9l-6 30"/>',
  archive: '<rect x="6" y="12" width="36" height="30" rx="3"/><path d="M4 6h40v6H4zM20 22h8"/>',
  bundle: '<path d="M24 4l20 10-20 10L4 14z"/><path d="M4 24l20 10 20-10M4 34l20 10 20-10"/>',
};

const FONT = 'system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Noto Sans Arabic, Hiragino Sans, sans-serif';

const escapeXml = (value: string) =>
  value.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

export const tokenColor = (name: string, theme: 'light' | 'dark' = 'light') => {
  const key = name as TokenName;
  const value = theme === 'dark' ? (darkTokens as Record<string, string>)[key] : tokens[key];
  return value ?? tokens['color-group-custom'];
};

const wrap = (text: string, maxChars: number, maxLines: number) => {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (`${line} ${word}`.trim().length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, maxChars - 1)}…`;
  }
  return lines;
};

export interface SvgArtworkOptions {
  title: string;
  subtitle?: string;
  format: AssetFormat;
  colorToken: string;
  width?: number;
  height?: number;
  /** Adds a checkerboard to suggest a transparent background. */
  transparent?: boolean;
}

/**
 * Deterministic artwork used for thumbnails, previews of seeded media and the
 * output of mocked visual generators. Uses resolved light-theme token values:
 * data URLs cannot read the page's custom properties, and the mid-tone light
 * values keep white text legible in both themes.
 */
export function svgArtwork({
  title,
  subtitle,
  format,
  colorToken,
  width = 640,
  height = 400,
  transparent = false,
}: SvgArtworkOptions): string {
  const color = tokenColor(colorToken);
  const seed = hashString(title);
  const unit = Math.min(width, height);
  const glyphSize = unit * 0.28;
  const pad = unit * 0.08;
  const fontSize = Math.max(12, Math.round(unit * 0.065));
  const maxChars = Math.max(14, Math.floor(width / (fontSize * 0.56)));
  const lines = wrap(title, maxChars, 3);
  const circles = [0, 1, 2]
    .map((i) => {
      const r = unit * (0.25 + ((seed >> (i * 3)) % 20) / 40);
      const cx = ((seed >> (i * 5)) % 100) / 100 * width;
      const cy = ((seed >> (i * 7)) % 100) / 100 * height;
      return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="#fff" fill-opacity="${0.06 + i * 0.03}"/>`;
    })
    .join('');
  const checker = transparent
    ? `<defs><pattern id="c" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#fff" fill-opacity=".25"/><rect x="12" y="12" width="12" height="12" fill="#fff" fill-opacity=".25"/></pattern></defs><rect width="100%" height="100%" fill="url(#c)"/>`
    : '';
  const text = lines
    .map((line, i) => `<tspan x="${pad}" dy="${i === 0 ? 0 : fontSize * 1.2}">${escapeXml(line)}</tspan>`)
    .join('');
  const subtitleText = subtitle
    ? `<text x="${pad}" y="${pad + fontSize * 0.9}" font-family="${FONT}" font-size="${Math.round(fontSize * 0.7)}" fill="#fff" fill-opacity=".85" font-weight="600" letter-spacing=".04em">${escapeXml(subtitle.toUpperCase())}</text>`
    : '';
  const textY = height - pad - (lines.length - 1) * fontSize * 1.2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="100%" height="100%" fill="${color}"/>${checker}${circles}
<rect width="100%" height="100%" fill="#000" fill-opacity=".12"/>
<g transform="translate(${width - pad - glyphSize} ${pad}) scale(${glyphSize / 48})" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" stroke-opacity=".9">${GLYPHS[format]}</g>
${subtitleText}
<text x="${pad}" y="${textY}" font-family="${FONT}" font-size="${fontSize}" font-weight="700" fill="#fff">${text}</text>
</svg>`;
}

export const svgToDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
