# CipherLens Typography System

> **Version:** 1.0.0  
> **Last Updated:** 2026-07-05  
> **Status:** Active

---

## 1. Philosophy

CipherLens uses a **dual-font editorial system** to create a refined, trustworthy visual identity. The contrast between a serif display font and a modern sans-serif body font creates clear hierarchy without resorting to aggressive weight contrasts.

---

## 2. Font Families

### 2.1 Heading Font — Cormorant Garamond

| Property | Value |
|---|---|
| **Family** | `'Cormorant Garamond', Georgia, serif` |
| **CSS Token** | `--font-heading` |
| **Source** | Google Fonts |
| **Weights Used** | 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold) |
| **Role** | Display headings, section titles, hero text, pull quotes |

**Rationale:** Cormorant Garamond carries editorial sophistication and warmth. Its high contrast strokes complement the warm gold accent color and signal that CipherLens is a precise, expert-level tool — not a commodity product.

### 2.2 Body Font — Inter

| Property | Value |
|---|---|
| **Family** | `'Inter', system-ui, -apple-system, sans-serif` |
| **CSS Token** | `--font-body` |
| **Source** | Google Fonts |
| **Weights Used** | 400 (Regular), 500 (Medium), 600 (SemiBold) |
| **Role** | Body text, UI labels, captions, navigation, data tables |

**Rationale:** Inter is engineered for screen legibility at all sizes, making it ideal for dashboards and data-dense interfaces. Its optical alignment is excellent for mixed-content UIs.

### 2.3 Monospace Font — JetBrains Mono

| Property | Value |
|---|---|
| **Family** | `'JetBrains Mono', 'Fira Code', monospace` |
| **CSS Token** | `--font-mono` |
| **Source** | Google Fonts |
| **Weights Used** | 400 (Regular), 500 (Medium) |
| **Role** | Code blocks, scan output, terminal-style data, API keys, hashes |

---

## 3. Google Fonts Import

Add the following to the `<head>` of `frontend/index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link
  href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
  rel="stylesheet"
>
```

---

## 4. CSS Custom Properties

```css
:root {
  --font-heading: 'Cormorant Garamond', Georgia, serif;
  --font-body:    'Inter', system-ui, -apple-system, sans-serif;
  --font-mono:    'JetBrains Mono', 'Fira Code', monospace;
}

body {
  font-family: var(--font-body);
  font-size:   16px;       /* Base: 1rem */
  line-height: 1.6;
  color:       var(--color-text-primary);
}
```

---

## 5. Type Scale

The type scale follows a **Major Third ratio (1.250)** with an established set of named steps. All values are in `rem` units, with `1rem = 16px` as base.

| Step | Token | rem | px | Role |
|---|---|---|---|---|
| `text-xs` | `--text-xs` | `0.75rem` | 12px | Captions, timestamps, fine print |
| `text-sm` | `--text-sm` | `0.875rem` | 14px | UI labels, table data, secondary info |
| `text-base` | `--text-base` | `1rem` | 16px | Body text (default) |
| `text-md` | `--text-md` | `1.125rem` | 18px | Lead text, intro paragraphs |
| `text-lg` | `--text-lg` | `1.25rem` | 20px | Subsection headings (h4, h5) |
| `text-xl` | `--text-xl` | `1.5rem` | 24px | Section subheadings (h3) |
| `text-2xl` | `--text-2xl` | `1.875rem` | 30px | Section headings (h2) |
| `text-3xl` | `--text-3xl` | `2.25rem` | 36px | Page headings (h1) |
| `text-4xl` | `--text-4xl` | `3rem` | 48px | Hero headings, marketing displays |
| `text-5xl` | `--text-5xl` | `3.75rem` | 60px | Large hero / display text |

---

## 6. Font Weight Reference

| Weight Name | Numeric Value | CSS Class | Usage |
|---|---|---|---|
| Regular | 400 | `font-normal` | Default body text, captions |
| Medium | 500 | `font-medium` | Emphasized labels, nav items |
| SemiBold | 600 | `font-semibold` | Subheadings, badge labels, stat values |
| Bold | 700 | `font-bold` | Section headings, hero text |

