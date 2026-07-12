/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Dark mode is toggled via the 'data-theme="dark"' attribute on <html>
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Cormorant Garamond', 'Georgia', 'Times New Roman', 'serif'],
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'monospace'],
      },
      colors: {
        // ── Semantic Token Colors (respond to theme via CSS vars) ──
        // Use these in all components. Never use raw Tailwind palette colors
        // (e.g., slate-800, gray-100) inside dashboard-scoped components.

        // Backgrounds
        'bg-primary':   'var(--color-bg-primary)',
        'bg-secondary': 'var(--color-bg-secondary)',
        'bg-card':      'var(--color-bg-card)',
        'bg-muted':     'var(--color-bg-muted)',
        'bg-elevated':  'var(--color-bg-elevated)',
        'bg-dark':      'var(--color-bg-dark)',

        // Text
        'text-primary':   'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted':     'var(--color-text-muted)',
        'text-inverse':   'var(--color-text-inverse)',
        'text-accent':    'var(--color-text-accent)',

        // Accent (Muted Gold)
        'accent':        'var(--color-accent)',
        'accent-dark':   'var(--color-accent-dark)',
        'accent-light':  'var(--color-accent-light)',
        'accent-subtle': 'var(--color-accent-subtle)',

        // Borders
        'border':        'var(--color-border)',
        'border-warm':   'var(--color-border)',
        'border-strong': 'var(--color-border-strong)',
        'divider':       'var(--color-divider)',

        // Interactive
        'hover':         'var(--color-hover)',
        'hover-bg':      'var(--color-hover)',

        // Semantic
        'success':    'var(--color-success)',
        'success-bg': 'var(--color-success-bg)',
        'warning':    'var(--color-warning)',
        'warning-bg': 'var(--color-warning-bg)',
        'danger':     'var(--color-danger)',
        'danger-bg':  'var(--color-danger-bg)',
        'info':       'var(--color-info)',
        'info-bg':    'var(--color-info-bg)',
      },
      borderRadius: {
        'sm':  '4px',
        'md':  '8px',
        'lg':  '12px',
        'xl':  '16px',
        '2xl': '24px',
      },
      boxShadow: {
        'xs':    '0 1px 2px rgba(0, 0, 0, 0.04)',
        'card':  '0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
        'hover': '0 8px 24px rgba(0, 0, 0, 0.10), 0 4px 8px rgba(0, 0, 0, 0.06)',
        'panel': '0 20px 40px rgba(0, 0, 0, 0.08), 0 4px 16px rgba(0, 0, 0, 0.04)',
      },
      maxWidth: {
        'container': '1280px',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
      },
      letterSpacing: {
        'eyebrow': '0.1em',
      },
    },
  },
  plugins: [],
}
