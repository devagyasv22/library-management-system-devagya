import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Settings as SettingsIcon, LogOut, CreditCard, Bell, BookOpen, Sun, Moon } from 'lucide-react';

const navItems = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/members',  icon: Users,           label: 'Members'   },
  { to: '/payments', icon: CreditCard,      label: 'Payments'  },
  { to: '/settings', icon: SettingsIcon,    label: 'Settings'  },
];

const pageTitles = {
  '/':         'Dashboard',
  '/members':  'Members',
  '/payments': 'Payments',
  '/settings': 'Settings',
};

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/login');
  };

  // Theme toggle
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex transition-colors duration-300">

      {/* ── Sidebar ── */}
      <aside className="w-64 bg-slate-900 dark:bg-slate-950 flex flex-col fixed h-full z-20 border-r border-transparent dark:border-slate-800">

        {/* Logo */}
        <div className="px-6 py-5 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <BookOpen size={16} className="text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              LibPro
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 ml-10">Admin Panel</p>
        </div>

        {/* Nav label */}
        <div className="px-6 pt-6 pb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Menu</p>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 group relative ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {/* Active left bar */}
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full" />
                )}
                <Icon size={18} />
                <span className="font-medium text-sm">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom: logout + version */}
        <div className="p-4 border-t border-slate-800 space-y-1">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-2.5 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all w-full"
          >
            <LogOut size={18} />
            <span className="font-medium text-sm">Logout</span>
          </button>
          <p className="text-xs text-slate-600 text-center pt-1">v1.0.0</p>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">

        {/* Top header */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-4 sticky top-0 z-10 flex items-center justify-between transition-colors duration-300">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
              {pageTitles[location.pathname] || 'LibPro'}
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Theme Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Bell */}
            <button className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors relative">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Avatar */}
            <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-1.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                A
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Admin</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-8 max-w-screen-xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="px-8 py-4 text-center text-xs text-slate-400 dark:text-slate-600 border-t border-slate-200 dark:border-slate-800 transition-colors">
          LibPro © {new Date().getFullYear()} — Library Management System
        </footer>
      </div>
    </div>
  );
}