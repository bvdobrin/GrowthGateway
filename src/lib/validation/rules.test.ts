import { SEEDED_CATEGORIES } from '@/config/taxonomy/categories';
import { mimeForName } from '@/config/taxonomy/formats';
import validationEn from '@/locales/en/validation.json';
import type { Asset, AssetFile, AssetFormat, Classification, MetadataValue, ValidationStatus } from '@/types';
import { runValidation } from './registry';

const NOW = new Date('2026-10-10T12:00:00.000Z');
const categories = Object.fromEntries(SEEDED_CATEGORIES.map((category) => [category.id, category]));

function file(name: string, extra: Partial<AssetFile> = {}): AssetFile {
  return { id: name, role: 'primary', name, mime: mimeForName(name), sizeBytes: 2048, ...extra };
}

function asset(input: {
  category: string;
  format: AssetFormat;
  files: AssetFile[];
  meta?: Record<string, MetadataValue>;
  classification?: Classification;
}): Asset {
  return {
    id: `fixture-${input.category}`,
    title: `${input.category} fixture title`,
    description: 'Fixture used to exercise category validation.',
    category: input.category,
    format: input.format,
    files: input.files,
    categoryMetadata: input.meta ?? {},
    region: 'EMEA',
    locale: 'en',
    businessUnit: 'Corporate',
    tags: ['fixture'],
    sourceSystem: 'gg-native',
    migrationStatus: 'migrated',
    classification: input.classification ?? 'internal',
    accessGroups: ['ALL_EMPLOYEES'],
    status: 'draft',
    ownerId: 'u-amelia',
    createdAt: '2026-09-01T09:00:00.000Z',
    updatedAt: '2026-09-01T09:00:00.000Z',
  };
}

interface Case {
  category: string;
  ruleId: string;
  pass: Asset;
  fail: Asset;
  /** Promotional print specs warn rather than block. */
  failStatus?: ValidationStatus;
}

const html = (name: string, text: string) => file(name, { text });

