import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * NotFoundPage — rendered for any route not matched in the router.
 * Full-page, standalone (no sidebar), warm CipherLens theme.
 */
export default function NotFoundPage() {
  const location = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw subtle animated hex grid on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const HEX = 32;
    const W = HEX * Math.sqrt(3);
    const H = HEX * 2;
    let frame = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cols = Math.ceil(canvas.width / W) + 2;
      const rows = Math.ceil(canvas.height / (H * 0.75)) + 2;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * W + (row % 2 === 0 ? 0 : W / 2);
          const y = row * (H * 0.75);
          const pulse = Math.sin(frame * 0.01 + col * 0.4 + row * 0.6) * 0.5 + 0.5;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const px = x + HEX * 0.9 * Math.cos(angle);
            const py = y + HEX * 0.9 * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.strokeStyle = `rgba(196, 147, 63, ${0.04 + pulse * 0.05})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      frame++;
    };

    const interval = setInterval(draw, 50);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const badPath = location.pathname;

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--color-bg-primary)', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>

      {/* Animated hex background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Radial glow centre */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(196,147,63,0.07) 0%, transparent 70%)' }}
      />

      {/* Top bar — logo only */}
      <header className="relative z-10 flex items-center gap-3 px-8 py-5" style={{ borderBottom: '1px solid #EDE8E0' }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#C4933F' }}>
          <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        </div>
        <span className="font-bold text-base tracking-tight" style={{ color: '#1E1508', fontFamily: 'var(--font-heading, Inter, sans-serif)' }}>
          Cipher<span style={{ color: '#C4933F' }}>Lens</span>
        </span>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">

        {/* Giant decorative solid 404 */}
        <div className="relative select-none mb-4">
          <span
            className="font-black leading-none"
            style={{
              fontSize: 'clamp(100px, 18vw, 200px)',
              color: '#C4933F',
              letterSpacing: '-0.04em',
              fontFamily: 'var(--font-heading, Inter, sans-serif)',
              display: 'inline-block',
              textShadow: '0 8px 30px rgba(196,147,63,0.15)',
            }}
          >
            404
          </span>
        </div>

        {/* Headline */}
        <h1
          className="font-black mb-3"
          style={{
            fontSize: 'clamp(24px, 3.5vw, 40px)',
            color: '#1E1508',
            fontFamily: 'var(--font-heading, Inter, sans-serif)',
            letterSpacing: '-0.02em',
          }}
        >
          Page Not Found
        </h1>

        <p className="text-sm font-medium mb-5 max-w-md leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          This URL doesn't belong to any CipherLens page. Check the address and try again.
        </p>

        {/* Bad URL pill */}
        <div
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl mb-8 font-mono text-xs max-w-xs truncate"
          style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
          title={badPath}
        >
          <svg className="w-3 h-3 flex-shrink-0" style={{ color: '#C4933F' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
          <span className="truncate">{window.location.origin}{badPath}</span>
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <Link
            to="/scans"
            className="px-6 py-3 rounded-2xl text-sm font-bold text-white transition-all"
            style={{ backgroundColor: '#C4933F', boxShadow: '0 4px 14px -2px rgba(196,147,63,0.45)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#A67C2E')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#C4933F')}
          >
            Go to Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer"
            style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#EDE8E0')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor='var(--color-bg-secondary)')}
          >
            ← Go Back
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6" style={{ borderTop: '1px solid #EDE8E0' }}>
        <p className="text-xs font-medium" style={{ color: '#C8B9A8' }}>
          © {new Date().getFullYear()} CipherLens · Defensive Security Auditing
        </p>
      </footer>
    </div>
  );
}
