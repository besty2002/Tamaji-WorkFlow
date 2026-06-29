import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { LogOut, Calendar, Users, ClipboardList, Menu, X, User, Bell, Utensils, ReceiptText, type LucideIcon } from 'lucide-react';
import { NotificationBell } from '../components/ui/NotificationBell';

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: number;
}

export function Layout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fetch pending requests count for managers/admins
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['pendingRequestsCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'submitted');
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!profile && (profile.role === 'manager' || profile.role === 'admin'),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems: NavItem[] = [
    { label: 'ダッシュボード', path: '/', icon: Calendar },
    { label: '休暇カレンダー', path: '/calendar', icon: Calendar },
    { label: 'ランチ管理', path: '/lunch', icon: Utensils },
    { label: '申請一覧', path: '/requests', icon: ClipboardList },
  ];

  if (profile?.role === 'manager' || profile?.role === 'admin') {
    navItems.push({
      label: 'ランチ精算',
      path: '/lunch/admin',
      icon: ReceiptText,
    });
    navItems.push({ 
      label: '申請管理',
      path: '/manage', 
      icon: Users,
      badge: pendingCount > 0 ? pendingCount : undefined
    });
  }

  if (profile?.role === 'admin') {
    navItems.push({ label: 'ユーザー管理', path: '/admin/users', icon: Users });
  }

  const roleLabels: Record<string, string> = {
    admin: '管理者',
    manager: 'マネージャー',
    employee: '社員'
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 nav-blur border-b border-slate-200/60 shadow-sm">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-5">
          <div className="flex h-16 justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center">
              <Link to="/" className="flex shrink-0 items-center space-x-1.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-lg shadow-indigo-200">
                  <Calendar className="h-5 w-5" />
                </div>
                <span className="whitespace-nowrap bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-xl font-bold text-transparent">
                  Tamaji
                </span>
              </Link>
              
              {/* Desktop Nav */}
              <nav className="hidden min-w-0 md:ml-5 md:flex md:space-x-0.5">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex shrink-0 items-center space-x-1 whitespace-nowrap rounded-full px-2 py-1.5 text-xs font-semibold transition-all duration-200 lg:px-2.5 ${
                      location.pathname === item.path
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="relative">
                      <item.icon className={`h-3.5 w-3.5 ${location.pathname === item.path ? 'text-indigo-600' : 'text-slate-400'}`} />
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white ring-2 ring-white">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <span className="whitespace-nowrap">{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>

            {/* Desktop User Menu */}
            <div className="hidden shrink-0 items-center space-x-2 md:flex">
              <NotificationBell />
              <div className="h-4 w-px bg-slate-200"></div>
              <Link 
                to="/profile" 
                className="flex items-center space-x-1.5 rounded-full px-2 py-1.5 text-xs font-medium text-slate-700 transition-all hover:bg-slate-100 xl:px-3 xl:text-sm"
              >
                <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-slate-600">
                  <User className="w-4 h-4" />
                </div>
                <span className="hidden whitespace-nowrap xl:inline">{profile?.display_name || profile?.email?.split('@')[0]}</span>
                <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                  {profile?.role ? roleLabels[profile.role] : ''}
                </span>
              </Link>
              <div className="h-4 w-px bg-slate-200"></div>
              <button
                onClick={handleSignOut}
                className="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-all"
                title="ログアウト"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={toggleMobileMenu}
                className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden glass-card border-t border-slate-200 animate-in slide-in-from-top-4 duration-200">
            <div className="px-4 pt-2 pb-6 space-y-1">
              <div className="flex items-center px-3 py-4 mb-2 border-b border-slate-100">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mr-3">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{profile?.display_name || profile?.email}</div>
                  <div className="text-xs text-slate-500">{profile?.role ? roleLabels[profile.role] : ''}</div>
                </div>
              </div>
              
              <Link
                to="/notifications"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-base font-semibold transition-colors ${
                  location.pathname === '/notifications'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Bell className="w-5 h-5" />
                  <span>通知</span>
                </div>
              </Link>

              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-base font-semibold transition-colors ${
                    location.pathname === item.path
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
              <div className="pt-4 mt-4 border-t border-slate-100">
                <Link
                  to="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center space-x-3 px-4 py-3 text-slate-600 font-semibold"
                >
                  <User className="w-5 h-5" />
                  <span>プロフィール設定</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 font-semibold"
                >
                  <LogOut className="w-5 h-5" />
                  <span>ログアウト</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <Outlet />
      </main>
    </div>
  );
}
