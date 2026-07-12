import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import logoImg from '../assets/logo.png';

const navLinks = [
  { label: 'Platform', href: '#', hasDropdown: true },
  { label: 'Scanners', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Documentation', href: '#docs' },
  { label: 'Resources', href: '#', hasDropdown: true },
];

/**
 * Navbar — Top navigation bar for CipherLens.
 * Sticky, with subtle blur backdrop on scroll.
 */
export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { openLoginModal } = useUIStore();
  const { accessToken, clearAuth } = useAuthStore();

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-border-warm"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 92%, transparent)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div className="container-main flex items-center justify-between h-14">
        {/* Logo */}
        <a href="/" className="flex items-center gap-3 flex-shrink-0 group">
          <img src={logoImg} alt="CipherLens" className="w-8 h-8 object-contain transition-transform group-hover:scale-105" />
          <div className="flex flex-col leading-none">
            <span
              className="text-lg font-bold tracking-wide font-serif relative"
              style={{ 
                color: 'var(--color-text-primary)',
                textShadow: '0 2px 4px rgba(0,0,0,0.15)'
              }}
            >
              Cipher<span style={{ color: 'var(--color-accent)' }}>lens</span>
            </span>
            <div className="flex justify-center -mt-1.5">
              <span className="text-[10px]" style={{ color: 'var(--color-accent)' }}>✦</span>
            </div>
          </div>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-nav px-3 py-1.5 rounded-md hover:bg-bg-secondary hover:text-text-primary transition-all flex items-center gap-0.5"
            >
              {link.label}
              {link.hasDropdown && (
                <svg className="w-3 h-3 mt-px text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </a>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          {accessToken ? (
            <>
              <Button variant="secondary" size="sm" href="/scans">
                Go to Console →
              </Button>
              <button
                onClick={clearAuth}
                className="text-nav text-danger hover:text-danger transition-colors cursor-pointer focus:outline-none text-[11px] font-semibold"
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={openLoginModal}
                className="text-nav hover:text-text-primary transition-colors cursor-pointer focus:outline-none"
              >
                Log In
              </button>
              <Button variant="primary" size="sm" href="/signup">
                Start Free Scan →
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-bg-secondary transition-colors"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t border-border-warm bg-bg-primary"
          >
            <div className="container-main py-4 flex flex-col gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-nav px-3 py-2.5 rounded-md hover:bg-bg-secondary transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="border-t border-border-warm my-2 pt-3 flex flex-col gap-2">
                {accessToken ? (
                  <>
                    <Button
                      variant="secondary"
                      href="/scans"
                      onClick={() => setMobileOpen(false)}
                    >
                      Go to Console →
                    </Button>
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        clearAuth();
                      }}
                      className="text-nav px-3 py-2 text-left text-danger hover:text-danger transition-colors cursor-pointer focus:outline-none text-[11px] font-semibold"
                    >
                      Log Out
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        openLoginModal();
                      }}
                      className="text-nav px-3 py-2 text-left cursor-pointer focus:outline-none"
                    >
                      Log In
                    </button>
                    <Button
                      variant="primary"
                      href="/signup"
                      onClick={() => setMobileOpen(false)}
                    >
                      Start Free Scan →
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
