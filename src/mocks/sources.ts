import type { RemoteItem, SourceSystem } from '@/types';

export const NATIVE_SOURCE = 'gg-native';

/** The fragmented systems GrowthGateway sits in front of. */
export const SOURCES: SourceSystem[] = [
  {
    id: NATIVE_SOURCE,
    name: 'GrowthGateway',
    vendor: 'Atlas Meridian',
    region: 'GLOBAL',
    description: 'Uploaded or authored directly in GrowthGateway.',
    native: true,
  },
  {
    id: 'sp-na',
    name: 'SharePoint · NA Comms Hub',
    vendor: 'Microsoft SharePoint Online',
    region: 'NA',
    description: 'North America team site and document libraries.',
  },
  {
    id: 'box-emea',
    name: 'Box · EMEA Marketing',
    vendor: 'Box',
    region: 'EMEA',
    description: 'European marketing shared folders.',
  },
  {
    id: 'nas-mea',
    name: 'Dubai file server',
    vendor: 'On-premises NAS',
    region: 'MEA',
    description: 'Network share at the Dubai regional office.',
  },
  {
    id: 'dbx-apac',
    name: 'Dropbox · APAC Creative',
    vendor: 'Dropbox Business',
    region: 'APAC',
    description: 'Asia-Pacific creative team folders.',
  },
  {
    id: 'bf-halcyon',
    name: 'Brandfolder · Halcyon Engineering',
    vendor: 'Brandfolder',
    region: 'NA',
    description: 'Brand library inherited from the Halcyon Engineering acquisition.',
    acquiredCompany: 'Halcyon Engineering (2022)',
  },
  {
    id: 'gd-norland',
    name: 'Google Drive · Norland Infrastructure',
    vendor: 'Google Workspace',
    region: 'EMEA',
    description: 'Shared drives inherited from the Norland Infrastructure acquisition.',
    acquiredCompany: 'Norland Infrastructure (2024)',
  },
];

export const SOURCES_BY_ID: Record<string, SourceSystem> = Object.fromEntries(SOURCES.map((s) => [s.id, s]));

const ROOTS: Record<string, string> = {
  'sp-na': 'https://atlasmeridian.sharepoint.com/sites/na-comms/Shared Documents/',
  'box-emea': 'box://EMEA Marketing/',
  'nas-mea': '\\\\dxb-fs01\\comms\\',
  'dbx-apac': 'dropbox://APAC Creative/',
  'bf-halcyon': 'brandfolder://halcyon-engineering/',
  'gd-norland': 'gdrive://Norland Comms/',
};

export const legacyPath = (sourceId: string, fileName: string) => `${ROOTS[sourceId] ?? ''}${fileName}`;

const item = (
  sourceId: string,
  name: string,
  mime: string,
  sizeBytes: number,
  modifiedAt: string,
  suggestedCategory: string,
): RemoteItem => ({ sourceId, path: legacyPath(sourceId, name), name, mime, sizeBytes, modifiedAt, suggestedCategory });

/** Items that exist in the legacy systems but are not yet registered in GrowthGateway. */
export const REMOTE_ITEMS: RemoteItem[] = [
  item('sp-na', 'Houston office opening - photos/ribbon-cutting-042.jpg', 'image/jpeg', 6_200_000, '2026-08-14', 'photograph'),
  item('sp-na', 'Board packs/Q3-2026-ops-review.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 12_400_000, '2026-10-01', 'report'),
  item('sp-na', 'Newsletters/client-newsletter-sept.html', 'text/html', 48_000, '2026-09-05', 'email'),
  item('box-emea', 'Events/Water Expo 2026/stand-render-v4.psd', 'image/vnd.adobe.photoshop', 210_000_000, '2026-07-22', 'promotional-material'),
  item('box-emea', 'Press/2026-06 Hamburg port contract.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 98_000, '2026-06-18', 'press-release'),
  item('box-emea', 'Video/norland-crane-timelapse.mp4', 'video/mp4', 640_000_000, '2026-05-30', 'video'),
  item('nas-mea', 'Comms\\Photos\\Doha stadium handover\\IMG_8812.jpg', 'image/jpeg', 8_900_000, '2026-04-09', 'photograph'),
  item('nas-mea', 'Comms\\Ads\\Ramadan-campaign-2026-AR.pdf', 'application/pdf', 4_100_000, '2026-02-20', 'advertisement'),
  item('nas-mea', 'Comms\\Interviews\\Al-Arabiya-2026-03.m4a', 'audio/mp4', 38_000_000, '2026-03-14', 'interview'),
  item('dbx-apac', 'Infographics/APAC-renewables-pipeline.ai', 'application/illustrator', 22_000_000, '2026-09-12', 'infographic'),
  item('dbx-apac', 'Social/Sydney-metro-reel.mp4', 'video/mp4', 120_000_000, '2026-08-28', 'video'),
  item('dbx-apac', 'Brand/APAC-email-signature.html', 'text/html', 12_000, '2026-01-10', 'branding-material'),
  item('bf-halcyon', 'Halcyon/Logos/halcyon-secondary-mark.svg', 'image/svg+xml', 24_000, '2022-11-02', 'branding-material'),
  item('bf-halcyon', 'Halcyon/Projects/denver-medical-campus.jpg', 'image/jpeg', 7_400_000, '2023-03-17', 'photograph'),
  item('gd-norland', 'Norland Comms/Memos/integration-faq-v3.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 64_000, '2026-02-02', 'memo'),
  item('gd-norland', 'Norland Comms/Reports/norland-2025-annual-review.pdf', 'application/pdf', 15_800_000, '2026-01-28', 'report'),
];