const cases: Case[] = [
  {
    category: 'report',
    ruleId: 'report-version-period',
    pass: asset({
      category: 'report',
      format: 'document',
      files: [file('annual-report.pdf')],
      meta: { reportingPeriod: 'FY2025', version: 'v1.0' },
    }),
    fail: asset({ category: 'report', format: 'document', files: [file('annual-report.pdf')], meta: {} }),
  },
  {
    category: 'website-copy',
    ruleId: 'no-broken-placeholders',
    pass: asset({
      category: 'website-copy',
      format: 'html',
      files: [html('careers.html', '<p>Join Atlas Meridian.</p>')],
      meta: { targetUrl: 'https://example.com/careers', seoTitle: 'Careers', metaDescription: 'Join the team.' },
    }),
    fail: asset({
      category: 'website-copy',
      format: 'html',
      files: [html('careers.html', '<p>Hello {{name}}</p>')],
      meta: { targetUrl: 'https://example.com/careers', seoTitle: 'Careers', metaDescription: 'Join the team.' },
    }),
  },
  {
    category: 'email',
    ruleId: 'email-unsubscribe',
    pass: asset({
      category: 'email',
      format: 'html',
      files: [html('note.html', '<p>Internal note</p>')],
      meta: { subject: 'Safety week', audienceSegment: 'internal-all-staff' },
    }),
    fail: asset({
      category: 'email',
      format: 'html',
      files: [html('note.html', '<p>Please read</p>')],
      meta: { subject: 'Investor update', audienceSegment: 'external-investors' },
    }),
  },
  {
    category: 'memo',
    ruleId: 'memo-not-public',
    pass: asset({
      category: 'memo',
      format: 'text',
      files: [html('memo.md', 'Please note the change.')],
      meta: { distributionList: 'All staff' },
    }),
    fail: asset({
      category: 'memo',
      format: 'text',
      files: [html('memo.md', 'Please note the change.')],
      meta: { distributionList: 'All staff' },
      classification: 'public',
    }),
  },
  {
    category: 'press-release',
    ruleId: 'pr-legal-signoff',
    pass: asset({
      category: 'press-release',
      format: 'text',
      files: [html('release.md', 'Atlas Meridian today announced a new programme.')],
      meta: { spokesperson: 'Amelia Hart', legalSignOff: true, boilerplateVersion: '2026.1', embargoAt: '2026-12-01T09:00:00.000Z' },
    }),
    fail: asset({
      category: 'press-release',
      format: 'text',
      files: [html('release.md', 'Atlas Meridian today announced a new programme.')],
      meta: { spokesperson: 'Amelia Hart', legalSignOff: false, boilerplateVersion: '2026.1', embargoAt: '2026-12-01T09:00:00.000Z' },
    }),
  },
  {
    category: 'photograph',
    ruleId: 'photo-release',
    pass: asset({
      category: 'photograph',
      format: 'image',
      files: [file('site-photo.jpg', { width: 4000, height: 3000 })],
      meta: { photographer: 'Jordan Blake', peopleDepicted: false },
    }),
    fail: asset({
      category: 'photograph',
      format: 'image',
      files: [file('crew-photo.jpg', { width: 4000, height: 3000 })],
      meta: { photographer: 'Jordan Blake', peopleDepicted: true, releaseOnFile: false },
    }),
  },
  {
    category: 'illustration',
    ruleId: 'illustration-licence',
    pass: asset({
      category: 'illustration',
      format: 'design',
      files: [file('diagram.ai')],
      meta: { artist: 'Studio North', licence: 'owned' },
    }),
    fail: asset({
      category: 'illustration',
      format: 'image',
      files: [file('diagram.png')],
      meta: { artist: 'Studio North' },
    }),
  },
  {
    category: 'infographic',
    ruleId: 'infographic-sources',
    pass: asset({
      category: 'infographic',
      format: 'image',
      files: [file('emissions.png', { width: 1600, height: 2000 })],
      meta: { dataSources: 'Group HSE system', dataAsOf: '2026-06-01', textAlternative: 'Emissions fell.' },
    }),
    fail: asset({
      category: 'infographic',
      format: 'image',
      files: [file('emissions.png', { width: 1600, height: 2000 })],
      meta: { dataAsOf: '2026-06-01', textAlternative: 'Emissions fell.' },
    }),
  },
  {
    category: 'advertisement',
    ruleId: 'ad-disclaimer',
    pass: asset({
      category: 'advertisement',
      format: 'image',
      files: [file('banner.png', { width: 1200, height: 628 })],
      meta: { channel: 'digital', placementSize: '1200x628', disclaimer: 'Capital at risk. Approved by the regional regulator.' },
    }),
    fail: asset({
      category: 'advertisement',
      format: 'image',
      files: [file('banner.png', { width: 1200, height: 628 })],
      meta: { channel: 'digital', placementSize: '1200x628' },
    }),
  },
  {
    category: 'promotional-material',
    ruleId: 'promo-print-specs',
    failStatus: 'warn',
    pass: asset({
      category: 'promotional-material',
      format: 'image',
      files: [file('poster.png')],
      meta: { productOrEvent: 'Careers fair' },
    }),
    fail: asset({
      category: 'promotional-material',
      format: 'document',
      files: [file('brochure.pdf')],
      meta: { productOrEvent: 'Careers fair', bleedMm: 0, colourProfile: 'sRGB' },
    }),
  },
  {
    category: 'video',
    ruleId: 'video-captions',
    pass: asset({
      category: 'video',
      format: 'video',
      files: [file('safety.mp4'), file('safety.vtt', { role: 'captions', text: 'WEBVTT' })],
      meta: { musicLicence: 'Epidemic Sound, licence ES-100' },
    }),
    fail: asset({ category: 'video', format: 'video', files: [file('safety.mp4')], meta: {} }),
  },
  {
    category: 'meeting',
    ruleId: 'meeting-minutes',
    pass: asset({
      category: 'meeting',
      format: 'bundle',
      files: [file('agenda.pdf'), file('steering-minutes.md', { role: 'attachment', text: 'Minutes' })],
      meta: { meetingDate: '2026-09-01' },
    }),
    fail: asset({
      category: 'meeting',
      format: 'bundle',
      files: [file('agenda.pdf')],
      meta: { meetingDate: '2026-09-01' },
    }),
  },
  {
    category: 'press-conference',
    ruleId: 'pc-transcript',
    pass: asset({
      category: 'press-conference',
      format: 'bundle',
      files: [file('briefing.mp4'), file('briefing.txt', { role: 'transcript', text: 'Transcript' })],
      meta: { eventDate: '2026-09-01', speakers: ['Amelia Hart'] },
    }),
    fail: asset({
      category: 'press-conference',
      format: 'bundle',
      files: [file('briefing.mp4')],
      meta: { eventDate: '2026-09-01' },
    }),
  },
  {
    category: 'interview',
    ruleId: 'interview-consent',
    pass: asset({
      category: 'interview',
      format: 'bundle',
      files: [file('interview.mp3')],
      meta: { interviewee: 'Amelia Hart', consentOnFile: true },
    }),
    fail: asset({
      category: 'interview',
      format: 'bundle',
      files: [file('interview.mp3')],
      meta: { interviewee: 'Amelia Hart', consentOnFile: false },
    }),
  },
  {
    category: 'branding-material',
    ruleId: 'brand-approved-version',
    pass: asset({
      category: 'branding-material',
      format: 'image',
      files: [file('logo.png')],
      meta: { elementType: 'logo', approvedVersion: 'v3', palette: '2026-core' },
    }),
    fail: asset({
      category: 'branding-material',
      format: 'image',
      files: [file('logo.png')],
      meta: { elementType: 'logo', approvedVersion: 'v1', palette: '2023-legacy' },
    }),
  },
];

describe('validation rules', () => {
  it('covers every seeded category', () => {
    expect(cases.map((item) => item.category).sort()).toEqual(SEEDED_CATEGORIES.map((category) => category.id).sort());
  });

  it.each(cases)('$category passes a complete asset and rejects $ruleId', ({ category, ruleId, pass, fail, failStatus = 'fail' }) => {
    const definition = categories[category];
    const passed = runValidation(pass, definition, { now: NOW });
    const failed = runValidation(fail, definition, { now: NOW });
    expect(passed.overall).toBe('pass');
    expect(passed.results.find((result) => result.ruleId === ruleId)?.status).toBe('pass');
    expect(failed.results.find((result) => result.ruleId === ruleId)?.status).toBe(failStatus);
    expect(failed.overall).not.toBe('pass');
    expect(failed.results.find((result) => result.ruleId === ruleId)?.message.key).toBeTruthy();
  });
});

describe('validation message keys', () => {
  it('has a translation for every rule message key', () => {
    const keys = new Set<string>();
    for (const category of SEEDED_CATEGORIES) {
      for (const item of [cases.find((entry) => entry.category === category.id)!]) {
        for (const fixture of [item.pass, item.fail]) {
          for (const result of runValidation(fixture, category, { now: NOW }).results) keys.add(result.message.key);
        }
      }
    }
    const missing = [...keys].filter((key) => {
      const [group, name] = key.split('.');
      const bucket = validationEn.msg[group as keyof typeof validationEn.msg];
      return !bucket || typeof bucket !== 'object' || !(name in (bucket as object));
    });
    expect(missing).toEqual([]);
  });
});
