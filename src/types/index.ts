export type Region = 'NA' | 'EMEA' | 'MEA' | 'APAC' | 'GLOBAL';
export const REGIONS: Region[] = ['NA', 'EMEA', 'MEA', 'APAC', 'GLOBAL'];

export type Classification = 'public' | 'internal' | 'confidential' | 'restricted';
export const CLASSIFICATIONS: Classification[] = ['public', 'internal', 'confidential', 'restricted'];

export type AssetStatus =
  | 'draft'
  | 'pending_validation'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'expired';
export const ASSET_STATUSES: AssetStatus[] = [
  'draft',
  'pending_validation',
  'pending_approval',
  'approved',
  'rejected',
  'expired',
];

export type AssetFormat =
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'presentation'
  | 'spreadsheet'
  | 'design'
  | 'text'
  | 'html'
  | 'archive'
  | 'bundle';

export type FileRole = 'primary' | 'transcript' | 'captions' | 'source' | 'attachment' | 'thumbnail';

export type MetadataValue = string | number | boolean | string[] | null;

export interface AssetFile {
  id: string;
  role: FileRole;
  name: string;
  mime: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  durationSec?: number;
  /** Key of the binary in IndexedDB (uploaded files). */
  blobKey?: string;
  /** Inline content for text, HTML, Markdown, WebVTT and generated SVG files. */
  text?: string;
}

export interface ValidationMessage {
  key: string;
  params?: Record<string, string | number>;
}

export type ValidationStatus = 'pass' | 'warn' | 'fail';

export interface ValidationResult {
  ruleId: string;
  status: ValidationStatus;
  message: ValidationMessage;
}

export interface ValidationReport {
  checkedAt: string;
  overall: ValidationStatus;
  results: ValidationResult[];
}

export interface ApprovalDecision {
  decision: 'approved' | 'rejected';
  by: string;
  byName: string;
  at: string;
  comment?: string;
}

export interface Asset {
  id: string;
  title: string;
  description: string;
  /** CategoryDefinition.id */
  category: string;
  format: AssetFormat;
  files: AssetFile[];
  categoryMetadata: Record<string, MetadataValue>;
  region: Region;
  locale: string;
  businessUnit: string;
  campaign?: string;
  tags: string[];
  sourceSystem: string;
  migrationStatus: 'linked' | 'migrated';
  /** Location of the original in the legacy system, for linked assets. */
  sourcePath?: string;
  classification: Classification;
  accessGroups: string[];
  status: AssetStatus;
  rightsExpiry?: string;
  ownerId: string;
  parentId?: string;
  generatorId?: string;
  validation?: ValidationReport;
  submittedAt?: string;
  submittedBy?: string;
  approval?: ApprovalDecision;
  createdAt: string;
  updatedAt: string;
}

export type CategoryGroup = 'Written' | 'Visual' | 'Media' | 'Events' | 'Brand' | 'Custom';
export const CATEGORY_GROUPS: CategoryGroup[] = ['Written', 'Visual', 'Media', 'Events', 'Brand', 'Custom'];

export type MetadataFieldKind =
  | 'text'
  | 'longtext'
  | 'date'
  | 'datetime'
  | 'select'
  | 'multiselect'
  | 'people'
  | 'url'
  | 'number'
  | 'boolean';

export interface MetadataField {
  key: string;
  label: string;
  kind: MetadataFieldKind;
  required?: boolean;
  options?: string[];
  facet?: boolean;
  hint?: string;
}

export interface CategoryDefinition {
  id: string;
  label: string;
  group: CategoryGroup;
  icon: string;
  /** Token name without the leading dashes, e.g. 'color-category-press-release'. */
  colorToken: string;
  allowedFormats: AssetFormat[];
  metadataSchema: MetadataField[];
  validationRuleIds: string[];
  generatorIds: string[];
  defaultClassification?: Classification;
  authorable?: boolean;
  custom?: boolean;
  createdBy?: string;
}

export type Permission =
  | 'asset:read'
  | 'asset:upload'
  | 'asset:download'
  | 'asset:generate'
  | 'asset:approve'
  | 'admin:audit'
  | 'admin:taxonomy';

export interface Group {
  id: string;
  name: string;
  description: string;
  region?: Region;
  permissions: Permission[];
  external?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  title: string;
  department: string;
  region: Region;
  /** IdP groups from the SSO token. ALL_EMPLOYEES is implied for internal users. */
  groups: string[];
  clearance: Classification;
  external?: boolean;
  organization: string;
  preferredLocale: string;
  avatarHue: number;
}

export interface Session {
  user: User;
  idp: string;
  idToken: string;
  accessToken: string;
  issuedAt: string;
  expiresAt: string;
}

export type AuditAction =
  | 'auth.sign_in'
  | 'auth.sign_out'
  | 'auth.view_as'
  | 'asset.view'
  | 'asset.download'
  | 'asset.upload'
  | 'asset.author'
  | 'asset.link'
  | 'asset.migrate'
  | 'asset.update'
  | 'asset.delete'
  | 'asset.generate'
  | 'asset.validate'
  | 'asset.submit'
  | 'asset.approve'
  | 'asset.reject'
  | 'asset.access_denied'
  | 'taxonomy.create';

export interface AuditEvent {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  action: AuditAction;
  assetId?: string;
  assetTitle?: string;
  details?: string;
}

export interface AssetRef {
  id: string;
  title: string;
  category: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: AssetRef[];
  createdAt: string;
  error?: boolean;
}

export interface SourceSystem {
  id: string;
  name: string;
  vendor: string;
  region: Region;
  description: string;
  acquiredCompany?: string;
  native?: boolean;
}

export interface RemoteItem {
  sourceId: string;
  path: string;
  name: string;
  mime: string;
  sizeBytes: number;
  modifiedAt: string;
  suggestedCategory: string;
}

export interface DashboardStats {
  totalVisible: number;
  bySource: { sourceId: string; linked: number; migrated: number }[];
  byCategory: Record<string, number>;
  byStatus: Record<AssetStatus, number>;
  pendingApprovalForMe: number;
  expiringSoon: { id: string; title: string; rightsExpiry: string }[];
  migratedShare: number;
}
