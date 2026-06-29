import { Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';

export function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { session, profile, isLoading } = useAuth();

  if (isLoading) return null;

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
