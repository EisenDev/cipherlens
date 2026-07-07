import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export default function Topbar() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = () => {
    clearAuth();
    navigate('/');
  };

  return (
    <header className="h-16 border-b border-border-warm bg-white flex items-center justify-between px-8 sticky top-0 z-20">
      {/* Search Input Container */}
      <div className="relative w-72">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-xs">🔍</span>
        <input
          type="text"
          placeholder="Search anything..."
          disabled
          className="w-full pl-9 pr-12 py-1.5 rounded-xl border border-border-warm bg-bg-primary text-body-sm focus:outline-none placeholder:text-text-muted"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-body-xs font-medium font-bold text-text-muted border border-border-warm bg-white px-1.5 py-0.5 rounded shadow-sm">
          ⌘ K
        </span>
      </div>

      {/* Right Toolbar */}
      <div className="flex items-center gap-5">
        {/* Notifications Icon with count indicator */}
        <button className="relative w-8 h-8 rounded-full border border-border-warm flex items-center justify-center hover:bg-bg-primary transition-colors cursor-pointer group">
          <span className="text-sm">🔔</span>
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white font-bold text-body-xs flex items-center justify-center border border-white">
            3
          </span>
        </button>

        {/* Help icon button */}
        <button className="w-8 h-8 rounded-full border border-border-warm flex items-center justify-center hover:bg-bg-primary transition-colors cursor-pointer">
          <span className="text-sm">❓</span>
        </button>

        {/* Separator line */}
        <div className="w-px h-6 bg-border-warm" />

        {/* User Account Menu Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-amber-50 border border-accent/20 flex items-center justify-center text-accent font-bold text-body-sm uppercase select-none group-hover:border-accent transition-colors">
              {user?.fullName?.substring(0, 2) || 'JD'}
            </div>
            <div className="text-left text-body-sm leading-tight hidden sm:block">
              <p className="font-semibold text-text-primary group-hover:text-accent transition-colors">
                {user?.fullName || 'John Doe'}
              </p>
              <p className="text-body-sm text-text-muted">
                {user?.companyName || 'Acme Corp'}
              </p>
            </div>
            <span className="text-body-xs text-text-muted group-hover:text-text-primary transition-colors">▼</span>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white border border-border-warm shadow-panel py-2 text-xs font-semibold text-text-primary z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-2 border-b border-border-warm text-left">
                <p className="text-text-primary truncate">{user?.fullName || 'John Doe'}</p>
                <p className="text-body-sm text-text-muted truncate mt-0.5">{user?.email || 'admin@acme.com'}</p>
              </div>
              <Link
                to="/"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2 px-4 py-2 hover:bg-bg-secondary transition-colors text-left w-full"
              >
                <span>🏠</span> Home Page
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors text-left w-full cursor-pointer"
              >
                <span>🚪</span> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
