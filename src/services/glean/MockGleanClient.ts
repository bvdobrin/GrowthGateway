import Fuse from 'fuse.js';
import i18n, { SUPPORTED_LOCALES } from '@/i18n';
import { canView } from '@/lib/accessPolicy';
import type { Asset, AssetRef, CategoryDefinition, Region } from '@/types';
import { delay } from '../latency';
import { allCategories, getDb, withEffectiveStatus } from '../mockDb';
import type { GleanChatRequest, GleanChatResponse, GleanClient } from './GleanClient';

/** Synonyms and inflections the translated category labels don't cover. */
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  report: ['reports', 'annual report', 'board report', 'rapports', 'تقارير', 'レポート'],
  'website-copy': ['web copy', 'webpage', 'web page', 'website', 'landing page', 'page web'],
  email: ['emails', 'newsletter', 'newsletters', 'mailer', 'e-mails', 'رسائل', 'メール'],
  memo: ['memos', 'notice', 'internal note', 'notes internes', 'مذكرات', 'メモ'],
  'press-release': [
    'press releases',
    'news release',
    'announcement',
    'announcements',
    'communiqué',
    'communiqués',
    'communiqués de presse',
    'communiqué de presse',
    'pressemitteilungen',
    'comunicados',
    'comunicati',
    'البيانات الصحفية',
    'بيانات صحفية',
  ],
  photograph: ['photo', 'photos', 'photography', 'photographs', 'picture', 'pictures', 'images', 'صور', 'صورة'],
  illustration: ['illustrations', 'drawing', 'diagram', 'diagrams'],
  infographic: ['infographics', 'chart', 'charts', 'infographies'],
  advertisement: ['ad', 'ads', 'advert', 'adverts', 'advertising', 'banner', 'banners', 'billboard', 'publicités', 'إعلانات', '広告'],
  'promotional-material': ['promo', 'poster', 'posters', 'flyer', 'flyers', 'merchandise', 'booth'],
  video: ['videos', 'film', 'footage', 'clip', 'clips', 'vidéos', 'فيديو', '動画'],
  meeting: ['meetings', 'town hall', 'minutes', 'steering committee', 'réunions', 'اجتماعات'],
  'press-conference': ['press conferences', 'press briefing', 'media day', 'press point', 'conférences de presse', 'مؤتمرات صحفية'],
  interview: ['interviews', 'podcast', 'podcasts', 'المقابلات', 'مقابلات', 'مقابلة'],
  'branding-material': ['branding', 'logo', 'logos', 'brand guidelines', 'guidelines', 'template', 'templates', 'palette'],
};

const REGION_TERMS: Record<Exclude<Region, 'GLOBAL'>, string[]> = {
  NA: ['na', 'north america', 'north american', 'amérique du nord', 'nordamerika', 'norteamérica', 'america del nord', 'أمريكا الشمالية', '北米'],
  EMEA: ['emea', 'europe', 'european', 'europa', 'أوروبا', 'ヨーロッパ', '欧州'],
  MEA: ['mea', 'middle east', 'moyen-orient', 'naher osten', 'oriente medio', 'medio oriente', 'الشرق الأوسط', '中東', 'gulf region'],
  APAC: ['apac', 'asia-pacific', 'asia pacific', 'asie-pacifique', 'asien-pazifik', 'asia-pacífico', 'asia pacifico', 'آسيا', 'アジア太平洋', 'アジア'],
};

const RECENCY = [
  'latest',
  'recent',
  'newest',
  'new',
  'derniers',
  'dernières',
  'récents',
  'neueste',
  'neuesten',
  'últimos',
  'últimas',
  'ultimi',
  'ultime',
  'أحدث',
  '最新',
];
const TRANSCRIPT = ['transcript', 'transcripts', 'transcription', 'transcriptions', 'تفريغات', 'تفريغ', '書き起こし', 'トランスクリプト'];
const STOPWORDS = new Set(
  [
    'a an the and or of for to in on at about with from by is are was were be me my our we you i any all some show find give list get what which who where when how do does can could please there have has assets asset files file',
    'des les le la de du et en sur pour avec moi trouve montre un une au aux d l',
    'في عن من على إلى ما هل أريد أعطني اعرض',
    'der die das und oder von für zu im auf mit aus bei ist sind ein eine nicht',
    'el los las y o del en con un una por que',
    'il lo la i gli le e di del della in con un una che per',
    'に の は を が で と も 関する について する ます です',
  ]
    .join(' ')
    .split(' '),
);

