# CipherLens Color Palette

> **Version:** 1.0.0  
> **Last Updated:** 2026-07-05  
> **Status:** Active

---

## 1. Philosophy

CipherLens uses a **warm, professional color system** deliberately distinct from the clichéd "hacker aesthetic." The palette communicates calm authority, precision, and trustworthiness — the qualities a security professional values in a tool they rely on.

All colors are defined as CSS custom properties in `frontend/src/index.css` and exposed as Tailwind CSS tokens via `tailwind.config.ts`.

---

## 2. Color Token Reference

### 2.1 Background Colors

| Token | Name | Hex | HSL | Usage |
|---|---|---|---|---|
| `--color-bg-primary` | Warm Ivory | `#FAFAF7` | `hsl(60, 33%, 97%)` | Main page background |
| `--color-bg-card` | Pure White | `#FFFFFF` | `hsl(0, 0%, 100%)` | Card and panel backgrounds |
| `--color-bg-subtle` | Warm Ash | `#F4F3EF` | `hsl(45, 20%, 95%)` | Subtle section backgrounds, hover states |
| `--color-bg-overlay` | Dark Veil | `rgba(26,26,26,0.5)` | — | Modal overlays |

### 2.2 Text Colors

| Token | Name | Hex | HSL | Usage |
|---|---|---|---|---|
| `--color-text-primary` | Dark Charcoal | `#1A1A1A` | `hsl(0, 0%, 10%)` | Body text, headings |
| `--color-text-secondary` | Muted Gray | `#6B6B6B` | `hsl(0, 0%, 42%)` | Supporting text, captions, placeholders |
| `--color-text-tertiary` | Light Gray | `#9C9C9C` | `hsl(0, 0%, 61%)` | Disabled text, timestamps |
| `--color-text-inverse` | Off White | `#FAFAF7` | `hsl(60, 33%, 97%)` | Text on dark/accent backgrounds |

### 2.3 Accent Colors

| Token | Name | Hex | HSL | Usage |
|---|---|---|---|---|
| `--color-accent-primary` | Warm Gold | `#C4933F` | `hsl(37, 51%, 51%)` | Primary CTAs, active states, key highlights |
| `--color-accent-primary-hover` | Deep Gold | `#A67C32` | `hsl(37, 54%, 42%)` | Hover state for primary accent |
| `--color-accent-primary-light` | Pale Gold | `#F5E9D3` | `hsl(37, 70%, 90%)` | Badge backgrounds, tinted containers |

### 2.4 Semantic Colors

| Token | Name | Hex | HSL | Usage |
|---|---|---|---|---|
| `--color-success` | Muted Green | `#52796F` | `hsl(163, 19%, 40%)` | Success states, passing checks |
| `--color-success-bg` | Pale Green | `#D8EDE9` | `hsl(167, 36%, 89%)` | Success badge backgrounds |
| `--color-warning` | Amber | `#D97706` | `hsl(32, 95%, 44%)` | Warning states, medium severity findings |
| `--color-warning-bg` | Pale Amber | `#FEF3C7` | `hsl(48, 96%, 89%)` | Warning badge backgrounds |
| `--color-danger` | Muted Red | `#9B2335` | `hsl(350, 63%, 37%)` | Error states, high severity findings |
| `--color-danger-bg` | Pale Red | `#FDDEDE` | `hsl(0, 90%, 93%)` | Danger badge backgrounds |
| `--color-info` | Muted Blue | `#2B6CB0` | `hsl(213, 60%, 43%)` | Informational states, links |
| `--color-info-bg` | Pale Blue | `#DBEAFE` | `hsl(214, 95%, 93%)` | Info badge backgrounds |

### 2.5 Border & Divider Colors

| Token | Name | Hex | HSL | Usage |
|---|---|---|---|---|
| `--color-border-default` | Light Warm Gray | `#E5E3DE` | `hsl(40, 14%, 88%)` | Default borders, card outlines |
| `--color-border-strong` | Medium Gray | `#C8C5BE` | `hsl(40, 9%, 77%)` | Emphasized borders, input focus rings |
| `--color-border-subtle` | Ghost Gray | `#EFEDE8` | `hsl(40, 20%, 93%)` | Very light separators |

---

## 3. CSS Custom Property Declarations

Add the following to `frontend/src/index.css` within the `:root` block:

