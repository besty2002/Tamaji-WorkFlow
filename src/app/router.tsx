import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './Layout';
import { ProtectedRoute } from './ProtectedRoute';
import { LoadingSpinner } from '../components/ui/States';

const Dashboard = lazy(() => import('../features/requests/Dashboard').then((module) => ({ default: module.Dashboard })));
const RequestList = lazy(() => import('../features/requests/RequestList').then((module) => ({ default: module.RequestList })));
const RequestForm = lazy(() => import('../features/requests/RequestForm').then((module) => ({ default: module.RequestForm })));
const ManageRequests = lazy(() => import('../features/manage/ManageRequests').then((module) => ({ default: module.ManageRequests })));
const UserManagement = lazy(() => import('../features/admin/UserManagement').then((module) => ({ default: module.UserManagement })));
const LoginForm = lazy(() => import('../features/auth/LoginForm').then((module) => ({ default: module.LoginForm })));
const LeaveCalendar = lazy(() => import('../features/calendar/LeaveCalendar').then((module) => ({ default: module.LeaveCalendar })));
const LunchCalendar = lazy(() => import('../features/lunch/LunchCalendar').then((module) => ({ default: module.LunchCalendar })));
const ProfileSettings = lazy(() => import('../features/profile/ProfileSettings').then((module) => ({ default: module.ProfileSettings })));
const NotificationList = lazy(() => import('../features/notifications/NotificationList').then((module) => ({ default: module.NotificationList })));

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<LoadingSpinner />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: withSuspense(<LoginForm />),
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
        element: withSuspense(<Dashboard />),
      },
      {
        path: '/calendar',
        element: withSuspense(<LeaveCalendar />),
      },
      {
        path: '/lunch',
        element: withSuspense(<LunchCalendar />),
      },
      {
        path: '/profile',
        element: withSuspense(<ProfileSettings />),
      },
      {
        path: '/notifications',
        element: withSuspense(<NotificationList />),
      },
      {
        path: '/requests',
        element: withSuspense(<RequestList />),
      },
      {
        path: '/requests/new',
        element: withSuspense(<RequestForm />),
      },
      {
        path: '/requests/:id',
        element: withSuspense(<RequestForm />),
      },
      {
        path: '/manage',
        element: (
          <ProtectedRoute allowedRoles={['manager', 'admin']}>
            {withSuspense(<ManageRequests />)}
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/users',
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            {withSuspense(<UserManagement />)}
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
