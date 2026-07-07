# CipherLens Accessibility Guidelines

> **Version:** 1.0.0  
> **Last Updated:** 2026-07-05  
> **Status:** Active  
> **Standard:** WCAG 2.1 Level AA

---

## 1. Philosophy

CipherLens is a professional tool used by security engineers across diverse environments, including teams that rely on assistive technologies. Accessibility is a **first-class feature**, not an afterthought.

We target **WCAG 2.1 Level AA** compliance across all pages and components.

> [!IMPORTANT]
> Accessibility failures are treated as **critical bugs** and must be resolved before a feature can be marked as done.

---

## 2. Color Contrast Requirements

### WCAG AA Minimums

| Text Type | Minimum Contrast Ratio |
|---|---|
| Normal text (< 18pt / < 14pt bold) | **4.5:1** |
| Large text (≥ 18pt / ≥ 14pt bold) | **3.0:1** |
| UI components and graphical objects | **3.0:1** |
| Placeholder text | **4.5:1** (treat same as normal text) |
| Disabled elements | Not required (but should be visually distinct) |

### CipherLens Approved Color Pairs

| Foreground | Background | Ratio | Context |
|---|---|---|---|
| `#1A1A1A` on `#FAFAF7` | Primary text / page bg | 17.5:1 ✅ | Body text |
| `#1A1A1A` on `#FFFFFF` | Primary text / card bg | 19.1:1 ✅ | Card text |
| `#6B6B6B` on `#FFFFFF` | Secondary text / card bg | 5.9:1 ✅ | Captions |
| `#6B6B6B` on `#FAFAF7` | Secondary text / page bg | 5.7:1 ✅ | Subtitles |
| `#9B2335` on `#FDDEDE` | Danger text / danger bg | 5.2:1 ✅ | Error states |
| `#52796F` on `#D8EDE9` | Success text / success bg | 4.6:1 ✅ | Pass states |
| `#2B6CB0` on `#DBEAFE` | Info text / info bg | 4.8:1 ✅ | Info states |
| `#C4933F` on `#FFFFFF` | Accent / white | 3.1:1 ⚠️ | Large text only |

> [!WARNING]
> `#C4933F` (Warm Gold) at 3.1:1 contrast **only passes for large text** (18pt+ or 14pt bold). Never use it for small body copy. Use `#A67C32` (Deep Gold, 4.1:1) for smaller accent text needs.

---

## 3. Keyboard Navigation

### Focus Order

All interactive elements must be reachable and operable via keyboard in a **logical, predictable order** that follows the visual document flow.

- Tab order must follow the reading order (left-to-right, top-to-bottom in LTR layouts).
- Use `tabindex="0"` only to make non-interactive elements focusable when semantically necessary.
- Never use positive `tabindex` values — they break natural tab order.

### Keyboard Interaction Patterns

| Element | Expected Keyboard Behavior |
|---|---|
| Button | `Enter` or `Space` to activate |
| Link | `Enter` to navigate |
| Checkbox | `Space` to toggle |
| Radio group | `Arrow keys` to navigate options, `Space` to select |
| Select | `Enter` to open, `Arrow keys` to navigate, `Enter`/`Space` to select, `Escape` to close |
| Modal dialog | `Escape` to close; focus trapped inside while open |
| Dropdown menu | `Enter`/`Space` to open, `Arrow keys` to navigate, `Enter` to select, `Escape` to close |
| Tab panel | `Arrow keys` to switch tabs |
| Accordion | `Enter`/`Space` to expand/collapse |

### Focus Trap in Modals

Dialogs must implement focus trapping:

```tsx
// Use Radix UI's Dialog or a custom focus trap hook
import { Dialog, DialogContent } from '@/components/ui/Dialog';

// ✅ Radix Dialog handles focus trap automatically
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    {/* Focus is trapped here while open */}
    <DialogTitle>Confirm Scan</DialogTitle>
    <p>Are you sure you want to start a new security scan?</p>
    <Button onClick={handleConfirm}>Confirm</Button>
    <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
  </DialogContent>
</Dialog>
```

---

## 4. Focus States

Every interactive element must have a **clearly visible focus indicator** that meets the 3:1 contrast ratio requirement against adjacent colors.

### Standard Focus Ring

```css
/* Applied globally in frontend/src/index.css */
:focus-visible {
  outline: 2px solid var(--color-accent-primary);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(196, 147, 63, 0.20);
}

/* Remove default focus for mouse/touch users */
:focus:not(:focus-visible) {
  outline: none;
  box-shadow: none;
}
```

### Tailwind Focus Classes

Use Tailwind's `focus-visible:` variant:

```tsx
<button
  className="
    px-4 py-2 rounded-lg bg-accent text-white
    focus-visible:outline-none
    focus-visible:ring-2
    focus-visible:ring-accent
    focus-visible:ring-offset-2
    focus-visible:ring-offset-bg-primary
  "
>
  Start Scan
</button>
```

> [!NOTE]
> Never use `outline: none` without a replacement focus indicator. Removing the focus ring without replacement is a WCAG 2.4.7 violation.

---

## 5. ARIA Labeling Rules

### General Principles

- Use native semantic HTML elements before reaching for ARIA. A `<button>` requires no ARIA; a `<div onClick>` requires `role="button"` and keyboard handling.
- An ARIA role is not a substitute for correct semantic HTML.
- Every ARIA attribute must be accurate — incorrect ARIA is worse than no ARIA.

### Required ARIA Attributes by Context

#### Icon Buttons (no visible text)

