import { Navigate, Outlet, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  isAuthenticated: boolean;
  isLoading?: boolean;
}

export function ProtectedRoute({ isAuthenticated, isLoading = false }: ProtectedRouteProps) {
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-50">
        <div className="rounded-xl border border-brand-200 bg-white px-5 py-3 text-sm font-semibold text-brand-700">
          Resolving access permissions...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
