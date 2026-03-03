import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { LogOut, Calendar, Users, ClipboardList } from 'lucide-react';

export function Layout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { label: 'ダッシュボード', path: '/', icon: Calendar },
    { label: '申請一覧', path: '/requests', icon: ClipboardList },
  ];

  if (profile?.role === 'manager' || profile?.role === 'admin') {
    navItems.push({ label: '申請管理', path: '/manage', icon: Users });
  }

  if (profile?.role === 'admin') {
    navItems.push({ label: 'ユーザー管理', path: '/admin/users', icon: Users });
  }

  const roleLabels: Record<string, string> = {
    admin: '管理者',
    manager: 'マネージャー',
    employee: '社員'
  };
...
            <div className="flex items-center">
              <div className="mr-4 text-sm text-gray-700">
                {profile?.display_name || profile?.email} ({profile?.role ? roleLabels[profile.role] : ''})
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
                title="ログアウト"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
