import { Navigate, Outlet } from "react-router-dom";
import type { UserRole } from "../types/auth";

interface RoleRouteProps {
  role: UserRole | null;
  allowedRoles: UserRole[];
  fallbackPath: string;
}

export function RoleRoute({ role, allowedRoles, fallbackPath }: RoleRouteProps) {
  if (!role) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <Outlet />;
}
