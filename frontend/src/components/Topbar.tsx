import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { ArrowLeft } from 'lucide-react';

export default function Topbar() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAssetDetailPath = location.pathname.startsWith('/assets/') && location.pathname !== '/assets';

  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path.startsWith('/overview')) return { category: 'Workspace', page: 'Overview' };
    if (path.startsWith('/assets')) return { category: 'Workspace', page: 'Assets' };
    if (path.startsWith('/scans')) return { category: 'Workspace', page: 'Scans' };
    if (path.startsWith('/findings')) return { category: 'Analysis', page: 'Findings' };
    if (path.startsWith('/ai-analysis')) return { category: 'Analysis', page: 'AI Analysis' };
    if (path.startsWith('/compliance')) return { category: 'Analysis', page: 'Compliance' };
    if (path.startsWith('/schedules')) return { category: 'Automation', page: 'Schedules' };
    if (path.startsWith('/integrations')) return { category: 'Automation', page: 'Integrations' };
    if (path.startsWith('/api-keys')) return { category: 'Automation', page: 'API Keys' };
    if (path.startsWith('/team')) return { category: 'Workspace', page: 'Team' };
    if (path.startsWith('/organizations')) return { category: 'Workspace', page: 'Organizations' };
    if (path.startsWith('/billing')) return { category: 'Workspace', page: 'Billing' };
    if (path.startsWith('/settings')) return { category: 'Settings', page: 'Settings' };
    if (path.startsWith('/notifications')) return { category: 'Settings', page: 'Notifications' };
    if (path.startsWith('/audit-logs')) return { category: 'Settings', page: 'Audit Logs' };
    if (path.startsWith('/support')) return { category: 'Settings', page: 'Support' };
    return { category: 'CipherLens', page: 'Console' };
  };

  const breadcrumb = getBreadcrumb();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
        setShortcutsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = () => {
    clearAuth();
    navigate('/');
  };

  /** Derive user initials safely */
  const initials = user?.fullName
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? 'JD';

  const shortcuts = [
    { keys: ['⌘', 'K'], label: 'Quick search' },
    { keys: ['⌘', 'N'], label: 'New scan' },
    { keys: ['⌘', 'R'], label: 'Refresh results' },
    { keys: ['⌘', '/'], label: 'Toggle shortcuts' },
  ];

  return (
    <header
      className="h-16 flex items-center justify-between px-8 sticky top-0 z-20"
      style={{
        backgroundColor: 'var(--color-bg-primary)',
        borderBottom: '1px solid var(--color-border)',
        boxShadow: '0 1px 6px 0 rgba(60, 40, 10, 0.06)',
      }}
    >
      {/* ── Left: Page context breadcrumb or Back Link ─────────────── */}
      {isAssetDetailPath ? (
        <Link 
          to="/assets"
          className="flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-text-primary transition-colors select-none"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Assets inventory
        </Link>
      ) : (
        <div className="flex items-center gap-1.5 text-xs select-none" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
          <span style={{ color: 'var(--color-text-secondary)' }}>{breadcrumb.category}</span>
          <span style={{ color: 'var(--color-border-strong)' }}>/</span>
          <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{breadcrumb.page}</span>
        </div>
      )}

      {/* ── Right: Actions ────────────────────────────── */}
      <div className="flex items-center gap-3">

        {/* Help Button */}
        <button
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer"
          style={{ backgroundColor: 'var(--color-bg-muted)', border: '1px solid var(--color-border)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-hover)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-muted)')}
          title="Help & Documentation"
        >
          <svg className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
        </button>

        {/* Divider */}
        <div className="w-px h-6" style={{ backgroundColor: 'var(--color-border)' }} />

        {/* ── User Profile Dropdown ─────────────────────── */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => { setProfileOpen(!profileOpen); setShortcutsOpen(false); }}
            className="flex items-center gap-2.5 cursor-pointer rounded-xl px-2.5 py-1.5 transition-all"
            style={{ border: '1px solid transparent' }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-muted)';
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'transparent';
            }}
          >
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase select-none flex-shrink-0"
              style={{ backgroundColor: 'var(--color-accent-subtle)', border: '1.5px solid var(--color-accent)', color: 'var(--color-accent-dark)' }}
            >
              {initials}
            </div>

            {/* Name + Company */}
            <div className="text-left leading-tight hidden sm:block">
              <p className="font-semibold text-xs" style={{ color: 'var(--color-text-primary)' }}>
                {user?.fullName ?? 'John Doe'}
              </p>
              <p className="text-[10px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                {user?.companyName ?? 'Acme Corp'}
              </p>
            </div>

            {/* Animated chevron */}
            <svg
              className={`w-3 h-3 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`}
              style={{ color: 'var(--color-text-secondary)' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {/* ── Dropdown Panel ─────────────────────────── */}
          {profileOpen && (
            <div
              className="absolute right-0 mt-2 w-64 rounded-2xl z-50 overflow-hidden"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)',
                boxShadow: '0 12px 32px -4px rgba(60, 40, 10, 0.14), 0 4px 10px -2px rgba(60, 40, 10, 0.07)',
              }}
            >
              {/* ── User info header ── */}
              <div className="p-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm uppercase select-none flex-shrink-0"
                  style={{ backgroundColor: 'var(--color-accent-subtle)', border: '2px solid var(--color-accent)', color: 'var(--color-accent-dark)' }}
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {user?.fullName ?? 'John Doe'}
                  </p>
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {user?.email ?? 'admin@acme.com'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                      style={{ backgroundColor: 'var(--color-accent-subtle)', color: 'var(--color-accent)', border: '1px solid var(--color-accent-light)' }}>
                      Free Plan
                    </span>
                    <span className="text-[9px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                      {user?.companyName ?? 'Acme Corp'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Navigation items ── */}
              <div className="py-1.5">
                <Link
                  to="/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors w-full text-left group"
                  style={{ color: 'var(--color-text-primary)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'var(--color-bg-muted)' }}>
                    <svg className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.645-.869l.214-1.28z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Account Settings</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Manage your profile & preferences</p>
                  </div>
                </Link>

                {/* Keyboard Shortcuts toggle */}
                <button
                  onClick={() => setShortcutsOpen(!shortcutsOpen)}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors w-full text-left"
                  style={{ color: 'var(--color-text-primary)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'var(--color-bg-muted)' }}>
                    <svg className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold">Keyboard Shortcuts</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>View all hotkeys</p>
                  </div>
                  <svg
                    className={`w-3 h-3 transition-transform duration-200 ${shortcutsOpen ? 'rotate-180' : ''}`}
                    style={{ color: 'var(--color-text-muted)' }}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {/* Shortcuts panel */}
                {shortcutsOpen && (
                  <div className="mx-3 mb-2 rounded-xl p-3 space-y-1.5" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                    {shortcuts.map((s) => (
                      <div key={s.label} className="flex items-center justify-between">
                        <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>{s.label}</span>
                        <div className="flex items-center gap-1">
                          {s.keys.map((k) => (
                            <kbd
                              key={k}
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: 'var(--color-hover)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
                            >
                              {k}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Footer: Sign Out ── */}
              <div style={{ borderTop: '1px solid var(--color-border)' }} className="py-1.5">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors text-left w-full cursor-pointer"
                  style={{ color: '#9B2335' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#FEE2E2' }}>
                    <svg className="w-3.5 h-3.5" style={{ color: '#9B2335' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Sign Out</p>
                    <p className="text-[10px] mt-0.5" style={{ color: '#F87171' }}>End your current session</p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
