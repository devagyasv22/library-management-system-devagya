import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Settings as SettingsIcon, LogOut, CreditCard } from 'lucide-react';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <div className="w-64 bg-white shadow-xl flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-center">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
            LibPro
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 transition-colors">
            <LayoutDashboard size={20} />
            <span className="font-medium">Dashboard</span>
          </Link>
          <Link to="/members" className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${location.pathname === '/members' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Users size={20} />
            <span>Members</span>
          </Link>
          <Link to="/payments" className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${location.pathname === '/payments' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
            <CreditCard size={20} />
            <span>Payments</span>
          </Link>
          <Link to="/settings" className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${location.pathname === '/settings' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
            <SettingsIcon size={20} />
            <span className="font-medium">Settings</span>
          </Link>
        </nav>
        
        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors w-full">
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
          <div className="flex justify-end">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                A
              </div>
            </div>
          </div>
        </header>
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
