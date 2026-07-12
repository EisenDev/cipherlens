import { Link } from 'react-router-dom';

/**
 * AccessBlockedPage — shown when a shared scan results link is Private
 * and the current viewer does not have permission to access it.
 * Standalone page (no sidebar), warm CipherLens amber-warning tone.
 */
export default function AccessBlockedPage() {
  const currentUrl = window.location.href;

  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg-primary)', fontFamily: 'var(--font-body, Inter, sans-serif)' }}
    >
      {/* Warm amber radial glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 55% 45% at 50% 35%, rgba(217,119,6,0.07) 0%, transparent 70%)' }}
      />

      {/* Top bar — logo only */}
      <header
        className="relative z-10 flex items-center gap-3 px-8 py-5 flex-shrink-0"
        style={{ borderBottom: '1px solid #EDE8E0' }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#C4933F' }}
        >
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        </div>
        <span
          className="font-bold text-base tracking-tight"
          style={{ color: '#1E1508', fontFamily: 'var(--font-heading, Inter, sans-serif)' }}
        >
          Cipher<span style={{ color: '#C4933F' }}>Lens</span>
        </span>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">

        {/* Status badge */}
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 animate-pulse"
          style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', color: '#92400E' }}
        >
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          Access Blocked
        </div>

        {/* Headline */}
        <h1
          className="font-black mb-3"
          style={{
            fontSize: 'clamp(24px, 3.5vw, 38px)',
            color: '#1E1508',
            fontFamily: 'var(--font-heading, Inter, sans-serif)',
            letterSpacing: '-0.02em',
          }}
        >
          This Report is Private
        </h1>

        <p className="text-sm font-medium mb-6 max-w-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          The owner of this security report has restricted access. You don't have permission to view it.
        </p>

        {/* Info card — beautifully centered */}
        <div
          className="w-full max-w-sm rounded-2xl p-5 mb-8 text-center flex flex-col items-center justify-center space-y-4"
          style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}
        >
          <div className="flex flex-col items-center justify-center">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center mb-2"
              style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A' }}
            >
              <svg className="w-4 h-4" style={{ color: '#D97706' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold mb-1" style={{ color: '#92400E' }}>Why am I seeing this?</p>
              <p className="text-xs font-medium leading-relaxed max-w-[280px]" style={{ color: '#A16207' }}>
                This scan report was shared with a <strong>Private</strong> visibility setting. Only the report owner and authorized CipherLens users can view its findings.
              </p>
            </div>
          </div>

          <div className="w-full pt-3 flex flex-col items-center justify-center" style={{ borderTop: '1px solid #FDE68A' }}>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center mb-2"
              style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A' }}
            >
              <svg className="w-4 h-4" style={{ color: '#D97706' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold mb-1" style={{ color: '#92400E' }}>What can I do?</p>
              <p className="text-xs font-medium leading-relaxed max-w-[280px]" style={{ color: '#A16207' }}>
                Contact the person who shared this link and ask them to change the visibility to <strong>Public</strong>, or sign in with an account that has access.
              </p>
            </div>
          </div>
        </div>

        {/* Shared URL display */}
        <div
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl mb-8 w-full max-w-sm font-mono text-xs justify-center"
          style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#C4933F' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <span className="truncate max-w-[250px]" title={currentUrl}>{currentUrl}</span>
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <Link
            to="/"
            className="px-6 py-3 rounded-2xl text-sm font-bold text-white transition-all"
            style={{ backgroundColor: '#C4933F', boxShadow: '0 4px 14px -2px rgba(196,147,63,0.40)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#A67C2E')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#C4933F')}
          >
            Sign In to CipherLens
          </Link>
          <Link
            to="/scans"
            className="px-6 py-3 rounded-2xl text-sm font-bold transition-all"
            style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#EDE8E0')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor='var(--color-bg-secondary)')}
          >
            Go to Dashboard
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="relative z-10 text-center py-6 flex-shrink-0"
        style={{ borderTop: '1px solid #EDE8E0' }}
      >
        <p className="text-xs font-medium" style={{ color: '#C8B9A8' }}>
          © {new Date().getFullYear()} CipherLens · Defensive Security Auditing
        </p>
      </footer>
    </div>
  );
}
