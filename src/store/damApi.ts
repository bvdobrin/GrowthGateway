import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { triggerBrowserDownload } from '@/lib/download';
import * as assetService from '@/services/assetService';
import type { AuthorInput, LinkInput, UpdateInput, UploadInput } from '@/services/assetService';
import * as auditService from '@/services/auditService';
import * as connectorService from '@/services/connectorService';
import { ServiceError, toApiError, type ApiError } from '@/services/errors';
import * as generationService from '@/services/generationService';
import type { GenerateInput } from '@/services/generationService';
import { resetDb } from '@/services/mockDb';
import * as taxonomyService from '@/services/taxonomyService';
import type { NewCategoryInput } from '@/services/taxonomyService';
import type {
  Asset,
  AuditEvent,
  CategoryDefinition,
  DashboardStats,
  RemoteItem,
  SourceSystem,
  User,
} from '@/types';
import { selectCurrentUser, type SessionState } from './sessionSlice';

type Result<T> = { data: T } | { error: ApiError };

async function attempt<T>(work: () => Promise<T>): Promise<Result<T>> {
  try {
    return { data: await work() };
  } catch (error) {
    return { error: toApiError(error) };
  }
}

/** Every call runs as the effective user, so the access policy follows "view as". */
function asUser<T>(getState: () => unknown, work: (user: User) => Promise<T>): Promise<Result<T>> {
  const user = selectCurrentUser(getState() as { session: SessionState });
  if (!user) return Promise.resolve({ error: toApiError(new ServiceError('unauthenticated', 'Sign in required')) });
  return attempt(() => work(user));
}

const ASSET_LIST = { type: 'Asset' as const, id: 'LIST' };

