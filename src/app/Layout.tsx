import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { LogOut, Calendar, Users, ClipboardList, Menu, X, User } from 'lucide-react';

export function Layout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { label: 'ダッシュボード', path: '/', icon: Calendar },
    { label: '休暇カレンダー', path: '/calendar', icon: Calendar },
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

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 nav-blur border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-indigo-200 shadow-lg text-white">
                  <Calendar className="w-5 h-5" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  Tamaji
                </span>
              </Link>
              
              {/* Desktop Nav */}
              <nav className="hidden md:ml-10 md:flex md:space-x-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 flex items-center space-x-2 ${
                      location.pathname === item.path
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 ${location.pathname === item.path ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>

            {/* Desktop User Menu */}
            <div className="hidden md:flex items-center space-x-4">
              <Link 
                to="/profile" 
                className="flex items-center space-x-2 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-all text-sm font-medium text-slate-700"
              >
                <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-slate-600">
                  <User className="w-4 h-4" />
                </div>
                <span>{profile?.display_name || profile?.email?.split('@')[0]}</span>
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
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-semibold transition-colors ${
                    location.pathname === item.path
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
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
