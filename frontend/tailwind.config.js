/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Cormorant Garamond', 'Georgia', 'Times New Roman', 'serif'],
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'monospace'],
      },
      colors: {
        // Backgrounds
        'bg-primary': '#FAFAF7',
        'bg-secondary': '#F5F3EE',
        'bg-card': '#FFFFFF',
        'bg-muted': '#F0EDE6',
        'bg-dark': '#1A1A1A',

        // Text
        'text-primary': '#1A1A1A',
        'text-secondary': '#6B6B6B',
        'text-muted': '#9CA3AF',
        'text-inverse': '#FFFFFF',

        // Accent (Muted Gold)
        'accent': '#C4933F',
        'accent-dark': '#A67C2E',
        'accent-light': '#E8C98A',
        'accent-subtle': '#FDF6E7',

        // Borders
        'border-warm': '#E5E3DE',
        'border-strong': '#D1CEC8',
        'divider': '#EDEAE4',

        // Semantic
        'success': '#52796F',
        'success-bg': '#EBF4F1',
        'warning': '#D97706',
        'warning-bg': '#FEF3C7',
        'danger': '#9B2335',
        'danger-bg': '#FEE2E2',
        'info': '#2B6CB0',
        'info-bg': '#EBF4FF',
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
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