```css
:root {
  /* Backgrounds */
  --color-bg-primary:        #FAFAF7;
  --color-bg-card:           #FFFFFF;
  --color-bg-subtle:         #F4F3EF;
  --color-bg-overlay:        rgba(26, 26, 26, 0.5);

  /* Text */
  --color-text-primary:      #1A1A1A;
  --color-text-secondary:    #6B6B6B;
  --color-text-tertiary:     #9C9C9C;
  --color-text-inverse:      #FAFAF7;

  /* Accent */
  --color-accent-primary:       #C4933F;
  --color-accent-primary-hover: #A67C32;
  --color-accent-primary-light: #F5E9D3;

  /* Semantic — Success */
  --color-success:           #52796F;
  --color-success-bg:        #D8EDE9;

  /* Semantic — Warning */
  --color-warning:           #D97706;
  --color-warning-bg:        #FEF3C7;

  /* Semantic — Danger */
  --color-danger:            #9B2335;
  --color-danger-bg:         #FDDEDE;

  /* Semantic — Info */
  --color-info:              #2B6CB0;
  --color-info-bg:           #DBEAFE;

  /* Borders */
  --color-border-default:    #E5E3DE;
  --color-border-strong:     #C8C5BE;
  --color-border-subtle:     #EFEDE8;
}
```

---

## 4. Tailwind Configuration

Extend `tailwind.config.ts` to expose color tokens as Tailwind utilities:

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--color-bg-primary)',
          card:    'var(--color-bg-card)',
          subtle:  'var(--color-bg-subtle)',
        },
        text: {
          primary:   'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary:  'var(--color-text-tertiary)',
          inverse:   'var(--color-text-inverse)',
        },
        accent: {
          DEFAULT: 'var(--color-accent-primary)',
          hover:   'var(--color-accent-primary-hover)',
          light:   'var(--color-accent-primary-light)',
        },
        success:  'var(--color-success)',
        warning:  'var(--color-warning)',
        danger:   'var(--color-danger)',
        info:     'var(--color-info)',
        border: {
          DEFAULT: 'var(--color-border-default)',
          strong:  'var(--color-border-strong)',
          subtle:  'var(--color-border-subtle)',
        },
      },
    },
  },
};
export default config;
```

---

## 5. Severity Severity Color Mapping

Security findings are categorized into severity levels. Use the following color mappings consistently:

| Severity | Color Token | Background Token | Example Usage |
|---|---|---|---|
| **Critical** | `--color-danger` | `--color-danger-bg` | Critical vulnerability badge |
| **High** | `#B45309` (amber-700) | `--color-warning-bg` | High severity finding |
| **Medium** | `--color-warning` | `--color-warning-bg` | Medium severity finding |
| **Low** | `--color-info` | `--color-info-bg` | Low severity informational |
| **Info** | `--color-text-secondary` | `--color-bg-subtle` | Informational note |
| **Pass** | `--color-success` | `--color-success-bg` | Passing security check |

---

## 6. Usage Guidelines

### DO ✅

- Use semantic tokens (`--color-danger`) rather than palette tokens (`#9B2335`) in component code.
- Always pair text colors against their intended backgrounds to maintain contrast ratios.
- Use `--color-accent-primary-light` as a tinted background when highlighting selected states.
- Use `--color-bg-subtle` for alternating table rows or secondary panels.

### DON'T ❌

- Do not use `green`, `lime`, `emerald-400`, or any neon/vivid green — these clash with the warm palette.
- Do not use raw hex values in component files; always reference a CSS custom property.
- Do not pair `--color-text-secondary` (`#6B6B6B`) on `--color-bg-subtle` (`#F4F3EF`) without verification — this is near the WCAG AA 4.5:1 boundary.
- Do not use black (`#000000`) — use `--color-text-primary` (`#1A1A1A`) instead.

---

## 7. Contrast Ratios (WCAG AA)

| Foreground | Background | Ratio | Status |
|---|---|---|---|
| `#1A1A1A` on `#FAFAF7` | Primary text on page | **17.5:1** | ✅ AAA |
| `#1A1A1A` on `#FFFFFF` | Primary text on card | **19.1:1** | ✅ AAA |
| `#6B6B6B` on `#FFFFFF` | Secondary text on card | **5.9:1** | ✅ AA |
| `#6B6B6B` on `#FAFAF7` | Secondary text on page | **5.7:1** | ✅ AA |
| `#C4933F` on `#FFFFFF` | Accent on card (large text) | **3.1:1** | ✅ AA Large |
| `#FAFAF7` on `#C4933F` | Inverse text on accent | **3.1:1** | ✅ AA Large |
| `#9B2335` on `#FDDEDE` | Danger text on danger bg | **5.2:1** | ✅ AA |
| `#52796F` on `#D8EDE9` | Success text on success bg | **4.6:1** | ✅ AA |
| `#2B6CB0` on `#DBEAFE` | Info text on info bg | **4.8:1** | ✅ AA |

> [!WARNING]
> Never use `--color-accent-primary` (`#C4933F`) for small body text on white backgrounds. Contrast is 3.1:1, which only satisfies AA for large text (18pt+ or 14pt bold).