/**
 * Glean retrieves semantically across languages; the mock approximates that for
 * the demo prompts with a small glossary into the seed content's language.
 */
const GLOSSARY: Record<string, string> = {
  hydrogène: 'hydrogen',
  الهيدروجين: 'hydrogen',
  هيدروجين: 'hydrogen',
  水素: 'hydrogen',
  métro: 'metro',
  مترو: 'metro',
  メトロ: 'metro',
  地下鉄: 'metro',
  dubaï: 'dubai',
  دبي: 'dubai',
  ドバイ: 'dubai',
  طوكيو: 'tokyo',
  東京: 'tokyo',
  éolien: 'wind',
  風力: 'wind',
  wasserstoff: 'hydrogen',
  hidrógeno: 'hydrogen',
  idrogeno: 'hydrogen',
  dubái: 'dubai',
};

/** Word tokens; Intl.Segmenter handles scripts without spaces such as Japanese. */
function tokenize(text: string, locale: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(locale, { granularity: 'word' });
    return [...segmenter.segment(text)].filter((s) => s.isWordLike).map((s) => s.segment);
  }
  return text.split(/[\s,.;:!?()"'“”«»،？！。、]+/u);
}
const HELP = /\b(help|what can you do|aide)\b|مساعدة|ヘルプ/i;
const HOW_UPLOAD = /\b(how|comment)\b.*\b(upload|add|téléverser|ajouter)\b|كيف.*(رفع|إضافة)|アップロード.*(方法|どう)/i;
const HOW_APPROVE = /\b(how|comment)\b.*\b(approv|submit|soumettre)\w*|كيف.*(موافقة|اعتماد)|承認.*(方法|どう)/i;
const HOW_ACCESS = /\b(why|pourquoi)\b.*\b(can'?t|cannot|access|see|voir|accès)\b|\baccess\b.*\b(request|get)\b|لماذا.*(الوصول|أرى)|アクセス.*(できない|方法)/i;

const normalise = (value: string) => value.toLowerCase().normalize('NFKC');

const assetText = (asset: Asset) =>
  asset.files
    .map((f) => f.text ?? '')
    .join(' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 4000);

const snippet = (asset: Asset) => {
  const text = asset.description || assetText(asset);
  return text.length > 160 ? `${text.slice(0, 157)}…` : text;
};

function categoryTerms(categories: CategoryDefinition[]) {
  const terms: { term: string; categoryId: string }[] = [];
  for (const category of categories) {
    const labels = new Set<string>([category.label, category.id.replace(/-/g, ' '), ...(CATEGORY_SYNONYMS[category.id] ?? [])]);
    for (const lng of SUPPORTED_LOCALES) {
      const label = i18n.getFixedT(lng, 'taxonomy')(`category.${category.id}`, { defaultValue: '' });
      if (label) labels.add(label);
    }
    labels.forEach((term) => terms.push({ term: normalise(term), categoryId: category.id }));
  }
  return terms.sort((a, b) => b.term.length - a.term.length);
}

const containsTerm = (text: string, term: string) => {
  if (/^[\p{Script=Latin}\s'-]+$/u.test(term)) {
    return new RegExp(`(^|[^\\p{L}])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(s)?($|[^\\p{L}])`, 'u').test(text);
  }
  return text.includes(term);
};

export interface ParsedQuery {
  categoryIds: string[];
  regions: Region[];
  recency: boolean;
  transcripts: boolean;
  keywords: string[];
}

export function parseQuery(query: string, categories: CategoryDefinition[], locale = 'en'): ParsedQuery {
  let text = normalise(query);
  const categoryIds = new Set<string>();
  for (const { term, categoryId } of categoryTerms(categories)) {
    if (containsTerm(text, term)) {
      categoryIds.add(categoryId);
      text = text.replace(term, ' ');
    }
  }
  const regions = new Set<Region>();
  for (const [region, terms] of Object.entries(REGION_TERMS) as [Region, string[]][]) {
    for (const term of terms) {
      if (containsTerm(text, term)) {
        regions.add(region);
        text = text.replace(term, ' ');
      }
    }
  }
  const recency = RECENCY.some((t) => containsTerm(text, t));
  const transcripts = TRANSCRIPT.some((t) => text.includes(t));
  for (const term of [...RECENCY, ...TRANSCRIPT]) if (!/^[a-z]+$/.test(term)) text = text.replace(term, ' ');
  const keywords = tokenize(text, locale)
    .map((w) => w.trim().replace(/^[dl]['’]/, ''))
    .filter((w) => w.length > 1 && !STOPWORDS.has(w) && !RECENCY.includes(w) && !TRANSCRIPT.includes(w))
    .map((w) => GLOSSARY[w] ?? w);
  return { categoryIds: [...categoryIds], regions: [...regions], recency, transcripts, keywords: [...new Set(keywords)] };
}

/**
 * In-browser stand-in for Glean: retrieves only from assets the user is entitled
 * to, so it can never cite (or hint at) anything outside their groups.
 */
export class MockGleanClient implements GleanClient {
  readonly mode = 'mock' as const;

  async chat({ messages, user, locale, signal }: GleanChatRequest): Promise<GleanChatResponse> {
    await delay(500, 600, signal);
    const t = i18n.getFixedT(locale, 'chat');
    const question = [...messages].reverse().find((m) => m.role === 'user')?.content.trim() ?? '';

    if (HOW_UPLOAD.test(question)) return { answer: t('answers.howUpload'), citations: [] };
    if (HOW_APPROVE.test(question)) return { answer: t('answers.howApprove'), citations: [] };
    if (HOW_ACCESS.test(question)) return { answer: t('answers.howAccess'), citations: [] };
    if (!question || HELP.test(question)) return { answer: t('answers.help'), citations: [] };

    const db = await getDb();
    const categories = allCategories(db);
    const visible = db.assets.map((a) => withEffectiveStatus(a)).filter((a) => canView(user, a));
    const parsed = parseQuery(question, categories, locale);

    let candidates = visible.filter(
      (a) =>
        (parsed.categoryIds.length === 0 || parsed.categoryIds.includes(a.category)) &&
        (parsed.regions.length === 0 || parsed.regions.includes(a.region)) &&
        (!parsed.transcripts || a.files.some((f) => f.role === 'transcript')),
    );

    if (parsed.keywords.length) {
      const fuse = new Fuse(
        candidates.map((asset) => ({
          asset,
          title: asset.title,
          description: asset.description,
          tags: asset.tags.join(' '),
          meta: Object.values(asset.categoryMetadata).flat().join(' '),
          text: assetText(asset),
        })),
        {
          keys: [
            { name: 'title', weight: 3 },
            { name: 'tags', weight: 2 },
            { name: 'description', weight: 1.5 },
            { name: 'meta', weight: 1 },
            { name: 'text', weight: 1 },
          ],
          threshold: 0.34,
          ignoreLocation: true,
          includeScore: true,
        },
      );
      const ranking = new Map<string, { asset: Asset; matched: number; score: number }>();
      for (const keyword of parsed.keywords) {
        for (const hit of fuse.search(keyword)) {
          const entry = ranking.get(hit.item.asset.id) ?? { asset: hit.item.asset, matched: 0, score: 0 };
          entry.matched += 1;
          entry.score += 1 - (hit.score ?? 1);
          ranking.set(hit.item.asset.id, entry);
        }
      }
      candidates = [...ranking.values()]
        .sort((a, b) => b.matched - a.matched || b.score - a.score)
        .map((entry) => entry.asset);
    }

    if (parsed.recency || !parsed.keywords.length) {
      candidates = [...candidates].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    const top = candidates.slice(0, 5);
    if (top.length === 0) return { answer: t('answers.none', { query: question }), citations: [] };

    const categoryLabel = (id: string) =>
      i18n.getFixedT(locale, 'taxonomy')(`category.${id}`, { defaultValue: categories.find((c) => c.id === id)?.label ?? id });
    const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
    const lines = top.map(
      (a, i) => `${i + 1}. **${a.title}** · ${categoryLabel(a.category)} · ${a.region} · ${dateFormat.format(new Date(a.createdAt))}\n   ${snippet(a)}`,
    );
    const answer = [
      t('answers.found', { count: candidates.length }),
      '',
      ...lines,
      '',
      t('answers.permissionNote'),
    ].join('\n');
    const citations: AssetRef[] = top.map((a) => ({ id: a.id, title: a.title, category: a.category }));
    return { answer, citations };
  }
}
