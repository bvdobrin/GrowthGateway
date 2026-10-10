import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ForbiddenPage } from '@/pages/Errors/ErrorPages';
import { useAppSelector } from '@/store/hooks';
import { selectIsAuthenticated, selectPermissions } from '@/store/sessionSlice';
import type { Permission } from '@/types';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const authenticated = useAppSelector(selectIsAuthenticated);
  const location = useLocation();
  if (!authenticated) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  return <>{children}</>;
}

/** Route-level entitlement check. Services enforce the same permission independently. */
export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const permissions = useAppSelector(selectPermissions);
  if (!permissions.includes(permission)) return <ForbiddenPage permission={permission} />;
  return <>{children}</>;
}
