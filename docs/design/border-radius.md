# CipherLens Border Radius System

> **Version:** 1.0.0  
> **Last Updated:** 2026-07-05  
> **Status:** Active

---

## 1. Philosophy

CipherLens uses **purposeful corner rounding** to communicate hierarchy and interaction affordance. Smaller radii convey precision and data density (appropriate for a security tool), while larger radii convey friendliness and call-to-action emphasis.

> [!NOTE]
> Avoid excessive rounding (pill shapes) on data containers. Reserve them only for tags, badges, and toggles.

---

## 2. Border Radius Scale

| Token | CSS Variable | px | Tailwind | Usage |
|---|---|---|---|---|
| `radius-sm` | `--radius-sm` | 4px | `rounded` | Small UI elements: badges, code chips, table cells |
| `radius-md` | `--radius-md` | 8px | `rounded-lg` | Default component radius: cards, inputs, dropdowns |
| `radius-lg` | `--radius-lg` | 12px | `rounded-xl` | Feature cards, modals, notification panels |
| `radius-xl` | `--radius-xl` | 16px | `rounded-2xl` | Large panels, stat cards, hero blocks |
| `radius-2xl` | `--radius-2xl` | 24px | `rounded-3xl` | Decorative containers, highlighted quote blocks |
| `radius-full` | `--radius-full` | 9999px | `rounded-full` | Avatar circles, pill badges, toggle switches, icon buttons |

---

## 3. CSS Custom Properties

```css
:root {
  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-xl:   16px;
  --radius-2xl:  24px;
  --radius-full: 9999px;
}
```

---

## 4. Tailwind Configuration

Map tokens to Tailwind's `borderRadius` theme in `tailwind.config.ts`:

```ts
// tailwind.config.ts
theme: {
  extend: {
    borderRadius: {
      sm:   'var(--radius-sm)',    // 4px
      md:   'var(--radius-md)',    // 8px  — also maps to 'rounded-lg' default
      lg:   'var(--radius-lg)',    // 12px
      xl:   'var(--radius-xl)',    // 16px
      '2xl': 'var(--radius-2xl)', // 24px
      full: 'var(--radius-full)',  // 9999px
    },
  },
}
```

---

## 5. Component Radius Reference

### UI Primitives

| Component | Radius Token | px | Tailwind Class |
|---|---|---|---|
| Badge / Tag | `radius-full` | 9999px | `rounded-full` |
| Code chip (inline) | `radius-sm` | 4px | `rounded` |
| Button (default) | `radius-md` | 8px | `rounded-lg` |
| Button (icon-only) | `radius-full` | 9999px | `rounded-full` |
| Input / Select | `radius-md` | 8px | `rounded-lg` |
| Textarea | `radius-md` | 8px | `rounded-lg` |
| Tooltip | `radius-sm` | 4px | `rounded` |
| Toggle switch | `radius-full` | 9999px | `rounded-full` |
| Avatar | `radius-full` | 9999px | `rounded-full` |
| Progress bar track | `radius-full` | 9999px | `rounded-full` |

### Layout & Container

| Component | Radius Token | px | Tailwind Class |
|---|---|---|---|
| Card (default) | `radius-lg` | 12px | `rounded-xl` |
| Card (compact) | `radius-md` | 8px | `rounded-lg` |
| Feature card | `radius-lg` | 12px | `rounded-xl` |
| Stat card | `radius-xl` | 16px | `rounded-2xl` |
| Modal dialog | `radius-xl` | 16px | `rounded-2xl` |
| Dropdown menu | `radius-md` | 8px | `rounded-lg` |
| Toast notification | `radius-lg` | 12px | `rounded-xl` |
| Code block (pre) | `radius-md` | 8px | `rounded-lg` |
| Alert / Banner | `radius-md` | 8px | `rounded-lg` |
| Table | 0 | 0px | `rounded-none` |
| Table (with border) | `radius-lg` | 12px | `rounded-xl` (wrapper only) |

---

## 6. Practical Examples

### Default Card

```tsx
<div className="bg-bg-card border border-border rounded-xl p-6 shadow-sm">
  {/* rounded-xl = radius-lg = 12px */}
</div>
```

### Badge — Severity Levels

```tsx
// Critical severity badge
<span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-danger/10 text-danger">
  Critical
</span>

// Pass badge
<span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-success/10 text-success">
  Pass
</span>
```

### Stat Card

```tsx
<div className="bg-bg-card border border-border rounded-2xl p-8 shadow-sm">
  {/* rounded-2xl = radius-xl = 16px */}
  <p className="text-4xl font-heading font-bold text-text-primary">247</p>
  <p className="text-sm text-text-secondary mt-1">Total Scans Run</p>
</div>
```

### Modal Dialog

```tsx
<div className="bg-bg-card rounded-2xl shadow-lg p-8 max-w-lg w-full">
  {/* rounded-2xl = radius-xl = 16px */}
</div>
```

### Icon Button

```tsx
// Icon-only buttons use full rounding for a circular appearance
<button
  className="rounded-full p-2 w-9 h-9 flex items-center justify-center
             bg-bg-subtle hover:bg-border-subtle transition-colors"
  aria-label="Close panel"
>
  <XIcon className="w-4 h-4" />
</button>
```

### Nested Radius Rule

When a rounded container holds rounded children, the inner element's radius must be smaller than the outer:

```tsx
// CORRECT — inner radius smaller than outer
<div className="rounded-xl p-4 bg-bg-card">           {/* outer: 12px */}
  <div className="rounded-lg bg-bg-subtle p-3">       {/* inner: 8px */}
    <code className="rounded text-sm">...</code>      {/* innermost: 4px */}
  </div>
</div>

// INCORRECT — inner radius same as outer (corners visually "leak" out)
<div className="rounded-xl p-4 bg-bg-card">
  <div className="rounded-xl bg-bg-subtle p-3">       {/* ❌ same radius */}
  </div>
</div>
```

---

## 7. Usage Rules

### DO ✅

- Use `rounded-xl` (12px) as the **default radius for cards**.
- Use `rounded-full` for all pill-shaped elements (badges, avatars, icon buttons, toggles).
- Reduce radius on inner/nested components to maintain proper visual nesting.
- Use `rounded-none` on table cells — tables communicate structured data, not containers.
- Apply the same radius to all four corners unless implementing a specific tab/panel pattern.

### DON'T ❌

- Do not use `rounded-3xl` (24px) on standard cards — reserve this for decorative, non-data containers.
- Do not apply `rounded-full` to rectangular cards or panels — this looks unrefined.
- Do not mix radius values arbitrarily — always use a named token.
- Do not apply per-side radius (e.g., `rounded-tl-xl rounded-br-xl`) unless building a specific geometric design element.
