import { detectFormat } from '@/config/taxonomy/formats';

interface FileLike {
  name: string;
  mime: string;
}

const KEYWORDS: [RegExp, string][] = [
  [/logo|brand|palette|guideline|template|lockup/i, 'branding-material'],
  [/infographic|at-a-glance|stats/i, 'infographic'],
  [/\bad\b|banner|billboard|48-sheet|linkedin|instagram|display/i, 'advertisement'],
  [/poster|flyer|booth|merch|kit|fact-?sheet/i, 'promotional-material'],
  [/press[-_ ]?release|communiqu|^pr[-_]/i, 'press-release'],
  [/press[-_ ]?conf|briefing|media[-_ ]day/i, 'press-conference'],
  [/interview|podcast/i, 'interview'],
  [/minutes|agenda|town[-_ ]?hall|meeting|sync|workshop/i, 'meeting'],
  [/memo|notice|policy|note/i, 'memo'],
  [/newsletter|email|invite|mailer/i, 'email'],
  [/report|review|outlook|summary|board/i, 'report'],
  [/illustration|diagram|isometric|sketch|map/i, 'illustration'],
];

const BY_FORMAT: Record<string, string> = {
  image: 'photograph',
  video: 'video',
  audio: 'interview',
  document: 'report',
  presentation: 'report',
  spreadsheet: 'report',
  design: 'illustration',
  text: 'memo',
  html: 'website-copy',
  archive: 'branding-material',
};

/** Guesses a category from file names and types, restricted to what the user may create. */
export function suggestCategory(files: FileLike[], allowed: string[]): string | undefined {
  if (!files.length) return undefined;
  const pick = (id: string | undefined) => (id && allowed.includes(id) ? id : undefined);
  const names = files.map((f) => f.name).join(' ');
  const formats = files.map((f) => detectFormat(f.mime, f.name));

  if (files.length > 1 && formats.some((f) => f === 'video' || f === 'audio')) {
    const event = pick(KEYWORDS.find(([re, id]) => ['interview', 'press-conference', 'meeting'].includes(id) && re.test(names))?.[1]);
    if (event) return event;
  }
  for (const [pattern, id] of KEYWORDS) {
    if (pattern.test(names) && pick(id)) return id;
  }
  return pick(BY_FORMAT[formats[0] ?? '']) ?? allowed[0];
}