```tsx
// ✅ Correct — descriptive aria-label
<button aria-label="Close modal">
  <XIcon className="w-5 h-5" aria-hidden="true" />
</button>

// ❌ Incorrect — no label for screen readers
<button>
  <XIcon className="w-5 h-5" />
</button>
```

#### Images

```tsx
// Informative image — descriptive alt text
<img src="/scan-diagram.png" alt="Diagram showing the CipherLens scan pipeline stages" />

// Decorative image — empty alt to skip
<img src="/decorative-wave.svg" alt="" role="presentation" />
```

#### Form Fields

```tsx
// ✅ Every input must have a label
<div className="flex flex-col gap-1">
  <label htmlFor="target-url" className="text-sm font-medium text-text-secondary">
    Target URL
  </label>
  <input
    id="target-url"
    type="url"
    aria-describedby="target-url-hint"
    aria-required="true"
    placeholder="https://example.com"
  />
  <p id="target-url-hint" className="text-xs text-text-tertiary">
    Enter the full URL including https://
  </p>
</div>
```

#### Status / Live Regions

Use `aria-live` for dynamically updated content (scan progress, error messages):

```tsx
// Status that users need to hear immediately
<div role="status" aria-live="polite" aria-atomic="true">
  {scanProgress && <p>Scan is {scanProgress}% complete</p>}
</div>

// Critical error — announce immediately
<div role="alert" aria-live="assertive">
  {error && <p>{error.message}</p>}
</div>
```

#### Data Tables

```tsx
<table aria-label="Security scan findings">
  <caption className="sr-only">
    List of security findings sorted by severity
  </caption>
  <thead>
    <tr>
      <th scope="col">Severity</th>
      <th scope="col">Finding</th>
      <th scope="col">Location</th>
      <th scope="col">Actions</th>
    </tr>
  </thead>
  <tbody>
    {findings.map((finding) => (
      <tr key={finding.id}>
        <td>{finding.severity}</td>
        <td>{finding.title}</td>
        <td>{finding.location}</td>
        <td>
          <button aria-label={`View details for ${finding.title}`}>
            View
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

#### Progress Indicators

```tsx
<div
  role="progressbar"
  aria-valuenow={progress}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="Scan progress"
>
  <div
    className="h-2 rounded-full bg-accent transition-all"
    style={{ width: `${progress}%` }}
  />
</div>
```

---

## 6. Screen Reader–Only Utility

Use the `sr-only` class (provided by Tailwind) to add context for screen readers without affecting the visual layout:

```tsx
// Add context to icon-only stat cards
<StatCard value="247" label="Scans">
  <span className="sr-only">Total security scans performed</span>
</StatCard>

// Provide skip-to-content link
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4
             focus:z-50 focus:px-4 focus:py-2 focus:bg-accent focus:text-white focus:rounded"
>
  Skip to main content
</a>
```

---

## 7. Skip Navigation

Every page must include a **skip to main content** link as the first focusable element:

```tsx
// In Navbar.tsx or root layout
<>
  <a
    href="#main-content"
    className="
      sr-only focus-visible:not-sr-only
      focus-visible:fixed focus-visible:top-4 focus-visible:left-4
      focus-visible:z-[100] focus-visible:px-4 focus-visible:py-2
      focus-visible:bg-accent focus-visible:text-text-inverse
      focus-visible:rounded-lg focus-visible:font-medium
      focus-visible:shadow-lg
    "
  >
    Skip to main content
  </a>
  <Navbar />
  <main id="main-content" tabIndex={-1}>
    {children}
  </main>
</>
```

---

## 8. Reduced Motion

Respect the user's operating system preference to reduce animations:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

In Framer Motion, use the `useReducedMotion` hook:

```tsx
import { useReducedMotion } from 'framer-motion';

function AnimatedCard({ children }: { children: React.ReactNode }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
    >
      {children}
    </motion.div>
  );
}
```

---

## 9. Semantic HTML Reference

Prefer these elements over generic `div`/`span`:

| Use Case | Correct Element | Not |
|---|---|---|
| Main page content area | `<main>` | `<div id="main">` |
| Page navigation | `<nav aria-label="Main navigation">` | `<div class="nav">` |
| Page header | `<header>` | `<div class="header">` |
| Page footer | `<footer>` | `<div class="footer">` |
| Content sections | `<section aria-labelledby="section-heading">` | `<div class="section">` |
| Complementary content | `<aside aria-label="Related findings">` | `<div class="sidebar">` |
| Interactive control | `<button>` | `<div onClick>` |
| Navigation item | `<a href>` | `<div onClick>` for links |
| Data list | `<ul>` / `<ol>` | `<div>` of `<div>`s |

---

## 10. Accessibility Testing Checklist

Before marking any feature complete:

- [ ] **Keyboard-only navigation** — Tab through all interactive elements; confirm logical order and visibility.
- [ ] **Screen reader test** — Use NVDA (Windows) or VoiceOver (macOS) to verify all content is announced correctly.
- [ ] **Contrast check** — Run browser DevTools accessibility inspector or axe extension.
- [ ] **Focus visible** — Confirm focus rings are visible on all focusable elements.
- [ ] **ARIA valid** — Run `axe-core` automated scan and resolve all violations.
- [ ] **Reduced motion** — Enable OS-level reduced motion and verify animations are suppressed.
- [ ] **Touch targets** — All tap targets are at minimum 44×44px.
- [ ] **Error messages** — Form errors are associated with fields via `aria-describedby`.
- [ ] **Skip link** — Tab from address bar: skip-to-content link appears on first focus.

> [!TIP]
> Install the [axe DevTools browser extension](https://www.deque.com/axe/devtools/) for automated WCAG scanning during development. It catches approximately 57% of accessibility issues automatically.