export const damApi = createApi({
  reducerPath: 'damApi',
  baseQuery: fakeBaseQuery<ApiError>(),
  tagTypes: ['Asset', 'Category', 'Audit', 'Stats', 'Remote'],
  endpoints: (build) => ({
    listAssets: build.query<Asset[], void>({
      queryFn: (_arg, { getState }) => asUser(getState, assetService.listAssets),
      providesTags: (result) => [...(result ?? []).map((a) => ({ type: 'Asset' as const, id: a.id })), ASSET_LIST],
    }),
    getAsset: build.query<Asset, string>({
      queryFn: (id, { getState }) => asUser(getState, (user) => assetService.getAsset(user, id)),
      providesTags: (_result, _error, id) => [{ type: 'Asset', id }],
    }),
    getDashboardStats: build.query<DashboardStats, void>({
      queryFn: (_arg, { getState }) => asUser(getState, assetService.getDashboardStats),
      providesTags: ['Stats'],
    }),
    listCategories: build.query<CategoryDefinition[], void>({
      queryFn: () => attempt(taxonomyService.listCategories),
      providesTags: ['Category'],
    }),
    listSources: build.query<SourceSystem[], void>({
      queryFn: () => attempt(connectorService.listSources),
    }),
    listRemoteItems: build.query<RemoteItem[], string>({
      queryFn: (sourceId, { getState }) => asUser(getState, (user) => connectorService.listRemoteItems(user, sourceId)),
      providesTags: (_result, _error, sourceId) => [{ type: 'Remote', id: sourceId }],
    }),
    listAudit: build.query<AuditEvent[], void>({
      queryFn: (_arg, { getState }) => asUser(getState, auditService.listAudit),
      providesTags: ['Audit'],
    }),

    uploadAssets: build.mutation<Asset[], UploadInput>({
      queryFn: (input, { getState }) => asUser(getState, (user) => assetService.uploadAssets(user, input)),
      invalidatesTags: [ASSET_LIST, 'Stats', 'Audit'],
    }),
    authorAsset: build.mutation<Asset, AuthorInput>({
      queryFn: (input, { getState }) => asUser(getState, (user) => assetService.authorAsset(user, input)),
      invalidatesTags: [ASSET_LIST, 'Stats', 'Audit'],
    }),
    linkLegacyAsset: build.mutation<Asset, LinkInput>({
      queryFn: (input, { getState }) => asUser(getState, (user) => assetService.linkLegacyAsset(user, input)),
      invalidatesTags: (_result, _error, input) => [ASSET_LIST, 'Stats', 'Audit', { type: 'Remote', id: input.sourceId }],
    }),
    updateAsset: build.mutation<Asset, { id: string; patch: UpdateInput }>({
      queryFn: ({ id, patch }, { getState }) => asUser(getState, (user) => assetService.updateAsset(user, id, patch)),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Asset', id }, ASSET_LIST, 'Stats', 'Audit'],
    }),
    deleteAsset: build.mutation<{ id: string; title: string }, string>({
      queryFn: (id, { getState }) => asUser(getState, (user) => assetService.deleteAsset(user, id)),
      invalidatesTags: (_result, _error, id) => [{ type: 'Asset', id }, ASSET_LIST, 'Stats', 'Audit'],
    }),
    deleteAssets: build.mutation<{ deleted: { id: string; title: string }[]; skipped: number }, string[]>({
      queryFn: (ids, { getState }) => asUser(getState, (user) => assetService.deleteAssets(user, ids)),
      invalidatesTags: [ASSET_LIST, 'Stats', 'Audit'],
    }),
    validateAsset: build.mutation<Asset, string>({
      queryFn: (id, { getState }) => asUser(getState, (user) => assetService.validateAsset(user, id)),
      invalidatesTags: (_result, _error, id) => [{ type: 'Asset', id }, ASSET_LIST, 'Stats', 'Audit'],
    }),
    submitForApproval: build.mutation<Asset, string>({
      queryFn: (id, { getState }) => asUser(getState, (user) => assetService.submitForApproval(user, id)),
      invalidatesTags: (_result, _error, id) => [{ type: 'Asset', id }, ASSET_LIST, 'Stats', 'Audit'],
    }),
    decideApproval: build.mutation<Asset, { id: string; decision: 'approved' | 'rejected'; comment?: string }>({
      queryFn: ({ id, decision, comment }, { getState }) =>
        asUser(getState, (user) => assetService.decideApproval(user, id, decision, comment)),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Asset', id }, ASSET_LIST, 'Stats', 'Audit'],
    }),
    migrateAsset: build.mutation<Asset, string>({
      queryFn: (id, { getState }) => asUser(getState, (user) => assetService.migrateAsset(user, id)),
      invalidatesTags: (_result, _error, id) => [{ type: 'Asset', id }, ASSET_LIST, 'Stats', 'Audit'],
    }),
    generateVariant: build.mutation<Asset, GenerateInput>({
      queryFn: (input, { getState }) => asUser(getState, (user) => generationService.generateVariant(user, input)),
      invalidatesTags: (_result, _error, { assetId }) => [{ type: 'Asset', id: assetId }, ASSET_LIST, 'Stats', 'Audit'],
    }),
    downloadAsset: build.mutation<{ fileName: string }, { id: string; fileId?: string }>({
      queryFn: ({ id, fileId }, { getState }) =>
        asUser(getState, async (user) => {
          const { fileName, blob } = await assetService.downloadAsset(user, id, fileId);
          triggerBrowserDownload(blob, fileName);
          return { fileName };
        }),
      invalidatesTags: ['Audit'],
    }),
    createCategory: build.mutation<CategoryDefinition, NewCategoryInput>({
      queryFn: (input, { getState }) => asUser(getState, (user) => taxonomyService.createCategory(user, input)),
      invalidatesTags: ['Category', 'Audit'],
    }),
    resetDemoData: build.mutation<null, void>({
      queryFn: () =>
        attempt(async () => {
          await resetDb();
          return null;
        }),
      invalidatesTags: [ASSET_LIST, 'Asset', 'Category', 'Audit', 'Stats', 'Remote'],
    }),
  }),
});

export const {
  useListAssetsQuery,
  useGetAssetQuery,
  useGetDashboardStatsQuery,
  useListCategoriesQuery,
  useListSourcesQuery,
  useListRemoteItemsQuery,
  useListAuditQuery,
  useUploadAssetsMutation,
  useAuthorAssetMutation,
  useLinkLegacyAssetMutation,
  useUpdateAssetMutation,
  useDeleteAssetMutation,
  useDeleteAssetsMutation,
  useValidateAssetMutation,
  useSubmitForApprovalMutation,
  useDecideApprovalMutation,
  useMigrateAssetMutation,
  useGenerateVariantMutation,
  useDownloadAssetMutation,
  useCreateCategoryMutation,
  useResetDemoDataMutation,
} = damApi;
