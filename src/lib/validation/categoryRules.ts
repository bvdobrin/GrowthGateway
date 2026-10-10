import { CURRENT_BOILERPLATE, CURRENT_BRAND_VERSION, DEPRECATED_PALETTES } from '@/config/taxonomy/categories';
import { DAY_MS, assetText, isBlank, meta, metaString, parseDate, primaryFile } from './helpers';
import { fail, pass, warn, type ValidationRule } from './types';

const PLACEHOLDER = /\{\{(?!\s*unsubscribe_url\s*\}\})[^}]*\}\}|\[(?:TBD|TODO|XX+)\]|lorem ipsum/i;
const UNSUBSCRIBE = /\{\{\s*unsubscribe_url\s*\}\}/i;
const MIN_PHOTO_EDGE = 3000;

const rule = (id: string, check: ValidationRule['check']): ValidationRule => ({ id, scope: 'category', check });

export const CATEGORY_RULES: ValidationRule[] = [
  // Report
  rule('report-version-period', (asset) =>
    metaString(asset, 'version') && metaString(asset, 'reportingPeriod') ? pass('report.pass') : fail('report.missing'),
  ),
  // Website copy
  rule('meta-description-length', (asset) => {
    const length = metaString(asset, 'metaDescription').length;
    if (!length) return fail('web.metaMissing');
    return length > 160 ? fail('web.metaTooLong', { length, max: 160 }) : pass('web.metaOk', { length, max: 160 });
  }),
  rule('no-broken-placeholders', (asset) => {
    const match = assetText(asset).match(PLACEHOLDER);
    return match ? fail('web.placeholders', { sample: match[0] }) : pass('web.noPlaceholders');
  }),
  // Email
  rule('email-unsubscribe', (asset) => {
    if (!metaString(asset, 'audienceSegment').startsWith('external')) return pass('email.unsubscribeNotNeeded');
    return UNSUBSCRIBE.test(assetText(asset)) ? pass('email.unsubscribePresent') : fail('email.unsubscribeMissing');
  }),
  rule('email-subject-length', (asset) => {
    const length = metaString(asset, 'subject').length;
    return length > 80 ? fail('email.subjectTooLong', { length, max: 80 }) : pass('email.subjectOk', { length, max: 80 });
  }),
  // Memo
  rule('memo-not-public', (asset) => (asset.classification === 'public' ? fail('memo.public') : pass('memo.ok'))),
  // Press release
  rule('pr-legal-signoff', (asset) => (meta(asset, 'legalSignOff') === true ? pass('pr.legalOk') : fail('pr.legalMissing'))),
  rule('pr-embargo-future', (asset, _category, { now }) => {
    const embargo = parseDate(meta(asset, 'embargoAt'));
    if (!embargo) return pass('pr.noEmbargo');
    const unpublished = asset.status !== 'approved' && asset.status !== 'expired';
    if (unpublished && embargo.getTime() < now.getTime()) return fail('pr.embargoPast', { date: metaString(asset, 'embargoAt') });
    return pass('pr.embargoOk', { date: metaString(asset, 'embargoAt') });
  }),
  rule('pr-boilerplate-current', (asset) => {
    const version = metaString(asset, 'boilerplateVersion');
    if (!version) return fail('pr.boilerplateMissing');
    return version === CURRENT_BOILERPLATE
      ? pass('pr.boilerplateOk', { version })
      : warn('pr.boilerplateOutdated', { version, current: CURRENT_BOILERPLATE });
  }),
  // Photograph
  rule('photo-release', (asset) => {
    if (meta(asset, 'peopleDepicted') !== true) return pass('photo.noPeople');
    return meta(asset, 'releaseOnFile') === true ? pass('photo.releaseOk') : fail('photo.releaseMissing');
  }),
  rule('photo-min-resolution', (asset) => {
    const file = primaryFile(asset);
    if (!file?.width || !file.height) return warn('photo.unknownRes', { min: MIN_PHOTO_EDGE });
    const edge = Math.max(file.width, file.height);
    return edge < MIN_PHOTO_EDGE
      ? fail('photo.lowRes', { width: file.width, height: file.height, min: MIN_PHOTO_EDGE })
      : pass('photo.resOk', { width: file.width, height: file.height });
  }),
  // Illustration
  rule('illustration-licence', (asset) => (metaString(asset, 'licence') ? pass('illustration.licenceOk') : fail('illustration.licenceMissing'))),
  rule('illustration-source-file', (asset) =>
    asset.format === 'design' || asset.files.some((f) => f.role === 'source')
      ? pass('illustration.sourceOk')
      : fail('illustration.sourceMissing'),
  ),
  // Infographic
  rule('infographic-sources', (asset) => (metaString(asset, 'dataSources') ? pass('infographic.sourcesOk') : fail('infographic.sourcesMissing'))),
  rule('infographic-text-alt', (asset) =>
    metaString(asset, 'textAlternative') ? pass('infographic.textAltOk') : fail('infographic.textAltMissing'),
  ),
  rule('infographic-data-fresh', (asset, _category, { now }) => {
    const asOf = parseDate(meta(asset, 'dataAsOf'));
    if (!asOf) return warn('infographic.dataDateMissing');
    return now.getTime() - asOf.getTime() > 365 * DAY_MS
      ? warn('infographic.dataStale', { date: metaString(asset, 'dataAsOf') })
      : pass('infographic.dataFresh', { date: metaString(asset, 'dataAsOf') });
  }),
  // Advertisement
  rule('ad-disclaimer', (asset) =>
    metaString(asset, 'disclaimer') ? pass('ad.disclaimerOk') : fail('ad.disclaimerMissing', { region: asset.region }),
  ),
  rule('ad-dimensions', (asset) => {
    const placement = metaString(asset, 'placementSize');
    const match = placement.match(/^(\d+)x(\d+)$/);
    if (!match) return pass('ad.dimensionsNotApplicable');
    const [w, h] = [Number(match[1]), Number(match[2])];
    const file = primaryFile(asset);
    if (!file?.width || !file.height) return warn('ad.dimensionsUnknown', { expected: placement });
    const fits = [1, 2, 3].some((scale) => file.width === w * scale && file.height === h * scale);
    return fits
      ? pass('ad.dimensionsOk', { expected: placement })
      : fail('ad.dimensionMismatch', { expected: placement, actual: `${file.width}x${file.height}` });
  }),
  // Promotional material
  rule('promo-print-specs', (asset) => {
    if (asset.format !== 'document' && asset.format !== 'design') return pass('promo.digital');
    const bleed = Number(meta(asset, 'bleedMm') ?? 0);
    const cmyk = metaString(asset, 'colourProfile').startsWith('CMYK');
    return bleed >= 3 && cmyk ? pass('promo.printOk') : warn('promo.printSpecs', { bleed, min: 3 });
  }),
  // Video
  rule('video-captions', (asset) => (asset.files.some((f) => f.role === 'captions') ? pass('video.captionsOk') : fail('video.captionsMissing'))),
  rule('video-music-licence', (asset) => (metaString(asset, 'musicLicence') ? pass('video.musicOk') : fail('video.musicMissing'))),
  // Meeting
  rule('meeting-minutes', (asset, _category, { now }) => {
    const date = parseDate(meta(asset, 'meetingDate'));
    if (date && date.getTime() > now.getTime()) return pass('meeting.upcoming');
    return asset.files.some((f) => /minutes/i.test(f.name)) ? pass('meeting.minutesOk') : fail('meeting.minutesMissing');
  }),
  // Press conference
  rule('pc-transcript', (asset, _category, { now }) => {
    if (asset.files.some((f) => f.role === 'transcript')) return pass('pc.transcriptOk');
    const date = parseDate(meta(asset, 'eventDate'));
    return date && date.getTime() > now.getTime() ? warn('pc.transcriptPending') : fail('pc.transcriptMissing');
  }),
  rule('pc-speakers', (asset) => (isBlank(meta(asset, 'speakers')) ? fail('pc.speakersMissing') : pass('pc.speakersOk'))),
  // Interview
  rule('interview-consent', (asset) => (meta(asset, 'consentOnFile') === true ? pass('interview.consentOk') : fail('interview.consentMissing'))),
  // Branding material
  rule('brand-approved-version', (asset) => {
    const version = metaString(asset, 'approvedVersion');
    if (!version) return fail('brand.versionMissing', { current: CURRENT_BRAND_VERSION });
    return version === CURRENT_BRAND_VERSION
      ? pass('brand.versionOk', { version })
      : fail('brand.versionDeprecated', { version, current: CURRENT_BRAND_VERSION });
  }),
  rule('brand-no-deprecated-palette', (asset) =>
    DEPRECATED_PALETTES.includes(metaString(asset, 'palette'))
      ? fail('brand.paletteDeprecated', { palette: metaString(asset, 'palette') })
      : pass('brand.paletteOk'),
  ),
];