---

## 7. Line Height Reference

| Token | Value | Usage |
|---|---|---|
| `leading-tight` | 1.25 | Large display headings (4xl, 5xl) |
| `leading-snug` | 1.375 | Section headings (2xl, 3xl) |
| `leading-normal` | 1.5 | Subheadings (lg, xl) |
| `leading-relaxed` | 1.6 | Body text (base, md) |
| `leading-loose` | 1.8 | Long-form prose, documentation |

---

## 8. Letter Spacing Reference

| Token | Value | Usage |
|---|---|---|
| `tracking-tighter` | `-0.05em` | Large display headings only |
| `tracking-tight` | `-0.025em` | Section headings |
| `tracking-normal` | `0em` | Body text |
| `tracking-wide` | `0.05em` | Eyebrow labels, ALL CAPS tags |
| `tracking-widest` | `0.1em` | ALL CAPS section labels |

---

## 9. Component Typography Patterns

### Heading Hierarchy

```tsx
// H1 — Page Title (one per page)
<h1 className="font-heading text-4xl font-bold leading-tight tracking-tight text-text-primary">
  Security Audit Report
</h1>

// H2 — Section Heading
<h2 className="font-heading text-3xl font-semibold leading-snug text-text-primary">
  Vulnerability Overview
</h2>

// H3 — Subsection Heading
<h3 className="font-heading text-2xl font-semibold leading-normal text-text-primary">
  Header Security Analysis
</h3>

// H4 — Card or Panel Title
<h4 className="font-body text-lg font-semibold leading-normal text-text-primary">
  Content-Security-Policy
</h4>
```

### Body Text

```tsx
// Lead paragraph (intro text)
<p className="font-body text-md leading-relaxed text-text-secondary">
  This report details findings from the automated security scan.
</p>

// Standard body paragraph
<p className="font-body text-base leading-relaxed text-text-primary">
  The following vulnerabilities were detected during the scan.
</p>

// Caption / label
<span className="font-body text-xs leading-normal text-text-tertiary">
  Last scanned 2 hours ago
</span>
```

### Eyebrow Label

An eyebrow label appears above a section heading to provide category context:

```tsx
<span className="font-body text-xs font-semibold tracking-widest uppercase text-accent">
  Security Findings
</span>
```

### Monospace / Code

```tsx
// Inline code
<code className="font-mono text-sm bg-bg-subtle px-1.5 py-0.5 rounded text-text-primary">
  X-Content-Type-Options
</code>

// Code block
<pre className="font-mono text-sm leading-relaxed bg-bg-subtle p-4 rounded-md overflow-x-auto">
  <code>{scanOutput}</code>
</pre>
```

---

## 10. Tailwind Typography Configuration

Extend `tailwind.config.ts` to register the font families:

```ts
// tailwind.config.ts
theme: {
  extend: {
    fontFamily: {
      heading: ['Cormorant Garamond', 'Georgia', 'serif'],
      body:    ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
    },
  },
}
```

This enables Tailwind classes like `font-heading`, `font-body`, and `font-mono`.

---

## 11. Usage Rules

### DO ✅

- Use `font-heading` (Cormorant Garamond) for all H1–H3 headings.
- Use `font-body` (Inter) for all UI text, labels, navigation, and data.
- Use `font-mono` (JetBrains Mono) for all code, hashes, tokens, and scan output.
- Set `letter-spacing: tracking-widest` on ALL CAPS eyebrow labels.
- Use `leading-relaxed` (1.6) as the default for body paragraphs.

### DON'T ❌

- Do not mix heading font into body text — it breaks legibility at small sizes.
- Do not use font weights heavier than 700 (no `font-black`).
- Do not use `text-base` for headings — always use the appropriate scale step.
- Do not set `line-height` below 1.25 for any text larger than `text-3xl`.
- Do not use `tracking-tighter` on body-size text — reserve it for display headings only.
