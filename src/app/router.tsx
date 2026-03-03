import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './Layout';
import { Dashboard } from '../features/requests/Dashboard';
import { RequestList } from '../features/requests/RequestList';
import { RequestForm } from '../features/requests/RequestForm';
import { ManageRequests } from '../features/manage/ManageRequests';
import { UserManagement } from '../features/admin/UserManagement';
import { LoginForm } from '../features/auth/LoginForm';
import { LeaveCalendar } from '../features/calendar/LeaveCalendar';
import { ProfileSettings } from '../features/profile/ProfileSettings';
import { useAuth } from '../features/auth/AuthContext';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
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

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginForm />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/',
        element: <Dashboard />,
      },
      {
        path: '/calendar',
        element: <LeaveCalendar />,
      },
      {
        path: '/profile',
        element: <ProfileSettings />,
      },
      {
        path: '/requests',
        element: <RequestList />,
      },
      {
        path: '/requests/new',
        element: <RequestForm />,
      },
      {
        path: '/requests/:id',
        element: <RequestForm />,
      },
      {
        path: '/manage',
        element: (
          <ProtectedRoute allowedRoles={['manager', 'admin']}>
            <ManageRequests />
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/users',
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <UserManagement />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
