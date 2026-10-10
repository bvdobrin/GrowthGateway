import { Route, Routes } from 'react-router-dom';
import { AddAssetPage } from '@/pages/AddAsset/AddAssetPage';
import { ApprovalsPage } from '@/pages/Approvals/ApprovalsPage';
import { AssetDetailPage } from '@/pages/AssetDetail/AssetDetailPage';
import { AuditPage } from '@/pages/Audit/AuditPage';
import { DashboardPage } from '@/pages/Dashboard/DashboardPage';
import { NotFoundPage } from '@/pages/Errors/ErrorPages';
import { GeneratePage } from '@/pages/Generate/GeneratePage';
import { LibraryPage } from '@/pages/Library/LibraryPage';
import { LoginPage } from '@/pages/Login/LoginPage';
import { TaxonomyPage } from '@/pages/Taxonomy/TaxonomyPage';
import { AppShell } from './AppShell';
import { ProtectedRoute, RequirePermission } from './guards';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="assets" element={<LibraryPage />} />
        <Route
          path="assets/new"
          element={
            <RequirePermission permission="asset:upload">
              <AddAssetPage />
            </RequirePermission>
          }
        />
        <Route path="assets/:id" element={<AssetDetailPage />} />
        <Route
          path="generate"
          element={
            <RequirePermission permission="asset:generate">
              <GeneratePage />
            </RequirePermission>
          }
        />
        <Route
          path="approvals"
          element={
            <RequirePermission permission="asset:approve">
              <ApprovalsPage />
            </RequirePermission>
          }
        />
        <Route
          path="audit"
          element={
            <RequirePermission permission="admin:audit">
              <AuditPage />
            </RequirePermission>
          }
        />
        <Route
          path="admin/taxonomy"
          element={
            <RequirePermission permission="admin:taxonomy">
              <TaxonomyPage />
            </RequirePermission>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
